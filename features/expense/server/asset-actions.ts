// features/expense/server/asset-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./actions";

const assetTypeEnum = z.enum([
  "cash",
  "bank",
  "debit_card",
  "credit_card",
  "savings_investment",
]);

const colorRegex = /^#[0-9A-Fa-f]{6}$/;

const createAssetSchema = z.object({
  name: z.string().min(1).max(30),
  type: assetTypeEnum,
  balance: z.number().int().optional().default(0),
  linked_asset_id: z.string().uuid().nullable().optional(),
  payment_day: z.number().int().min(1).max(31).nullable().optional(),
  color: z.string().regex(colorRegex).optional(),
  sort_order: z.number().int().optional(),
});

const updateAssetSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  linked_asset_id: z.string().uuid().nullable().optional(),
  payment_day: z.number().int().min(1).max(31).nullable().optional(),
  color: z.string().regex(colorRegex).optional(),
  sort_order: z.number().int().optional(),
  is_archived: z.boolean().optional(),
});

const settleSchema = z.object({
  credit_card_asset_id: z.string().uuid(),
  from_bank_asset_id: z.string().uuid(),
  amount: z.number().int().min(1),
});

async function getUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

function revalidate() {
  revalidatePath("/expense");
  revalidatePath("/calendar");
}

// === CRUD ===

export async function createAsset(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createAssetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  // 체크카드는 linked_asset_id 필수
  if (parsed.data.type === "debit_card" && !parsed.data.linked_asset_id) {
    return { ok: false, error: "체크카드는 연결 은행이 필요합니다" };
  }
  // 신용카드는 payment_day 필수
  if (parsed.data.type === "credit_card" && parsed.data.payment_day == null) {
    return { ok: false, error: "신용카드는 결제일이 필요합니다" };
  }

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: { id: data.id } };
}

export async function updateAsset(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateAssetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("assets")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: undefined };
}

export async function archiveAsset(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("assets")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: undefined };
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  // ON DELETE SET NULL 이므로 expenses/incomes 의 asset_id 는 자동 NULL
  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: undefined };
}

/** 자산 잔액을 newBalance 로 덮어쓰기 (실제 통장과 sync 보정). */
export async function adjustAssetBalance(
  id: string,
  newBalance: number,
): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("assets")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: undefined };
}

// === 신용카드 정산 ===

/**
 * 신용카드 누적액을 결제일에 연결 은행에서 차감.
 * 1) from_bank.balance -= amount
 * 2) credit_card.balance -= amount (전액이면 0)
 * 3) expenses 에 "{card} N월 정산" 한 줄 자동 생성 (가계부 흐름 추적용)
 *
 * 단, expenses 의 asset_id 는 from_bank 으로 두지만 applyAssetDelta 는 호출 안 함
 * (이미 위에서 직접 차감했으므로 이중 차감 방지).
 */
export async function settleCreditCard(input: unknown): Promise<ActionResult> {
  const parsed = settleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();

  // 두 자산 가져오기
  const { data: assets, error: fetchErr } = await supabase
    .from("assets")
    .select("id, name, type, balance")
    .in("id", [parsed.data.credit_card_asset_id, parsed.data.from_bank_asset_id]);
  if (fetchErr) return { ok: false, error: fetchErr.message };

  const card = assets?.find((a) => a.id === parsed.data.credit_card_asset_id);
  const bank = assets?.find((a) => a.id === parsed.data.from_bank_asset_id);
  if (!card || !bank) return { ok: false, error: "자산을 찾을 수 없습니다" };
  if (card.type !== "credit_card") return { ok: false, error: "신용카드 자산이 아닙니다" };
  if (bank.type !== "bank" && bank.type !== "cash") {
    return { ok: false, error: "결제 출처는 은행/현금만 가능합니다" };
  }
  if (parsed.data.amount > card.balance) {
    return { ok: false, error: "정산 금액이 누적액보다 큽니다" };
  }

  const now = new Date();
  const month = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  const memo = `${card.name} ${month} 정산`;

  // 1) 은행 차감
  const { error: bankErr } = await supabase
    .from("assets")
    .update({
      balance: bank.balance - parsed.data.amount,
      updated_at: now.toISOString(),
    })
    .eq("id", bank.id);
  if (bankErr) return { ok: false, error: bankErr.message };

  // 2) 신용카드 누적 -= amount
  const { error: cardErr } = await supabase
    .from("assets")
    .update({
      balance: card.balance - parsed.data.amount,
      updated_at: now.toISOString(),
    })
    .eq("id", card.id);
  if (cardErr) return { ok: false, error: cardErr.message };

  // 3) expenses 흔적 (asset_id = 은행, category = "카드결제")
  //    applyAssetDelta 는 호출 안 함 — 이미 위에서 직접 차감했음
  const { error: expErr } = await supabase.from("expenses").insert({
    user_id: userId,
    amount: parsed.data.amount,
    category: "카드결제",
    paid_at: now.toISOString(),
    memo,
    asset_id: bank.id,
  });
  if (expErr) return { ok: false, error: expErr.message };

  revalidate();
  return { ok: true, data: undefined };
}

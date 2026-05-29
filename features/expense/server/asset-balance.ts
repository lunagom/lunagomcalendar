// features/expense/server/asset-balance.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * 자산 잔액에 delta 적용 — 자산 타입별 규칙 따름.
 *
 * @param assetId 자산 ID. null/undefined 면 no-op.
 * @param amount 거래 금액 (양수).
 * @param kind "expense" | "income".
 *
 * 규칙:
 * - cash / bank / savings_investment: expense=-amount, income=+amount
 * - debit_card: expense → linked_asset_id 의 balance -=amount (체크카드 본인 변동 X)
 * - credit_card: expense → 본인 balance += amount (누적), income 은 호출자가 차단
 */
export async function applyAssetDelta(
  assetId: string | null | undefined,
  amount: number,
  kind: "expense" | "income",
): Promise<void> {
  if (!assetId || amount === 0) return;
  const supabase = createClient();

  const { data: asset, error: fetchErr } = await supabase
    .from("assets")
    .select("id, type, balance, linked_asset_id")
    .eq("id", assetId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!asset) return; // 자산이 삭제된 경우 silent skip

  const type = asset.type;

  // 체크카드 + 지출 → 연결 은행에서 차감
  if (kind === "expense" && type === "debit_card") {
    if (!asset.linked_asset_id) return; // 연결 안 됨 → 잔액 변동 없음
    const { data: linked, error: linkedErr } = await supabase
      .from("assets")
      .select("id, balance")
      .eq("id", asset.linked_asset_id)
      .maybeSingle();
    if (linkedErr) throw linkedErr;
    if (!linked) return;
    const newBalance = linked.balance - amount;
    const { error: upErr } = await supabase
      .from("assets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", linked.id);
    if (upErr) throw upErr;
    return;
  }

  // 신용카드 + 지출 → 본인 누적 (+= amount)
  if (kind === "expense" && type === "credit_card") {
    const newBalance = asset.balance + amount;
    const { error: upErr } = await supabase
      .from("assets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", asset.id);
    if (upErr) throw upErr;
    return;
  }

  // 신용카드 + 수입 → no-op (호출자에서 막아야 함, 안전 망)
  if (kind === "income" && (type === "credit_card" || type === "debit_card")) {
    return;
  }

  // cash / bank / savings_investment
  const delta = kind === "expense" ? -amount : amount;
  const newBalance = asset.balance + delta;
  const { error: upErr } = await supabase
    .from("assets")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", asset.id);
  if (upErr) throw upErr;
}

/**
 * applyAssetDelta 의 역동작 — 거래 수정/삭제 시 기존 영향 원복.
 *
 * 단순히 applyAssetDelta(..., kind 반대) 로 처리. expense 였으면 income 으로 원복.
 */
export async function reverseAssetDelta(
  assetId: string | null | undefined,
  amount: number,
  kind: "expense" | "income",
): Promise<void> {
  if (!assetId || amount === 0) return;
  // expense 원복 = income 인 척, income 원복 = expense 인 척
  // 단 신용카드 expense 원복은 누적을 빼야 하므로 별도 처리
  const supabase = createClient();
  const { data: asset, error } = await supabase
    .from("assets")
    .select("id, type, balance, linked_asset_id")
    .eq("id", assetId)
    .maybeSingle();
  if (error) throw error;
  if (!asset) return;

  const type = asset.type;

  // 체크카드 + 지출 원복 → 연결 은행에 +=amount
  if (kind === "expense" && type === "debit_card") {
    if (!asset.linked_asset_id) return;
    const { data: linked, error: linkedErr } = await supabase
      .from("assets")
      .select("id, balance")
      .eq("id", asset.linked_asset_id)
      .maybeSingle();
    if (linkedErr) throw linkedErr;
    if (!linked) return;
    const { error: upErr } = await supabase
      .from("assets")
      .update({ balance: linked.balance + amount, updated_at: new Date().toISOString() })
      .eq("id", linked.id);
    if (upErr) throw upErr;
    return;
  }

  // 신용카드 + 지출 원복 → 본인 -=amount
  if (kind === "expense" && type === "credit_card") {
    const newBalance = Math.max(0, asset.balance - amount);
    const { error: upErr } = await supabase
      .from("assets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", asset.id);
    if (upErr) throw upErr;
    return;
  }

  // 신용/체크카드 + 수입 → no-op
  if (kind === "income" && (type === "credit_card" || type === "debit_card")) {
    return;
  }

  // cash / bank / savings_investment 원복
  const delta = kind === "expense" ? amount : -amount;
  const { error: upErr } = await supabase
    .from("assets")
    .update({ balance: asset.balance + delta, updated_at: new Date().toISOString() })
    .eq("id", asset.id);
  if (upErr) throw upErr;
}

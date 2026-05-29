// features/expense/server/asset-queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { AssetType } from "../lib/asset-types";
import { ASSET_TYPE_SIGN } from "../lib/asset-types";
import type { ExpenseRow, IncomeRow } from "./queries";

export type AssetRow = Database["public"]["Tables"]["assets"]["Row"];

/** 활성 자산 전체. sort_order 오름차순. */
export async function getActiveAssets(): Promise<AssetRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("is_archived", false)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** 단일 자산 (보관 포함). */
export async function getAssetById(id: string): Promise<AssetRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** type 별 그룹핑된 활성 자산. */
export async function getAssetsGrouped(): Promise<Record<AssetType, AssetRow[]>> {
  const assets = await getActiveAssets();
  const grouped: Record<AssetType, AssetRow[]> = {
    cash: [],
    bank: [],
    debit_card: [],
    credit_card: [],
    savings_investment: [],
  };
  for (const a of assets) {
    grouped[a.type as AssetType].push(a);
  }
  return grouped;
}

/** 총 자산 = 모든 active 자산 balance 합 (credit_card 는 차감). */
export async function getTotalNetWorth(): Promise<number> {
  const assets = await getActiveAssets();
  let total = 0;
  for (const a of assets) {
    const sign = ASSET_TYPE_SIGN[a.type as AssetType];
    total += sign * a.balance;
  }
  return total;
}

export type AssetTransaction =
  | (ExpenseRow & { kind: "expense" })
  | (IncomeRow & { kind: "income" });

/** 자산별 거래 (expense + income 합쳐 시간 역순). */
export async function getTransactionsForAsset(
  assetId: string,
  limit = 50,
): Promise<AssetTransaction[]> {
  const supabase = createClient();
  const [expRes, incRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("asset_id", assetId)
      .order("paid_at", { ascending: false })
      .limit(limit),
    supabase
      .from("incomes")
      .select("*")
      .eq("asset_id", assetId)
      .order("received_at", { ascending: false })
      .limit(limit),
  ]);
  if (expRes.error) throw expRes.error;
  if (incRes.error) throw incRes.error;

  const items: AssetTransaction[] = [
    ...(expRes.data ?? []).map((e) => ({ ...e, kind: "expense" as const })),
    ...(incRes.data ?? []).map((i) => ({ ...i, kind: "income" as const })),
  ];

  items.sort((a, b) => {
    const aDate = a.kind === "expense" ? a.paid_at : a.received_at;
    const bDate = b.kind === "expense" ? b.paid_at : b.received_at;
    return bDate.localeCompare(aDate);
  });

  return items.slice(0, limit);
}

/** 결제일 도래한 신용카드 (balance > 0 AND today.day >= payment_day). */
export async function getCreditCardsAwaitingSettlement(): Promise<AssetRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("type", "credit_card")
    .eq("is_archived", false)
    .gt("balance", 0);
  if (error) throw error;
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return (data ?? []).filter((a) => {
    if (a.payment_day == null) return false;
    const effectivePaymentDay = Math.min(a.payment_day, lastDay);
    return today.getDate() >= effectivePaymentDay;
  });
}

/** 최근 60일 distinct memo (지출 + 수입). 자동완성 datalist 용. */
export async function getRecentMemos(): Promise<string[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceIso = since.toISOString();

  const [exp, inc] = await Promise.all([
    supabase
      .from("expenses")
      .select("memo")
      .gte("paid_at", sinceIso)
      .not("memo", "is", null),
    supabase
      .from("incomes")
      .select("memo")
      .gte("received_at", sinceIso)
      .not("memo", "is", null),
  ]);
  if (exp.error) throw exp.error;
  if (inc.error) throw inc.error;

  const set = new Set<string>();
  exp.data?.forEach((r) => r.memo && set.add(r.memo));
  inc.data?.forEach((r) => r.memo && set.add(r.memo));
  return Array.from(set).sort();
}

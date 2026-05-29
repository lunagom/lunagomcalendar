import "server-only";
import { createClient } from "@/lib/supabase/server";

/** 사용자의 카드 이름 리스트. profiles.card_names jsonb. */
export async function getCardNames(): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("card_names")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  const raw = data?.card_names;
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  return [];
}

/**
 * 카드별 이번 달 "카드결제" 카테고리 거래 합계.
 * memo 가 정확히 카드명일 때만 매칭.
 */
export async function getCardPaymentTotalsForMonth(
  month: string,
  cardNames: string[],
): Promise<Record<string, number>> {
  if (cardNames.length === 0) return {};
  const supabase = createClient();
  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const m = Number(mStr) - 1;
  const start = new Date(year, m, 1).toISOString();
  const end = new Date(year, m + 1, 1).toISOString();

  const { data, error } = await supabase
    .from("expenses")
    .select("amount, memo")
    .eq("category", "카드결제")
    .in("memo", cardNames)
    .gte("paid_at", start)
    .lt("paid_at", end);
  if (error) throw error;

  const totals: Record<string, number> = {};
  for (const c of cardNames) totals[c] = 0;
  for (const row of data ?? []) {
    if (row.memo && totals[row.memo] !== undefined) {
      totals[row.memo] += row.amount;
    }
  }
  return totals;
}

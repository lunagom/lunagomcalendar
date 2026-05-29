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
 * 카드별 이번 달 결제 합계.
 * expenses.payment_card 가 카드명과 정확히 일치하는 거래의 amount 합.
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
    .select("amount, payment_card")
    .in("payment_card", cardNames)
    .gte("paid_at", start)
    .lt("paid_at", end);
  if (error) throw error;

  const totals: Record<string, number> = {};
  for (const c of cardNames) totals[c] = 0;
  for (const row of data ?? []) {
    if (row.payment_card && totals[row.payment_card] !== undefined) {
      totals[row.payment_card] += row.amount;
    }
  }
  return totals;
}

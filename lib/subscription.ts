// lib/subscription.ts

/** 특정 year/month (0-indexed) 의 마지막 날짜. */
export function monthEndDay(year: number, monthZeroIndexed: number): number {
  // 다음 달의 0번째 날 = 이번 달의 마지막 날
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

/**
 * 오늘부터 다음 결제일까지의 일수.
 *
 * - billingDay 가 그 달 말일을 넘으면 말일로 캡 (예: 31일 결제, 2월엔 28/29일).
 * - 오늘이 결제일이면 0.
 * - 오늘이 결제일을 지났으면 다음 달 기준.
 *
 * today 인자는 테스트 결정성을 위해 주입 가능. 기본은 현재 시각.
 */
export function daysUntilNextBilling(
  billingDay: number,
  today: Date = new Date(),
): number {
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDay = today.getDate();

  const thisMonthBilling = Math.min(billingDay, monthEndDay(year, month));

  let nextBilling: Date;
  if (todayDay <= thisMonthBilling) {
    nextBilling = new Date(year, month, thisMonthBilling);
  } else {
    // 다음 달 (12월이면 다음 해 1월)
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const nextMonthBilling = Math.min(
      billingDay,
      monthEndDay(nextYear, nextMonthIdx),
    );
    nextBilling = new Date(nextYear, nextMonthIdx, nextMonthBilling);
  }

  const todayMidnight = new Date(year, month, todayDay);
  const diffMs = nextBilling.getTime() - todayMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export type BillingUrgency = "today" | "soon" | "upcoming" | "later";

/** 결제일까지 남은 일수에 따른 강조 단계. */
export function billingUrgency(days: number): BillingUrgency {
  if (days === 0) return "today";
  if (days <= 3) return "soon";
  if (days <= 7) return "upcoming";
  return "later";
}

/**
 * 'YYYY-MM' 의 그 달 마지막 날짜를 'YYYY-MM-DD' 문자열로.
 */
function monthLastDayIso(month: string): string {
  const [yStr, mStr] = month.split("-");
  const d = new Date(Number(yStr), Number(mStr), 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 구독이 특정 월 ('YYYY-MM') 에 활성인지 판정.
 * - is_active = false 면 항상 비활성
 * - start_date 가 그 달 말일 이후면 아직 시작 안 함 → 비활성
 * - end_date 가 그 달 1일 이전이면 이미 종료됨 → 비활성
 * - 둘 다 NULL = 항상 활성
 */
export function isSubscriptionActiveForMonth(
  s: {
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
  },
  month: string,
): boolean {
  if (!s.is_active) return false;
  const monthStart = `${month}-01`;
  const monthEnd = monthLastDayIso(month);
  if (s.start_date !== null && s.start_date > monthEnd) return false;
  if (s.end_date !== null && s.end_date < monthStart) return false;
  return true;
}

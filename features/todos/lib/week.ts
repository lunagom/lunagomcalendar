// features/todos/lib/week.ts
// 주(week) 단위 날짜 유틸. 주의 시작은 월요일.

const pad = (n: number): string => String(n).padStart(2, "0");

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 그 날이 속한 주의 월요일 ISO ("YYYY-MM-DD"). */
export function getWeekStart(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  // getDay: 0=일 1=월 ... 6=토 → 월요일 기준 인덱스
  const offset = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
  return toIso(monday);
}

/** 월~일 7개 ISO 날짜 반환. */
export function getWeekDays(weekStartIso: string): string[] {
  const [y, m, day] = weekStartIso.split("-").map(Number);
  const start = new Date(y, m - 1, day);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(y, m - 1, day + i);
    out.push(toIso(d));
  }
  void start;
  return out;
}

/** 다음/이전 주 월요일. */
export function shiftWeek(weekStartIso: string, deltaWeeks: number): string {
  const [y, m, day] = weekStartIso.split("-").map(Number);
  const d = new Date(y, m - 1, day + deltaWeeks * 7);
  return toIso(d);
}

/** 주간 라벨: "5월 26일 ~ 6월 1일" 또는 "5월 26일 ~ 31일" (같은 달일 때). */
export function formatWeekRange(weekStartIso: string): string {
  const days = getWeekDays(weekStartIso);
  const [startIso, endIso] = [days[0], days[6]];
  const [, sm, sd] = startIso.split("-").map(Number);
  const [, em, ed] = endIso.split("-").map(Number);
  if (sm === em) return `${sm}월 ${sd}일 ~ ${ed}일`;
  return `${sm}월 ${sd}일 ~ ${em}월 ${ed}일`;
}

/** "월", "화", ... */
export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

/** 모바일 기본 펼침 여부: 월~수 펼침, 목~일 접힘. (인덱스 0=월). */
export function isExpandedByDefault(dayIndex: number): boolean {
  return dayIndex < 3;
}

/** 두 ISO 가 같은 날인지. */
export function isSameDay(aIso: string, bIso: string): boolean {
  return aIso === bIso;
}

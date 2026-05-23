import holidays2025 from "./2025.json";
import holidays2026 from "./2026.json";

export type Holiday = {
  /** ISO date — YYYY-MM-DD (양력 기준) */
  date: string;
  /** 한국어 명칭 */
  name: string;
  /** 법정 공휴일 여부. true 면 빨강 표시, false 면 24절기 등 정보성 표시. */
  isPublicHoliday: boolean;
  /** 대체공휴일 여부 */
  isSubstitute?: boolean;
};

const BY_YEAR: Record<number, Holiday[]> = {
  2025: holidays2025 as Holiday[],
  2026: holidays2026 as Holiday[],
};

/** 특정 해의 모든 공휴일/절기. 정의되지 않은 해는 빈 배열. */
export function getHolidays(year: number): Holiday[] {
  return BY_YEAR[year] ?? [];
}

/** YYYY-MM-DD 가 공휴일인지 확인. */
export function findHoliday(isoDate: string): Holiday | undefined {
  const year = Number(isoDate.slice(0, 4));
  return getHolidays(year).find((h) => h.date === isoDate);
}

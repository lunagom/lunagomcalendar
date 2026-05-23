import KoreanLunarCalendar from "korean-lunar-calendar";

export type LunarDate = {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
};

/** 양력 Date → 음력. */
export function toLunar(date: Date): LunarDate {
  const cal = new KoreanLunarCalendar();
  cal.setSolarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const lunar = cal.getLunarCalendar();
  return {
    year: lunar.year,
    month: lunar.month,
    day: lunar.day,
    isLeapMonth: Boolean(lunar.intercalation),
  };
}

/** 양력 Date가 음력 1일(=음력 월이 시작하는 날)인지. */
export function isLunarFirstDay(date: Date): boolean {
  return toLunar(date).day === 1;
}

/**
 * 음력 (month, day) 의 fromYear 시점 이후 양력 Date를 반환.
 * 음력 일정 (생일·제사) 의 매년 표시용.
 */
export function nextSolarDateOfLunar(
  lunarMonth: number,
  lunarDay: number,
  fromYear: number,
): Date {
  const cal = new KoreanLunarCalendar();
  cal.setLunarDate(fromYear, lunarMonth, lunarDay, false);
  const s = cal.getSolarCalendar();
  return new Date(s.year, s.month - 1, s.day);
}

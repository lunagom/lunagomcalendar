/**
 * 한국 국공휴일 정적 데이터 (2026 ~ 2028).
 * 위젯 캐시에 events 와 함께 포함되어 칩으로 표시됨.
 * 매년 12월에 다음 해 데이터 추가 갱신.
 *
 * 출처: 공휴일에 관한 법률 + 연도별 대체공휴일 / 임시공휴일 발표 기준.
 * 음력 공휴일 (설, 추석, 부처님 오신 날) 은 양력 환산값.
 */

export type Holiday = {
  date: string; // YYYY-MM-DD
  title: string;
};

const HOLIDAYS: Holiday[] = [
  // 2026
  { date: "2026-01-01", title: "신정" },
  { date: "2026-02-16", title: "설날 연휴" },
  { date: "2026-02-17", title: "설날" },
  { date: "2026-02-18", title: "설날 연휴" },
  { date: "2026-03-01", title: "3·1절" },
  { date: "2026-03-02", title: "대체공휴일" },
  { date: "2026-05-05", title: "어린이날" },
  { date: "2026-05-24", title: "부처님 오신 날" },
  { date: "2026-05-25", title: "대체공휴일" },
  { date: "2026-06-06", title: "현충일" },
  { date: "2026-08-15", title: "광복절" },
  { date: "2026-08-17", title: "대체공휴일" },
  { date: "2026-09-24", title: "추석 연휴" },
  { date: "2026-09-25", title: "추석" },
  { date: "2026-09-26", title: "추석 연휴" },
  { date: "2026-10-03", title: "개천절" },
  { date: "2026-10-05", title: "대체공휴일" },
  { date: "2026-10-09", title: "한글날" },
  { date: "2026-12-25", title: "성탄절" },

  // 2027
  { date: "2027-01-01", title: "신정" },
  { date: "2027-02-06", title: "설날 연휴" },
  { date: "2027-02-07", title: "설날" },
  { date: "2027-02-08", title: "설날 연휴" },
  { date: "2027-02-09", title: "대체공휴일" },
  { date: "2027-03-01", title: "3·1절" },
  { date: "2027-05-05", title: "어린이날" },
  { date: "2027-05-13", title: "부처님 오신 날" },
  { date: "2027-06-06", title: "현충일" },
  { date: "2027-08-15", title: "광복절" },
  { date: "2027-08-16", title: "대체공휴일" },
  { date: "2027-09-14", title: "추석 연휴" },
  { date: "2027-09-15", title: "추석" },
  { date: "2027-09-16", title: "추석 연휴" },
  { date: "2027-10-03", title: "개천절" },
  { date: "2027-10-04", title: "대체공휴일" },
  { date: "2027-10-09", title: "한글날" },
  { date: "2027-12-25", title: "성탄절" },

  // 2028
  { date: "2028-01-01", title: "신정" },
  { date: "2028-01-26", title: "설날 연휴" },
  { date: "2028-01-27", title: "설날" },
  { date: "2028-01-28", title: "설날 연휴" },
  { date: "2028-03-01", title: "3·1절" },
  { date: "2028-05-02", title: "부처님 오신 날" },
  { date: "2028-05-05", title: "어린이날" },
  { date: "2028-06-06", title: "현충일" },
  { date: "2028-08-15", title: "광복절" },
  { date: "2028-10-02", title: "추석 연휴" },
  { date: "2028-10-03", title: "개천절 / 추석" },
  { date: "2028-10-04", title: "추석 연휴" },
  { date: "2028-10-09", title: "한글날" },
  { date: "2028-12-25", title: "성탄절" },
];

const HOLIDAY_COLOR = "#DC2626"; // 빨강 (일요일 색과 동일)

/**
 * 주어진 (year, month) 의 모든 공휴일을 widget cache event 형식으로 반환.
 */
export function getHolidaysForMonth(
  year: number,
  month: number,
): Array<{ date: string; color: string; title: string }> {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return HOLIDAYS.filter((h) => h.date.startsWith(prefix)).map((h) => ({
    date: h.date,
    color: HOLIDAY_COLOR,
    title: h.title,
  }));
}

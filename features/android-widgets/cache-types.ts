/** 위젯이 SharedPreferences 에서 읽어 그릴 캐시 JSON 의 스키마. */

export type CalendarCacheEvent = {
  date: string; // "YYYY-MM-DD" (로컬 기준)
  color: string; // "#RRGGBB"
  title: string; // 일정 제목 (위젯 칩에 표시)
};

export type CalendarCache = {
  year: number;
  month: number; // 1-12
  events: CalendarCacheEvent[];
  updatedAt: string; // ISO
};

export type ExpenseCache = {
  year: number;
  month: number;
  totalExpense: number;
  updatedAt: string;
};

export const CACHE_KEYS = {
  calendar: "widget_calendar",
  expense: "widget_expense",
} as const;

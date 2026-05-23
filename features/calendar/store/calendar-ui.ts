// features/calendar/store/calendar-ui.ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type CalendarUIState = {
  /** 보기 숨길 캘린더 id 모음 — persist. */
  hiddenCalendarIds: string[];
  toggleCalendarHidden: (id: string) => void;
  isHidden: (id: string) => boolean;
  /** 월간 그리드 셀에 그날 지출 합계 표시. 기본 ON. */
  showDailyExpenses: boolean;
  toggleShowDailyExpenses: () => void;
};

export const useCalendarUIStore = create<CalendarUIState>()(
  persist(
    (set, get) => ({
      hiddenCalendarIds: [],
      toggleCalendarHidden: (id) =>
        set((s) => ({
          hiddenCalendarIds: s.hiddenCalendarIds.includes(id)
            ? s.hiddenCalendarIds.filter((x) => x !== id)
            : [...s.hiddenCalendarIds, id],
        })),
      isHidden: (id) => get().hiddenCalendarIds.includes(id),
      showDailyExpenses: true,
      toggleShowDailyExpenses: () =>
        set((s) => ({ showDailyExpenses: !s.showDailyExpenses })),
    }),
    { name: "lunabear-calendar-ui" },
  ),
);

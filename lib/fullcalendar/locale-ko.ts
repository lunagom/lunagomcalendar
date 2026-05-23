import koLocale from "@fullcalendar/core/locales/ko";

export const FC_KO = {
  ...koLocale,
  buttonText: { ...koLocale.buttonText, today: "오늘" },
};

/** FullCalendar 공통 옵션. */
export const FC_COMMON = {
  locale: FC_KO,
  firstDay: 0, // 일요일 시작
  weekends: true,
  height: "100%" as const,
  dayMaxEvents: 3,
  moreLinkContent: (arg: { num: number }) => `+ ${arg.num}개 더`,
};

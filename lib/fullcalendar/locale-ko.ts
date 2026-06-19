import koLocale from "@fullcalendar/core/locales/ko";

export const FC_KO = {
  ...koLocale,
  buttonText: {
    ...koLocale.buttonText,
    today: "오늘",
    prev: "이전",
    next: "다음",
  },
};

/** FullCalendar 공통 옵션. */
export const FC_COMMON = {
  locale: FC_KO,
  firstDay: 0, // 일요일 시작
  weekends: true,
  height: "100%" as const,
  // 모든 주(행)를 가용 공간에 균등 분배 — 멀티데이 layer 가 있는 주가
  // 다른 주보다 더 키 커 보이는 들쭉날쭉 현상 방지.
  expandRows: true,
  dayMaxEvents: 3,
  moreLinkContent: (arg: { num: number }) => `+ ${arg.num}개 더`,
};

type Props = {
  nickname: string | null;
  /** 사용자 이메일 — 닉네임 없을 때 prefix 사용. */
  email: string;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 홈 페이지 최상단 인사말.
 * "[닉네임]님 오늘도 좋은 하루 되세요!🐻" + 오늘 날짜.
 */
export function PageGreeting({ nickname, email }: Props) {
  const displayName = nickname ?? email.split("@")[0];
  const today = new Date();
  const dateLabel = `${today.getMonth() + 1}월 ${today.getDate()}일 ${WEEKDAYS[today.getDay()]}요일`;

  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-bold">
        {displayName}님 오늘도 좋은 하루 되세요!🐻
      </h1>
      <p className="text-sm text-muted-foreground tabular-nums">
        {dateLabel}
      </p>
    </header>
  );
}

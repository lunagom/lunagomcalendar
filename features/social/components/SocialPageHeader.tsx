type Props = {
  inviteCount: number;
  acceptedCount: number;
  ownedCount: number;
};

/**
 * 공유 페이지 헤더 — h1 + 부제 (받은 초대 / 함께 보는 / 내가 공유한 카운트).
 */
export function SocialPageHeader({
  inviteCount,
  acceptedCount,
  ownedCount,
}: Props) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold">공유</h1>
      <p className="text-sm text-muted-foreground">
        받은 초대 {inviteCount} · 함께 보는 {acceptedCount} · 내가 공유한{" "}
        {ownedCount}
      </p>
    </header>
  );
}

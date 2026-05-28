// features/widgets/components/IncomingInvitesWidget.tsx
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { getMyIncomingInvites } from "../server/queries";

/**
 * 받은 초대 — 슬림 배너 형식.
 * - 초대 0건 → null (렌더 안 함)
 * - 초대 있음 → 1줄짜리 강조 배너. 클릭 시 /social 진입.
 *
 * 위젯 그리드 밖에 별도 배치되어 페이지 상단에 collapsed 형태로 표시.
 */
export async function IncomingInvitesWidget() {
  let invites: Awaited<ReturnType<typeof getMyIncomingInvites>> = [];
  try {
    invites = await getMyIncomingInvites();
  } catch {
    return null;
  }

  if (invites.length === 0) return null;

  const calendarNames = invites
    .slice(0, 2)
    .map((i) => i.calendar?.name)
    .filter((n): n is string => Boolean(n))
    .join(", ");
  const moreCount = invites.length - 2;

  return (
    <Link
      href="/social"
      className="group flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 transition-all duration-200 hover:border-primary/60 hover:-translate-y-0.5 hover:shadow-md"
    >
      <Users
        className="h-4 w-4 shrink-0 text-primary"
        strokeWidth={1.8}
      />
      <span className="text-sm">
        <span className="font-semibold text-primary tabular-nums">
          {invites.length}건
        </span>
        <span className="text-foreground">의 새 초대가 도착했어요</span>
      </span>
      {calendarNames && (
        <span className="ml-auto hidden sm:inline truncate text-xs text-muted-foreground">
          {calendarNames}
          {moreCount > 0 && ` 외 ${moreCount}건`}
        </span>
      )}
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.8}
      />
    </Link>
  );
}

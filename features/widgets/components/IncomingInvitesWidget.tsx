// features/widgets/components/IncomingInvitesWidget.tsx
import Link from "next/link";
import { Users } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getMyIncomingInvites } from "../server/queries";

export async function IncomingInvitesWidget() {
  let invites: Awaited<ReturnType<typeof getMyIncomingInvites>> = [];
  try {
    invites = await getMyIncomingInvites();
  } catch {
    return (
      <WidgetCard icon={Users} title="받은 초대">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={Users}
      title="받은 초대"
      trailing={invites.length > 0 ? `${invites.length}개` : undefined}
    >
      {invites.length === 0 ? (
        <p className="text-muted-foreground">받은 초대 없음</p>
      ) : (
        <>
          <ul className="space-y-1.5">
            {invites.slice(0, 3).map((inv) => (
              <li key={inv.id} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: inv.calendar?.color ?? "#888" }}
                  aria-hidden
                />
                <span className="truncate">
                  {inv.calendar?.name ?? "(삭제됨)"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {inv.owner?.nickname ?? "?"}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/social"
            className="mt-2 inline-block text-xs text-primary hover:underline"
          >
            모두 보기 →
          </Link>
        </>
      )}
    </WidgetCard>
  );
}

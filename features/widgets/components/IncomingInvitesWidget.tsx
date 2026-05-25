// features/widgets/components/IncomingInvitesWidget.tsx
import { MailX, Users } from "lucide-react";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";
import { getMyIncomingInvites } from "../server/queries";

export async function IncomingInvitesWidget() {
  let invites: Awaited<ReturnType<typeof getMyIncomingInvites>> = [];
  try {
    invites = await getMyIncomingInvites();
  } catch {
    return (
      <WidgetCard icon={Users} title="받은 초대" href="/social">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  if (invites.length === 0) {
    return (
      <WidgetCard icon={Users} title="받은 초대" href="/social">
        <WidgetEmpty icon={MailX} text="받은 초대 없음" />
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={Users}
      title="받은 초대"
      href="/social"
      trailing={`${invites.length}개`}
    >
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-primary">
          {invites.length}
        </span>
        <span className="text-sm text-muted-foreground">건의 새 초대</span>
      </div>
      <ul className="space-y-1.5 border-t pt-3">
        {invites.slice(0, 3).map((inv) => (
          <li key={inv.id} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: inv.calendar?.color ?? "#888" }}
              aria-hidden
            />
            <span className="truncate">{inv.calendar?.name ?? "(삭제됨)"}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {inv.owner?.nickname ?? "?"}
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

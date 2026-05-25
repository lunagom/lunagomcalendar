// features/widgets/components/UpcomingEventsWidget.tsx
import { CalendarDays } from "lucide-react";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";
import { getUpcomingEvents } from "../server/queries";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export async function UpcomingEventsWidget() {
  let events: Awaited<ReturnType<typeof getUpcomingEvents>> = [];
  try {
    events = await getUpcomingEvents();
  } catch {
    return (
      <WidgetCard icon={CalendarDays} title="다가오는 7일" href="/calendar">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  if (events.length === 0) {
    return (
      <WidgetCard icon={CalendarDays} title="다가오는 7일" href="/calendar">
        <WidgetEmpty icon={CalendarDays} text="예정된 일정이 없어요" />
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={CalendarDays}
      title="다가오는 7일"
      href="/calendar"
      trailing={`${events.length}개`}
    >
      <ul className="space-y-1.5">
        {events.slice(0, 5).map((e) => {
          const d = new Date(e.start_at);
          const md = `${d.getMonth() + 1}/${d.getDate()}`;
          const dow = WEEKDAY[d.getDay()];
          return (
            <li key={e.id} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: e.color ?? e.calendar_color }}
                aria-hidden
              />
              <span className="text-xs tabular-nums text-muted-foreground">
                {md} ({dow})
              </span>
              <span className="truncate">{e.title}</span>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}

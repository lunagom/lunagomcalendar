// features/widgets/components/UpcomingEventsWidget.tsx
import { CalendarDays } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getUpcomingEvents } from "../server/queries";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export async function UpcomingEventsWidget() {
  let events: Awaited<ReturnType<typeof getUpcomingEvents>> = [];
  try {
    events = await getUpcomingEvents();
  } catch {
    return (
      <WidgetCard icon={CalendarDays} title="다가오는 7일">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard icon={CalendarDays} title="다가오는 7일">
      {events.length === 0 ? (
        <p className="text-muted-foreground">예정된 일정이 없어요</p>
      ) : (
        <ul className="space-y-1.5">
          {events.slice(0, 6).map((e) => {
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
      )}
    </WidgetCard>
  );
}

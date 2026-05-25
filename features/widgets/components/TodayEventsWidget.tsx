// features/widgets/components/TodayEventsWidget.tsx
import { Calendar } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { getTodayEvents } from "../server/queries";

export async function TodayEventsWidget() {
  let events: Awaited<ReturnType<typeof getTodayEvents>> = [];
  try {
    events = await getTodayEvents();
  } catch {
    return (
      <WidgetCard icon={Calendar} title="오늘의 일정">
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={Calendar}
      title="오늘의 일정"
      trailing={`${events.length}개`}
    >
      {events.length === 0 ? (
        <p className="text-muted-foreground">오늘은 일정이 없어요</p>
      ) : (
        <ul className="space-y-1.5">
          {events.slice(0, 5).map((e) => {
            const time = new Date(e.start_at).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <li key={e.id} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: e.color ?? e.calendar_color }}
                  aria-hidden
                />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {time}
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

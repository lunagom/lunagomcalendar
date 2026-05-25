// features/widgets/components/TodayEventsWidget.tsx
import { Calendar, CalendarX } from "lucide-react";
import { WidgetCard, WidgetEmpty } from "./WidgetCard";
import { getTodayEvents } from "../server/queries";

export async function TodayEventsWidget() {
  let events: Awaited<ReturnType<typeof getTodayEvents>> = [];
  try {
    events = await getTodayEvents();
  } catch {
    return (
      <WidgetCard icon={Calendar} title="오늘의 일정" href="/calendar" spanTwo>
        <p className="text-muted-foreground">불러오지 못했어요</p>
      </WidgetCard>
    );
  }

  if (events.length === 0) {
    return (
      <WidgetCard icon={Calendar} title="오늘의 일정" href="/calendar" spanTwo>
        <WidgetEmpty icon={CalendarX} text="오늘은 일정이 없어요" />
      </WidgetCard>
    );
  }

  const next = events.find((e) => new Date(e.start_at) >= new Date()) ?? events[0];
  const nextTime = new Date(next.start_at).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <WidgetCard
      icon={Calendar}
      title="오늘의 일정"
      href="/calendar"
      spanTwo
      trailing={`${events.length}개`}
    >
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">{events.length}</span>
        <span className="text-sm text-muted-foreground">
          개 · 다음 <span className="font-medium text-foreground">{nextTime}</span>{" "}
          {next.title}
        </span>
      </div>
      <ul className="space-y-1.5 border-t pt-3">
        {events.slice(0, 4).map((e) => {
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
    </WidgetCard>
  );
}

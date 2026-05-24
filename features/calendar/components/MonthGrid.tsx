// features/calendar/components/MonthGrid.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import FullCalendar from "@fullcalendar/react";
import type { default as FullCalendarInst } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventInput,
  EventDropArg,
  EventClickArg,
  DatesSetArg,
  DayCellMountArg,
} from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FC_COMMON } from "@/lib/fullcalendar/locale-ko";
import { DayCell } from "./DayCell";
import { MonthNavigation } from "./MonthNavigation";
import { CalendarHeaderBar } from "./CalendarHeaderBar";
import { EventDetailDialog } from "./EventDetailDialog";
import { DayDetailPopup } from "./DayDetailPopup";
import { moveEvent } from "../server/actions";
import { useCalendarUIStore } from "../store/calendar-ui";
import type { CalendarRow, EventRow } from "../server/queries";
import type { TaskRow } from "@/features/todos/server/queries";
import type { ExpenseRow } from "@/features/expense/server/queries";

type Props = {
  calendars: CalendarRow[];
  events: EventRow[];
  todos: TaskRow[];
  expenses: ExpenseRow[];
  initialMonth: string; // YYYY-MM
};

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type CellRenderData = {
  viewedMonth: number;
  calendars: CalendarRow[];
  eventsByDate: Map<string, EventRow[]>;
  todosByDate: Map<string, TaskRow[]>;
  expensesByDate: Map<string, number>;
  onEventClick: (e: EventRow) => void;
  onDayClick: (d: Date) => void;
};

export function MonthGrid({
  calendars,
  events,
  todos,
  expenses,
  initialMonth,
}: Props) {
  const router = useRouter();
  const fcRef = useRef<FullCalendarInst | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenIds = useCalendarUIStore((s) => s.hiddenCalendarIds);
  const showDailyExpenses = useCalendarUIStore((s) => s.showDailyExpenses);

  const [dayDetailDate, setDayDetailDate] = useState<Date | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventRow | null>(null);
  const [viewedDate, setViewedDate] = useState<Date>(() => {
    const [y, m] = initialMonth.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const viewedMonth = viewedDate.getMonth();
  const initialDatesSetRef = useRef(true);

  const visibleEvents = useMemo(
    () => events.filter((e) => !hiddenIds.includes(e.calendar_id)),
    [events, hiddenIds],
  );

  // FC 자체 이벤트 렌더는 끄고 (display:"none") DnD 만 활용. 시각적 이벤트는 DayCell 이 그림.
  const fcEvents: EventInput[] = useMemo(
    () =>
      visibleEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start_at,
        end: e.end_at,
        allDay: e.is_all_day,
        display: "none" as const,
        extendedProps: { rawEvent: e },
      })),
    [visibleEvents],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of visibleEvents) {
      const key = e.start_at.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [visibleEvents]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const t of todos) {
      const arr = map.get(t.scheduled_date) ?? [];
      arr.push(t);
      map.set(t.scheduled_date, arr);
    }
    return map;
  }, [todos]);

  /** 토글 ON 일 때만 그날 지출 합계 — OFF 면 빈 Map 으로 셀에서 표시 X. */
  const expensesByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (!showDailyExpenses) return map;
    for (const e of expenses) {
      const key = e.paid_at.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return map;
  }, [expenses, showDailyExpenses]);

  // ── DayCell portal 관리 ──
  // FullCalendar 가 셀을 mount 할 때 빈 div 를 frame 에 추가하고 React root 생성.
  // data 변화 시 useEffect 가 모든 root 를 다시 렌더.
  const rootsRef = useRef(
    new Map<string, { root: Root; container: HTMLDivElement }>(),
  );
  const dataRef = useRef<CellRenderData>({
    viewedMonth,
    calendars,
    eventsByDate,
    todosByDate,
    expensesByDate,
    onEventClick: setDetailEvent,
    onDayClick: setDayDetailDate,
  });

  // 매 렌더마다 dataRef 갱신 (callback closure 갱신용)
  dataRef.current = {
    viewedMonth,
    calendars,
    eventsByDate,
    todosByDate,
    expensesByDate,
    onEventClick: setDetailEvent,
    onDayClick: setDayDetailDate,
  };

  function renderCellInto(isoDate: string, root: Root) {
    const date = new Date(isoDate);
    const d = dataRef.current;
    root.render(
      <DayCell
        date={date}
        isCurrentMonth={d.viewedMonth === date.getMonth()}
        events={d.eventsByDate.get(isoDate) ?? []}
        todos={d.todosByDate.get(isoDate) ?? []}
        calendars={d.calendars}
        onEventClick={d.onEventClick}
        onDayClick={() => d.onDayClick(date)}
        dailyExpenseTotal={d.expensesByDate.get(isoDate)}
      />,
    );
  }

  // 데이터 변화 시 모든 셀 다시 렌더
  useEffect(() => {
    rootsRef.current.forEach(({ root }, isoDate) => {
      renderCellInto(isoDate, root);
    });
  });

  const handleDayCellDidMount = (arg: DayCellMountArg) => {
    const isoDate = isoOf(arg.date);
    const frame = arg.el.querySelector<HTMLElement>(".fc-daygrid-day-frame");
    if (!frame) return;
    // frame 은 position: relative 이므로 absolute inset-0 이 정확히 셀을 채움
    const container = document.createElement("div");
    container.style.cssText =
      "position:absolute;inset:0;z-index:5;pointer-events:auto;";
    container.setAttribute("data-day-cell", isoDate);
    frame.appendChild(container);
    const root = createRoot(container);
    rootsRef.current.set(isoDate, { root, container });
    renderCellInto(isoDate, root);
  };

  const handleDayCellWillUnmount = (arg: DayCellMountArg) => {
    const isoDate = isoOf(arg.date);
    const entry = rootsRef.current.get(isoDate);
    if (entry) {
      // 비동기 unmount (현재 렌더 사이클 이후)
      setTimeout(() => {
        entry.root.unmount();
        entry.container.remove();
      }, 0);
      rootsRef.current.delete(isoDate);
    }
  };

  const navigate = (delta: -1 | 1 | 0) => {
    const api = fcRef.current?.getApi();
    if (!api) return;
    if (delta === 0) api.today();
    else if (delta < 0) api.prev();
    else api.next();
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    const currentStart = arg.view.currentStart;
    setViewedDate(currentStart);
    if (initialDatesSetRef.current) {
      initialDatesSetRef.current = false;
      return;
    }
    const m = `${currentStart.getFullYear()}-${String(currentStart.getMonth() + 1).padStart(2, "0")}`;
    if (m !== initialMonth) {
      router.push(`/calendar?month=${m}`);
    }
  };

  const handleEventClick = (info: EventClickArg) => {
    const ev = info.event.extendedProps.rawEvent as EventRow;
    setDetailEvent(ev);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const ev = info.event.extendedProps.rawEvent as EventRow;
    const newStart = info.event.start?.toISOString();
    const newEnd = (info.event.end ?? info.event.start)?.toISOString();
    if (!newStart || !newEnd) {
      info.revert();
      return;
    }
    const r = await moveEvent(ev.id, newStart, newEnd);
    if (!r.ok) {
      toast.error(r.error);
      info.revert();
    } else {
      toast.success("이동되었습니다");
    }
  };

  const popupIsoDate = dayDetailDate ? isoOf(dayDetailDate) : null;

  const monthLabel = `${viewedDate.getFullYear()}년 ${viewedDate.getMonth() + 1}월`;

  return (
    <div ref={containerRef} className="h-full">
      <MonthNavigation
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={() => navigate(0)}
        targetRef={containerRef}
      />
      <CalendarHeaderBar
        label={monthLabel}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onToday={() => navigate(0)}
      />
      <FullCalendar
        ref={fcRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={`${initialMonth}-01`}
        editable
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        events={fcEvents}
        datesSet={handleDatesSet}
        dayCellDidMount={handleDayCellDidMount}
        dayCellWillUnmount={handleDayCellWillUnmount}
        headerToolbar={false}
        {...FC_COMMON}
      />

      {popupIsoDate && (
        <DayDetailPopup
          date={dayDetailDate}
          events={eventsByDate.get(popupIsoDate) ?? []}
          todos={todosByDate.get(popupIsoDate) ?? []}
          calendars={calendars}
          onClose={() => setDayDetailDate(null)}
        />
      )}
      {detailEvent && (
        <EventDetailDialog
          event={detailEvent}
          calendars={calendars}
          onClose={() => setDetailEvent(null)}
        />
      )}
    </div>
  );
}

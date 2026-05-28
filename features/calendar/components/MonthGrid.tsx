// features/calendar/components/MonthGrid.tsx
"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import FullCalendar from "@fullcalendar/react";
import type { default as FullCalendarInst } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventInput,
  DatesSetArg,
  DayCellMountArg,
} from "@fullcalendar/core";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { FC_COMMON } from "@/lib/fullcalendar/locale-ko";
import { DayCell, type DayCellEvent } from "./DayCell";
import { MonthNavigation } from "./MonthNavigation";
import { CalendarMonthHeader } from "./CalendarMonthHeader";
import { FloatingActionButton } from "./FloatingActionButton";
import { EventDetailDialog } from "./EventDetailDialog";
import { DayDetailPopup } from "./DayDetailPopup";
import { WeekMultiDayLayer } from "./WeekMultiDayLayer";
import { buildWeekSegments, weekKeyOfDate } from "../lib/multi-day";
import { moveEvent } from "../server/actions";
import { isoToLocalDateKey } from "@/lib/datetime";
import { useCalendarUIStore } from "../store/calendar-ui";
import { EventHoverProvider } from "../lib/event-hover-context";
import type { CalendarRow, EventRow } from "../server/queries";
import type { TaskRow } from "@/features/todos/server/queries";
import type {
  ExpenseRow,
  IncomeRow,
} from "@/features/expense/server/queries";
import type { MonthlyStats } from "../lib/monthly-stats";

type Props = {
  calendars: CalendarRow[];
  events: EventRow[];
  todos: TaskRow[];
  expenses: ExpenseRow[];
  incomes: IncomeRow[];
  initialMonth: string; // YYYY-MM
  stats: MonthlyStats;
};

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MonthGrid({
  calendars,
  events,
  todos,
  expenses,
  incomes,
  initialMonth,
  stats,
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
  const [, startTransition] = useTransition();
  const viewedMonth = viewedDate.getMonth();
  const initialDatesSetRef = useRef(true);
  const todayLocalIso = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

  // 드롭 직후 서버 revalidate 완료 전에 일정이 원래 위치로 돌아갔다 새 위치로
  // 점프하는 깜박임 방지 — 드롭 즉시 로컬에서 새 날짜로 덮어쓰고, props 가
  // 서버 데이터로 따라오면 덮어쓰기 해제.
  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Map<string, { start_at: string; end_at: string }>
  >(() => new Map());

  useEffect(() => {
    setOptimisticOverrides((prev) => {
      if (prev.size === 0) return prev;
      const next = new Map(prev);
      let changed = false;
      prev.forEach((override, id) => {
        const real = events.find((e) => e.id === id);
        if (
          real &&
          real.start_at === override.start_at &&
          real.end_at === override.end_at
        ) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [events]);

  // 셀 / 주(week) 컨테이너 — FC 가 mount 한 cell 의 div 요소를 추적.
  // createPortal 로 React tree 안에서 렌더 → DndContext context 가 자식 컴포넌트에 도달.
  const [cellContainers, setCellContainers] = useState<Map<string, HTMLElement>>(
    () => new Map(),
  );
  const [weekContainers, setWeekContainers] = useState<Map<string, HTMLElement>>(
    () => new Map(),
  );

  // optimistic override 가 있으면 그 일정의 start_at/end_at 을 덮어쓴 결과로 처리.
  const effectiveEvents = useMemo(() => {
    if (optimisticOverrides.size === 0) return events;
    return events.map((e) => {
      const o = optimisticOverrides.get(e.id);
      return o ? { ...e, start_at: o.start_at, end_at: o.end_at } : e;
    });
  }, [events, optimisticOverrides]);

  const visibleEvents = useMemo(
    () => effectiveEvents.filter((e) => !hiddenIds.includes(e.calendar_id)),
    [effectiveEvents, hiddenIds],
  );

  // FC 자체 이벤트 렌더는 끄고 (display:"none") FC 가 일정 데이터를 갖고 있게만.
  // 시각적 이벤트 막대 + 드래그앤드롭은 DayCell / WeekMultiDayLayer 가 dnd-kit 으로 처리.
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
    const map = new Map<string, DayCellEvent[]>();
    for (const e of visibleEvents) {
      const startKey = isoToLocalDateKey(e.start_at);
      const endKey = isoToLocalDateKey(e.end_at ?? e.start_at);
      if (startKey !== endKey) continue;
      const arr = map.get(startKey) ?? [];
      arr.push({ event: e, spanRole: "single" });
      map.set(startKey, arr);
    }
    return map;
  }, [visibleEvents]);

  const weekSegments = useMemo(
    () => buildWeekSegments(visibleEvents),
    [visibleEvents],
  );

  /** 각 셀을 지나가는 멀티데이 막대의 최대 slot 수 — 단일 일정 offset 계산용. */
  const multiDaySlotsByDate = useMemo(() => {
    const map = new Map<string, number>();
    const pad = (n: number) => String(n).padStart(2, "0");
    for (const seg of weekSegments) {
      const [wy, wm, wd] = seg.weekKey.split("-").map(Number);
      for (let col = seg.startCol; col <= seg.endCol; col++) {
        const cellDate = new Date(wy, wm - 1, wd + col);
        const iso = `${cellDate.getFullYear()}-${pad(cellDate.getMonth() + 1)}-${pad(cellDate.getDate())}`;
        const current = map.get(iso) ?? 0;
        map.set(iso, Math.max(current, seg.slot + 1));
      }
    }
    return map;
  }, [weekSegments]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const t of todos) {
      const arr = map.get(t.scheduled_date) ?? [];
      arr.push(t);
      map.set(t.scheduled_date, arr);
    }
    return map;
  }, [todos]);

  const dailyDeltaByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (!showDailyExpenses) return map;
    for (const i of incomes) {
      const key = isoToLocalDateKey(i.received_at);
      map.set(key, (map.get(key) ?? 0) + i.amount);
    }
    for (const e of expenses) {
      const key = isoToLocalDateKey(e.paid_at);
      map.set(key, (map.get(key) ?? 0) - e.amount);
    }
    return map;
  }, [expenses, incomes, showDailyExpenses]);

  const incomesByDate = useMemo(() => {
    const map = new Map<string, IncomeRow[]>();
    for (const i of incomes) {
      const key = isoToLocalDateKey(i.received_at);
      const arr = map.get(key) ?? [];
      arr.push(i);
      map.set(key, arr);
    }
    return map;
  }, [incomes]);

  // ── 셀 / 주 컨테이너 mount / unmount ──
  const handleDayCellDidMount = (arg: DayCellMountArg) => {
    const isoDate = isoOf(arg.date);
    const frame = arg.el.querySelector<HTMLElement>(".fc-daygrid-day-frame");
    if (!frame) return;

    const container = document.createElement("div");
    container.style.cssText =
      "position:absolute;inset:0;z-index:5;pointer-events:auto;";
    container.setAttribute("data-day-cell", isoDate);
    frame.appendChild(container);
    setCellContainers((prev) => {
      const next = new Map(prev);
      next.set(isoDate, container);
      return next;
    });

    // 일요일 셀: tr 에 멀티데이 layer mount
    if (arg.date.getDay() === 0) {
      const td = arg.el;
      const weekKey = weekKeyOfDate(arg.date);
      if (window.getComputedStyle(td).position === "static") {
        td.style.position = "relative";
      }
      td.style.overflow = "visible";
      const layerEl = document.createElement("div");
      layerEl.style.cssText =
        "position:absolute;left:0;top:0;width:700%;height:0;pointer-events:none;z-index:10;";
      layerEl.setAttribute("data-week-layer", weekKey);
      td.appendChild(layerEl);
      setWeekContainers((prev) => {
        const next = new Map(prev);
        next.set(weekKey, layerEl);
        return next;
      });
    }
  };

  const handleDayCellWillUnmount = (arg: DayCellMountArg) => {
    const isoDate = isoOf(arg.date);
    setCellContainers((prev) => {
      const el = prev.get(isoDate);
      if (!el) return prev;
      // DOM 제거는 microtask 로 — React 가 portal unmount 한 뒤 정리.
      setTimeout(() => el.remove(), 0);
      const next = new Map(prev);
      next.delete(isoDate);
      return next;
    });

    if (arg.date.getDay() === 0) {
      const weekKey = weekKeyOfDate(arg.date);
      setWeekContainers((prev) => {
        const el = prev.get(weekKey);
        if (!el) return prev;
        setTimeout(() => el.remove(), 0);
        const next = new Map(prev);
        next.delete(weekKey);
        return next;
      });
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

  // ── 드래그앤드롭 (dnd-kit) ──
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 500, tolerance: 5 },
    }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const event = (active.data.current as { event?: EventRow } | undefined)
      ?.event;
    const newDate = (over.data.current as { date?: Date } | undefined)?.date;
    if (!event || !newDate) return;

    const oldStart = new Date(event.start_at);
    const oldEnd = new Date(event.end_at);

    // 새 셀의 자정 (로컬)
    const newDayMidnight = new Date(
      newDate.getFullYear(),
      newDate.getMonth(),
      newDate.getDate(),
    );
    // 기존 시작 일자의 자정 (로컬)
    const oldStartMidnight = new Date(
      oldStart.getFullYear(),
      oldStart.getMonth(),
      oldStart.getDate(),
    );

    // 같은 날이면 무시
    if (newDayMidnight.getTime() === oldStartMidnight.getTime()) return;

    // 일자만 이동, 시간은 유지. duration 보존 (멀티데이도 자동 처리).
    const timeOfDay = oldStart.getTime() - oldStartMidnight.getTime();
    const newStart = new Date(newDayMidnight.getTime() + timeOfDay);
    const duration = oldEnd.getTime() - oldStart.getTime();
    const newEnd = new Date(newStart.getTime() + duration);
    const newStartIso = newStart.toISOString();
    const newEndIso = newEnd.toISOString();

    // 즉시 로컬에서 새 위치 반영 (서버 응답 기다리는 동안 깜박임 방지)
    setOptimisticOverrides((prev) => {
      const next = new Map(prev);
      next.set(event.id, { start_at: newStartIso, end_at: newEndIso });
      return next;
    });

    startTransition(async () => {
      const r = await moveEvent(event.id, newStartIso, newEndIso);
      if (!r.ok) {
        toast.error(r.error);
        // 실패 시 override 제거 (원래 위치로 복귀)
        setOptimisticOverrides((prev) => {
          if (!prev.has(event.id)) return prev;
          const next = new Map(prev);
          next.delete(event.id);
          return next;
        });
      } else {
        toast.success("이동되었습니다");
      }
    });
  };

  const popupIsoDate = dayDetailDate ? isoOf(dayDetailDate) : null;
  const monthLabel = `${viewedDate.getFullYear()}년 ${viewedDate.getMonth() + 1}월`;

  return (
    <EventHoverProvider>
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div ref={containerRef} className="h-full">
        <MonthNavigation
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onToday={() => navigate(0)}
          targetRef={containerRef}
        />
        <CalendarMonthHeader
          monthLabel={monthLabel}
          stats={stats}
          calendars={calendars}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onToday={() => navigate(0)}
        />
        <motion.div
          key={viewedDate.getMonth()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
        <FullCalendar
          ref={fcRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={`${initialMonth}-01`}
          events={fcEvents}
          datesSet={handleDatesSet}
          dayCellDidMount={handleDayCellDidMount}
          dayCellWillUnmount={handleDayCellWillUnmount}
          headerToolbar={false}
          {...FC_COMMON}
        />
        </motion.div>

        {/* 셀별 React portal — DndContext 컨텍스트 전파됨 */}
        {Array.from(cellContainers.entries()).map(([isoDate, container]) => {
          const [y, m, d] = isoDate.split("-").map(Number);
          const date = new Date(y, m - 1, d);
          return createPortal(
            <DayCell
              date={date}
              isCurrentMonth={viewedMonth === date.getMonth()}
              isToday={isoDate === todayLocalIso}
              events={eventsByDate.get(isoDate) ?? []}
              todos={todosByDate.get(isoDate) ?? []}
              calendars={calendars}
              onEventClick={setDetailEvent}
              onDayClick={() => setDayDetailDate(date)}
              dailyDelta={dailyDeltaByDate.get(isoDate)}
              multiDaySlots={multiDaySlotsByDate.get(isoDate) ?? 0}
            />,
            container,
            isoDate,
          );
        })}

        {/* 주별 멀티데이 layer portal */}
        {Array.from(weekContainers.entries()).map(([weekKey, container]) => {
          const segs = weekSegments.filter((s) => s.weekKey === weekKey);
          return createPortal(
            <WeekMultiDayLayer
              segments={segs}
              calendars={calendars}
              onEventClick={setDetailEvent}
            />,
            container,
            weekKey,
          );
        })}

        {popupIsoDate && (
          <DayDetailPopup
            date={dayDetailDate}
            events={(eventsByDate.get(popupIsoDate) ?? []).map((x) => x.event)}
            todos={todosByDate.get(popupIsoDate) ?? []}
            incomes={incomesByDate.get(popupIsoDate) ?? []}
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
        <FloatingActionButton calendars={calendars} />
      </div>
    </DndContext>
    </EventHoverProvider>
  );
}

import { CalendarShell } from "@/features/calendar/components/CalendarShell";
import { MonthGrid } from "@/features/calendar/components/MonthGrid";
import {
  getCalendars,
  getEventsForMonth,
} from "@/features/calendar/server/queries";
import { getTodosForMonth } from "@/features/todos/server/queries";

export const metadata = { title: "캘린더" };

type Props = { searchParams: { month?: string } };

function defaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: Props) {
  const month = searchParams.month ?? defaultMonth();
  const [calendars, events, todos] = await Promise.all([
    getCalendars(),
    getEventsForMonth(month),
    getTodosForMonth(month),
  ]);

  const [year, monthStr] = month.split("-");
  const monthLabel = `${year}년 ${parseInt(monthStr, 10)}월`;

  return (
    <CalendarShell calendars={calendars} monthLabel={monthLabel}>
      <MonthGrid
        calendars={calendars}
        events={events}
        todos={todos}
        initialMonth={month}
      />
    </CalendarShell>
  );
}

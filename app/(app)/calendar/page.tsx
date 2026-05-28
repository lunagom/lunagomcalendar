import { CalendarShell } from "@/features/calendar/components/CalendarShell";
import { MonthGrid } from "@/features/calendar/components/MonthGrid";
import {
  getCalendars,
  getEventsForMonth,
} from "@/features/calendar/server/queries";
import { getTodosForMonth } from "@/features/todos/server/queries";
import {
  getExpensesForMonth,
  getIncomesForMonth,
} from "@/features/expense/server/queries";
import { computeMonthlyStats } from "@/features/calendar/lib/monthly-stats";

export const metadata = { title: "캘린더" };

type Props = { searchParams: { month?: string } };

function defaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: Props) {
  const month = searchParams.month ?? defaultMonth();
  const [calendars, events, todos, expenses, incomes] = await Promise.all([
    getCalendars(),
    getEventsForMonth(month),
    getTodosForMonth(month),
    getExpensesForMonth(month),
    getIncomesForMonth(month),
  ]);

  const stats = computeMonthlyStats(month, events, todos, expenses, incomes);

  return (
    <CalendarShell calendars={calendars}>
      <MonthGrid
        calendars={calendars}
        events={events}
        todos={todos}
        expenses={expenses}
        incomes={incomes}
        initialMonth={month}
        stats={stats}
      />
    </CalendarShell>
  );
}

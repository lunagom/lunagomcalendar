import { CalendarShell } from "@/features/calendar/components/CalendarShell";
import { DayView } from "@/features/calendar/components/DayView";
import {
  getCalendars,
  getEventsForDay,
} from "@/features/calendar/server/queries";

export const metadata = { title: "하루" };

type Props = { searchParams: { date?: string } };

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DayPage({ searchParams }: Props) {
  const date = searchParams.date ?? todayIso();
  const [calendars, events] = await Promise.all([
    getCalendars(),
    getEventsForDay(date),
  ]);

  return (
    <CalendarShell calendars={calendars}>
      <DayView calendars={calendars} events={events} initialDate={date} />
    </CalendarShell>
  );
}

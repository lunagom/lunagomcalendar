import { setCache, notifyWidgets } from "@/lib/widget-cache";
import { CACHE_KEYS, type CalendarCache, type CalendarCacheEvent, type ExpenseCache } from "./cache-types";

export function buildCalendarCache(input: {
  year: number;
  month: number;
  events: CalendarCacheEvent[];
  now: Date;
}): CalendarCache {
  return {
    year: input.year,
    month: input.month,
    events: input.events,
    updatedAt: input.now.toISOString(),
  };
}

export function buildExpenseCache(input: {
  year: number;
  month: number;
  totalExpense: number;
  now: Date;
}): ExpenseCache {
  return {
    year: input.year,
    month: input.month,
    totalExpense: input.totalExpense,
    updatedAt: input.now.toISOString(),
  };
}

export async function syncCalendarCache(cache: CalendarCache): Promise<void> {
  await setCache(CACHE_KEYS.calendar, JSON.stringify(cache));
  await notifyWidgets();
}

export async function syncExpenseCache(cache: ExpenseCache): Promise<void> {
  await setCache(CACHE_KEYS.expense, JSON.stringify(cache));
  await notifyWidgets();
}

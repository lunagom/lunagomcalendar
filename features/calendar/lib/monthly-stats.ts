import { isoToLocalDateKey } from "@/lib/datetime";
import type { EventRow } from "@/features/calendar/server/queries";
import type { TaskRow } from "@/features/todos/server/queries";
import type {
  ExpenseRow,
  IncomeRow,
} from "@/features/expense/server/queries";

export type MonthlyStats = {
  /** 그 달에 시작하는 일정 수 */
  eventCount: number;
  /** 그 달에 scheduled 된 할 일 — 완료 / 총 */
  todoDone: number;
  todoTotal: number;
  /** 그 달 순수익 (수입 - 지출) */
  net: number;
};

/**
 * 캘린더 헤더 통계용. month 와 무관한 데이터는 호출자가 미리 필터링 (page.tsx 에서
 * getEventsForMonth 등을 호출하므로 그 결과를 그대로 받는다).
 *
 * @param month "YYYY-MM"
 */
export function computeMonthlyStats(
  month: string,
  events: EventRow[],
  todos: TaskRow[],
  expenses: ExpenseRow[],
  incomes: IncomeRow[],
): MonthlyStats {
  let eventCount = 0;
  for (const e of events) {
    if (isoToLocalDateKey(e.start_at).startsWith(month)) {
      eventCount++;
    }
  }

  let todoDone = 0;
  let todoTotal = 0;
  for (const t of todos) {
    if (t.scheduled_date.startsWith(month)) {
      todoTotal++;
      if (t.completed_at) todoDone++;
    }
  }

  let net = 0;
  for (const i of incomes) {
    if (isoToLocalDateKey(i.received_at).startsWith(month)) {
      net += i.amount;
    }
  }
  for (const e of expenses) {
    if (isoToLocalDateKey(e.paid_at).startsWith(month)) {
      net -= e.amount;
    }
  }

  return { eventCount, todoDone, todoTotal, net };
}

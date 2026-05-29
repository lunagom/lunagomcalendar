// features/expense/components/ExpenseMonthGrid.tsx
"use client";

import { useMemo, useState } from "react";
import { ExpenseDayDetailPopup } from "./ExpenseDayDetailPopup";
import { isoToLocalDateKey } from "@/lib/datetime";
import { formatDelta } from "@/lib/colors";
import type { ExpenseRow, IncomeRow } from "../server/queries";

type Props = {
  month: string; // "YYYY-MM"
  expenses: ExpenseRow[];
  incomes: IncomeRow[];
  usedCategories: string[];
  recentMemos?: string[];
  cardNames?: string[];
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ExpenseMonthGrid({
  month,
  expenses,
  incomes,
  usedCategories,
  recentMemos = [],
  cardNames = [],
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // paid_at (UTC ISO) → 로컬 날짜로 그룹핑
  const expensesByDate = useMemo(() => {
    const map = new Map<string, ExpenseRow[]>();
    for (const e of expenses) {
      const key = isoToLocalDateKey(e.paid_at);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [expenses]);

  // received_at (UTC ISO) → 로컬 날짜로 그룹핑
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

  // 일별 순수익 = 수입 - 지출
  const deltaByDate = useMemo(() => {
    const dates = new Set<string>();
    expensesByDate.forEach((_, k) => dates.add(k));
    incomesByDate.forEach((_, k) => dates.add(k));
    const map = new Map<string, number>();
    dates.forEach((d) => {
      const inc = (incomesByDate.get(d) ?? []).reduce((s, i) => s + i.amount, 0);
      const exp = (expensesByDate.get(d) ?? []).reduce((s, e) => s + e.amount, 0);
      map.set(d, inc - exp);
    });
    return map;
  }, [expensesByDate, incomesByDate]);

  // 6주 그리드 — 캘린더와 동일 패턴
  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  const firstOfMonth = new Date(year, monthIdx, 1);
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - firstOfMonth.getDay()); // 일요일 시작

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    cells.push(d);
  }

  const todayIso = isoOf(new Date());

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
        {WEEKDAY.map((w, i) => (
          <div
            key={w}
            className={`bg-background py-2 text-center text-xs font-medium ${
              i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-muted-foreground"
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((d) => {
          const iso = isoOf(d);
          const isCurrentMonth = d.getMonth() === monthIdx;
          const isToday = iso === todayIso;
          const delta = deltaByDate.get(iso) ?? 0;
          const dow = d.getDay();
          const deltaCls =
            delta > 0
              ? "text-[#16A34A] dark:text-[#4ADE80]"
              : "text-[#DC2626] dark:text-[#F87171]";

          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={`bg-background min-h-[72px] p-1.5 text-left flex flex-col items-stretch hover:bg-accent transition-colors ${
                isCurrentMonth ? "" : "opacity-40"
              }`}
            >
              <span
                className={`text-xs ${
                  isToday
                    ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground self-start"
                    : dow === 0
                      ? "text-red-600"
                      : dow === 6
                        ? "text-blue-600"
                        : ""
                }`}
              >
                {d.getDate()}
              </span>
              {delta !== 0 && (
                <span
                  className={`mt-auto text-right text-[11px] font-medium tabular-nums truncate ${deltaCls}`}
                >
                  {formatDelta(delta)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <ExpenseDayDetailPopup
          date={selectedDate}
          expenses={expensesByDate.get(isoOf(selectedDate)) ?? []}
          incomes={incomesByDate.get(isoOf(selectedDate)) ?? []}
          usedCategories={usedCategories}
          onClose={() => setSelectedDate(null)}
          recentMemos={recentMemos}
          cardNames={cardNames}
        />
      )}
    </div>
  );
}

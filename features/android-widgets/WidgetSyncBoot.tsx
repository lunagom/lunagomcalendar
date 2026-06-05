"use client";

import { useEffect } from "react";

import { isCapacitorNative } from "@/lib/platform";
import { buildCalendarCache, buildExpenseCache, syncCalendarCache, syncExpenseCache } from "./sync";
import { fetchCurrentMonthCalendarEvents, fetchCurrentMonthExpenseTotal } from "./queries";

/**
 * 앱 마운트 시 1회 위젯 캐시 풀 동기화.
 * 그 후엔 각 mutation 후에 부분 sync 가 일어남.
 * Capacitor 네이티브가 아니면 no-op.
 */
export function WidgetSyncBoot() {
  useEffect(() => {
    if (!isCapacitorNative()) return;
    let cancelled = false;
    (async () => {
      try {
        const now = new Date();
        const [events, totalExpense] = await Promise.all([
          fetchCurrentMonthCalendarEvents(),
          fetchCurrentMonthExpenseTotal(),
        ]);
        if (cancelled) return;
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        await syncCalendarCache(buildCalendarCache({ year, month, events, now }));
        await syncExpenseCache(buildExpenseCache({ year, month, totalExpense, now }));
      } catch (err) {
        console.warn("[widget-sync-boot] failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

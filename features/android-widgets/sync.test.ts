import { describe, it, expect } from "vitest";
import { buildCalendarCache, buildExpenseCache } from "./sync";
import type { CalendarCacheEvent } from "./cache-types";

describe("buildCalendarCache", () => {
  it("이벤트 배열을 캐시 JSON 으로 변환 + 메타 채움", () => {
    const events: CalendarCacheEvent[] = [
      { date: "2026-06-05", color: "#3B82F6" },
      { date: "2026-06-12", color: "#16A34A" },
    ];
    const now = new Date("2026-06-05T12:00:00.000Z");
    const result = buildCalendarCache({ year: 2026, month: 6, events, now });
    expect(result.year).toBe(2026);
    expect(result.month).toBe(6);
    expect(result.events).toHaveLength(2);
    expect(result.updatedAt).toBe(now.toISOString());
  });
});

describe("buildExpenseCache", () => {
  it("합계와 메타 채움", () => {
    const now = new Date("2026-06-05T12:00:00.000Z");
    const result = buildExpenseCache({ year: 2026, month: 6, totalExpense: 1240000, now });
    expect(result.totalExpense).toBe(1240000);
    expect(result.year).toBe(2026);
    expect(result.month).toBe(6);
    expect(result.updatedAt).toBe(now.toISOString());
  });
});

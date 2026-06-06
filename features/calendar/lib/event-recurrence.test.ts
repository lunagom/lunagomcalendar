import { describe, it, expect } from "vitest";
import { unfoldRecurringEvent, parseRecurrenceRule } from "./event-recurrence";

const baseEvent = {
  id: "evt-1",
  start_at: "2026-06-01T09:00:00.000Z",
  end_at: "2026-06-01T10:00:00.000Z",
  title: "회의",
  is_recurring: true,
  recurrence_until: null,
  recurrence_count: null,
};

describe("parseRecurrenceRule", () => {
  it("daily 통과", () => {
    expect(parseRecurrenceRule({ freq: "daily" })).toEqual({ freq: "daily" });
  });
  it("weekly + byday 통과", () => {
    expect(parseRecurrenceRule({ freq: "weekly", byday: ["MO", "WE"] })).toEqual(
      { freq: "weekly", byday: ["MO", "WE"] },
    );
  });
  it("monthly + bymonthday 통과", () => {
    expect(parseRecurrenceRule({ freq: "monthly", bymonthday: 15 })).toEqual({
      freq: "monthly",
      bymonthday: 15,
    });
  });
  it("exceptions 같이 통과", () => {
    expect(
      parseRecurrenceRule({ freq: "daily", exceptions: ["2026-06-03"] }),
    ).toEqual({ freq: "daily", exceptions: ["2026-06-03"] });
  });
  it("알 수 없는 freq → null", () => {
    expect(parseRecurrenceRule({ freq: "yearly" })).toBeNull();
    expect(parseRecurrenceRule(null)).toBeNull();
    expect(parseRecurrenceRule("foo")).toBeNull();
  });
});

describe("unfoldRecurringEvent — daily", () => {
  it("시작일부터 매일 인스턴스", () => {
    const result = unfoldRecurringEvent(
      { ...baseEvent, recurrence_rule: { freq: "daily" } },
      "2026-06-01",
      "2026-06-05",
    );
    expect(result.map((v) => v.date)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
    ]);
  });
  it("recurrence_until 이후 멈춤", () => {
    const result = unfoldRecurringEvent(
      {
        ...baseEvent,
        recurrence_rule: { freq: "daily" },
        recurrence_until: "2026-06-03",
      },
      "2026-06-01",
      "2026-06-10",
    );
    expect(result.map((v) => v.date)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });
  it("recurrence_count N회 까지만", () => {
    const result = unfoldRecurringEvent(
      {
        ...baseEvent,
        recurrence_rule: { freq: "daily" },
        recurrence_count: 3,
      },
      "2026-06-01",
      "2026-06-10",
    );
    expect(result).toHaveLength(3);
  });
  it("exceptions 날짜는 skip", () => {
    const result = unfoldRecurringEvent(
      {
        ...baseEvent,
        recurrence_rule: { freq: "daily", exceptions: ["2026-06-03"] },
      },
      "2026-06-01",
      "2026-06-05",
    );
    expect(result.map((v) => v.date)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-04",
      "2026-06-05",
    ]);
  });
});

describe("unfoldRecurringEvent — weekly", () => {
  it("byday 월/수만", () => {
    // 2026-06-01 = 월, 2026-06-03 = 수, 2026-06-08 = 월, 2026-06-10 = 수
    const result = unfoldRecurringEvent(
      {
        ...baseEvent,
        recurrence_rule: { freq: "weekly", byday: ["MO", "WE"] },
      },
      "2026-06-01",
      "2026-06-10",
    );
    expect(result.map((v) => v.date)).toEqual([
      "2026-06-01",
      "2026-06-03",
      "2026-06-08",
      "2026-06-10",
    ]);
  });
});

describe("unfoldRecurringEvent — monthly", () => {
  it("매월 15일", () => {
    const result = unfoldRecurringEvent(
      {
        ...baseEvent,
        recurrence_rule: { freq: "monthly", bymonthday: 15 },
      },
      "2026-06-01",
      "2026-08-31",
    );
    expect(result.map((v) => v.date)).toEqual([
      "2026-06-15",
      "2026-07-15",
      "2026-08-15",
    ]);
  });
});

describe("unfoldRecurringEvent — 시작일 이전 skip", () => {
  it("event.start_at 이전 날짜는 안 만듦", () => {
    const result = unfoldRecurringEvent(
      {
        ...baseEvent,
        start_at: "2026-06-10T09:00:00.000Z",
        recurrence_rule: { freq: "daily" },
      },
      "2026-06-01",
      "2026-06-12",
    );
    expect(result.map((v) => v.date)).toEqual([
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
    ]);
  });
});

describe("unfoldRecurringEvent — is_recurring false 또는 rule 없음", () => {
  it("is_recurring=false → 빈 배열", () => {
    const result = unfoldRecurringEvent(
      {
        ...baseEvent,
        is_recurring: false,
        recurrence_rule: { freq: "daily" },
      },
      "2026-06-01",
      "2026-06-05",
    );
    expect(result).toEqual([]);
  });
  it("rule 파싱 실패 → 빈 배열", () => {
    const result = unfoldRecurringEvent(
      { ...baseEvent, recurrence_rule: null },
      "2026-06-01",
      "2026-06-05",
    );
    expect(result).toEqual([]);
  });
});

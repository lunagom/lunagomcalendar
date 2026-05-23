import { describe, it, expect } from "vitest";
import { toLunar, isLunarFirstDay, nextSolarDateOfLunar } from "./lunar";

describe("toLunar", () => {
  it("2026-02-17 (양력) → 음력 2026-01-01", () => {
    const r = toLunar(new Date(2026, 1, 17));
    expect(r.year).toBe(2026);
    expect(r.month).toBe(1);
    expect(r.day).toBe(1);
  });
  it("2026-05-23 (양력) → 음력 2026-04-07", () => {
    const r = toLunar(new Date(2026, 4, 23));
    expect(r.month).toBe(4);
    expect(r.day).toBe(7);
  });
});

describe("isLunarFirstDay", () => {
  it("음력 1일이 되는 날에는 true", () => {
    expect(isLunarFirstDay(new Date(2026, 1, 17))).toBe(true); // 음 1/1
    expect(isLunarFirstDay(new Date(2026, 2, 19))).toBe(true); // 음 2/1
  });
  it("그 외 날에는 false", () => {
    expect(isLunarFirstDay(new Date(2026, 4, 23))).toBe(false);
    expect(isLunarFirstDay(new Date(2026, 0, 1))).toBe(false); // 양력 1/1
  });
});

describe("nextSolarDateOfLunar", () => {
  it("음력 4/7 의 다음(또는 같은 해) 양력 날짜를 계산", () => {
    const r = nextSolarDateOfLunar(4, 7, 2026);
    expect(r.getFullYear()).toBe(2026);
    expect(r.getMonth()).toBe(4); // 5월 (0-based)
    expect(r.getDate()).toBe(23);
  });
});

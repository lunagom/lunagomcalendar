import { describe, it, expect } from "vitest";
import {
  findHoliday,
  isPublicHoliday,
  get24SolarTerm,
} from "./index";

describe("findHoliday", () => {
  it("2026-05-05 → 어린이날", () => {
    expect(findHoliday("2026-05-05")?.name).toBe("어린이날");
  });
  it("정의 안 된 날 → undefined", () => {
    expect(findHoliday("2026-05-06")).toBeUndefined();
  });
});

describe("isPublicHoliday", () => {
  it("법정 공휴일 true", () => {
    expect(isPublicHoliday("2026-05-05")).toBe(true);
    expect(isPublicHoliday("2026-09-25")).toBe(true); // 추석
  });
  it("24절기는 false (정보성)", () => {
    expect(isPublicHoliday("2026-02-04")).toBe(false); // 입춘
  });
  it("아무 것도 아닌 날도 false", () => {
    expect(isPublicHoliday("2026-05-06")).toBe(false);
  });
});

describe("get24SolarTerm", () => {
  it("입춘 (2026-02-04)", () => {
    expect(get24SolarTerm("2026-02-04")).toBe("입춘");
  });
  it("공휴일과 겹치는 날 (어린이날·입하 2026-05-05) 에도 절기명 반환", () => {
    // 데이터 자체엔 둘 다 있으므로, 호출자가 우선순위 적용
    expect(get24SolarTerm("2026-05-05")).toBe("입하");
  });
  it("절기 아닌 날 → null", () => {
    expect(get24SolarTerm("2026-05-06")).toBeNull();
  });
});

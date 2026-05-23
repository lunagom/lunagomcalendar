import { describe, it, expect } from "vitest";
import {
  daysUntilNextBilling,
  monthEndDay,
  billingUrgency,
} from "./subscription";

describe("monthEndDay", () => {
  it("1월 → 31일", () => {
    expect(monthEndDay(2026, 0)).toBe(31);
  });
  it("4월 → 30일", () => {
    expect(monthEndDay(2026, 3)).toBe(30);
  });
  it("2월 평년 → 28일", () => {
    expect(monthEndDay(2026, 1)).toBe(28);
  });
  it("2월 윤년 → 29일", () => {
    expect(monthEndDay(2024, 1)).toBe(29);
  });
  it("12월 → 31일", () => {
    expect(monthEndDay(2026, 11)).toBe(31);
  });
});

describe("daysUntilNextBilling", () => {
  it("오늘이 결제일이면 0", () => {
    expect(daysUntilNextBilling(15, new Date(2026, 4, 15))).toBe(0);
  });

  it("이번 달 결제일까지 5일 남음", () => {
    expect(daysUntilNextBilling(15, new Date(2026, 4, 10))).toBe(5);
  });

  it("결제일을 지나면 다음 달", () => {
    // 5/20 → 다음 6/15 → 26일
    expect(daysUntilNextBilling(15, new Date(2026, 4, 20))).toBe(26);
  });

  it("billing_day=31, 2월에는 28일로 캡", () => {
    // 2/15 → 2/28 결제 → 13일
    expect(daysUntilNextBilling(31, new Date(2026, 1, 15))).toBe(13);
  });

  it("billing_day=31, 2월 28일이면 오늘 결제", () => {
    expect(daysUntilNextBilling(31, new Date(2026, 1, 28))).toBe(0);
  });

  it("billing_day=31, 4월에는 30일로 캡", () => {
    // 4/15 → 4/30 → 15일
    expect(daysUntilNextBilling(31, new Date(2026, 3, 15))).toBe(15);
  });

  it("billing_day=1, 5/25 → 6/1 → 7일", () => {
    expect(daysUntilNextBilling(1, new Date(2026, 4, 25))).toBe(7);
  });

  it("연말 → 연초로 넘어감", () => {
    // 12/20 → 1/5 → 16일
    expect(daysUntilNextBilling(5, new Date(2026, 11, 20))).toBe(16);
  });

  it("billing_day=31, 1월 31일이면 오늘 결제 (다음 달 캡 안 됨)", () => {
    expect(daysUntilNextBilling(31, new Date(2026, 0, 31))).toBe(0);
  });
});

describe("billingUrgency", () => {
  it("0일 → today", () => {
    expect(billingUrgency(0)).toBe("today");
  });

  it("1~3일 → soon", () => {
    expect(billingUrgency(1)).toBe("soon");
    expect(billingUrgency(2)).toBe("soon");
    expect(billingUrgency(3)).toBe("soon");
  });

  it("4~7일 → upcoming", () => {
    expect(billingUrgency(4)).toBe("upcoming");
    expect(billingUrgency(7)).toBe("upcoming");
  });

  it("8일+ → later", () => {
    expect(billingUrgency(8)).toBe("later");
    expect(billingUrgency(30)).toBe("later");
  });
});

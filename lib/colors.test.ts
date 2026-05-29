import { describe, it, expect } from "vitest";
import {
  PRESETS,
  getTextColor,
  INCOME_CATEGORY_PRESETS,
  INCOME_CATEGORY_COLOR,
  TRANSACTION_DELTA_COLORS,
  getIncomeCategoryColor,
  formatDelta,
} from "./colors";

describe("PRESETS", () => {
  it("12개 색을 제공한다", () => {
    expect(PRESETS).toHaveLength(12);
  });
  it("모두 #RRGGBB 형식이다", () => {
    for (const c of PRESETS) expect(c).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

describe("getTextColor", () => {
  it("밝은 색에는 검정", () => {
    expect(getTextColor("#F8D87B")).toBe("#222");
    expect(getTextColor("#FFFFFF")).toBe("#222");
    expect(getTextColor("#EBD8DD")).toBe("#222");
  });
  it("어두운 색에는 흰색", () => {
    expect(getTextColor("#7A7A7A")).toBe("#fff");
    expect(getTextColor("#000000")).toBe("#fff");
    expect(getTextColor("#7E94A2")).toBe("#fff");
  });
  it("3자리 hex 도 처리한다", () => {
    expect(getTextColor("#fff")).toBe("#222");
    expect(getTextColor("#000")).toBe("#fff");
  });
});

describe("INCOME_CATEGORY_PRESETS", () => {
  it("6 개 카테고리: 월급/투자/코인/부수입/저축/기타", () => {
    expect([...INCOME_CATEGORY_PRESETS]).toEqual([
      "월급", "투자", "코인", "부수입", "저축", "기타",
    ]);
  });
});

describe("INCOME_CATEGORY_COLOR", () => {
  it("월급 = #16A34A", () => {
    expect(INCOME_CATEGORY_COLOR.월급).toBe("#16A34A");
  });
  it("코인 = #F59E0B (앰버)", () => {
    expect(INCOME_CATEGORY_COLOR.코인).toBe("#F59E0B");
  });
});

describe("getIncomeCategoryColor", () => {
  it("프리셋이면 매핑된 색", () => {
    expect(getIncomeCategoryColor("월급")).toBe("#16A34A");
  });
  it("사용자 정의면 fallback (#6B7280)", () => {
    expect(getIncomeCategoryColor("임대료")).toBe("#6B7280");
  });
});

describe("TRANSACTION_DELTA_COLORS", () => {
  it("수입 라이트=#16A34A, 다크=#4ADE80", () => {
    expect(TRANSACTION_DELTA_COLORS.income.light).toBe("#16A34A");
    expect(TRANSACTION_DELTA_COLORS.income.dark).toBe("#4ADE80");
  });
  it("지출 라이트=#DC2626, 다크=#F87171", () => {
    expect(TRANSACTION_DELTA_COLORS.expense.light).toBe("#DC2626");
    expect(TRANSACTION_DELTA_COLORS.expense.dark).toBe("#F87171");
  });
});

describe("formatDelta", () => {
  it("양수면 '+N원' (콤마 구분)", () => {
    expect(formatDelta(50000)).toBe("+50,000원");
  });
  it("음수면 '-N원' (절대값 콤마)", () => {
    expect(formatDelta(-15000)).toBe("-15,000원");
  });
  it("0 이면 '0원'", () => {
    expect(formatDelta(0)).toBe("0원");
  });
});

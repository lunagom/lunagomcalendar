import { describe, it, expect } from "vitest";
import { PRESETS, getTextColor } from "./colors";

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

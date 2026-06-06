import { describe, it, expect } from "vitest";
import { widgetUrlForAction, parseWidgetAction } from "./widget-urls";

describe("widgetUrlForAction", () => {
  it("'add-expense' → /expense?action=add-expense", () => {
    expect(widgetUrlForAction("add-expense")).toBe("/expense?action=add-expense");
  });
  it("'add-income' → /expense?action=add-income", () => {
    expect(widgetUrlForAction("add-income")).toBe("/expense?action=add-income");
  });
});

describe("parseWidgetAction", () => {
  it("유효 값 통과", () => {
    expect(parseWidgetAction("add-expense")).toBe("add-expense");
    expect(parseWidgetAction("add-income")).toBe("add-income");
  });
  it("알 수 없는/빈 값 → null", () => {
    expect(parseWidgetAction("foo")).toBeNull();
    expect(parseWidgetAction(null)).toBeNull();
    expect(parseWidgetAction(undefined)).toBeNull();
    expect(parseWidgetAction("add-transfer")).toBeNull();
  });
});

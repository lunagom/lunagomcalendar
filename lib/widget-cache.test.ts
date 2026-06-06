import { describe, it, expect, afterEach, vi } from "vitest";

afterEach(() => {
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
  vi.resetModules();
});

describe("widget-cache (web)", () => {
  it("Capacitor 가 없으면 set/get/notifyWidgets 가 no-op (예외 없음)", async () => {
    const { setCache, getCache, notifyWidgets } = await import("./widget-cache");
    await expect(setCache("k", "v")).resolves.toBeUndefined();
    await expect(getCache("k")).resolves.toBeNull();
    await expect(notifyWidgets()).resolves.toBeUndefined();
  });
});

describe("widget-cache (capacitor)", () => {
  it("Capacitor 네이티브면 등록된 플러그인을 호출", async () => {
    const setMock = vi.fn().mockResolvedValue(undefined);
    const getMock = vi.fn().mockResolvedValue({ value: "cached" });
    const notifyMock = vi.fn().mockResolvedValue(undefined);

    (window as unknown as { Capacitor: object }).Capacitor = {
      isNativePlatform: () => true,
      registerPlugin: () => ({
        set: setMock,
        get: getMock,
        notifyWidgets: notifyMock,
      }),
    };

    const { setCache, getCache, notifyWidgets } = await import("./widget-cache");
    await setCache("widget_calendar", JSON.stringify({ events: [] }));
    expect(setMock).toHaveBeenCalledWith({ key: "widget_calendar", value: JSON.stringify({ events: [] }) });

    const v = await getCache("widget_calendar");
    expect(v).toBe("cached");

    await notifyWidgets();
    expect(notifyMock).toHaveBeenCalled();
  });
});

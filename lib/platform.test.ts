import { describe, it, expect, afterEach } from "vitest";
import { isCapacitorNative } from "./platform";

describe("isCapacitorNative", () => {
  afterEach(() => {
    delete (window as unknown as { Capacitor?: unknown }).Capacitor;
  });

  it("window.Capacitor 가 없으면 false (일반 웹 브라우저)", () => {
    expect(isCapacitorNative()).toBe(false);
  });

  it("window.Capacitor.isNativePlatform() === true 이면 true (안드로이드/iOS 앱)", () => {
    (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor = {
      isNativePlatform: () => true,
    };
    expect(isCapacitorNative()).toBe(true);
  });

  it("window.Capacitor.isNativePlatform() === false 이면 false (Capacitor web 모드)", () => {
    (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor = {
      isNativePlatform: () => false,
    };
    expect(isCapacitorNative()).toBe(false);
  });

  it("window.Capacitor 가 isNativePlatform 함수 없는 객체면 false (방어)", () => {
    (window as unknown as { Capacitor: object }).Capacitor = {};
    expect(isCapacitorNative()).toBe(false);
  });
});

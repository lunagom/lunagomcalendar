import { isCapacitorNative } from "@/lib/platform";

type WidgetCachePlugin = {
  set(options: { key: string; value: string }): Promise<void>;
  get(options: { key: string }): Promise<{ value: string | null }>;
  notifyWidgets(): Promise<void>;
};

let pluginRef: WidgetCachePlugin | null = null;

// Capacitor 의 registerPlugin 결과는 Proxy 라서 await 로 감싸면 `.then` 접근이
// Native 메서드 호출 시도로 잡혀 에러 (`WidgetCache.then() is not implemented on android`).
// 따라서 동기 함수로 반환해 호출 측에서 await 없이 받아쓴다.
function getPlugin(): WidgetCachePlugin | null {
  if (!isCapacitorNative()) return null;
  if (pluginRef) return pluginRef;
  // require 대신 동기 require 가 안 되니, 모듈 캐시에 의존. 첫 호출 전에 @capacitor/core 가
  // 이미 다른 곳에서 import 되어 있어야 함 (CapacitorDeepLinkHandler 가 이미 import 중).
  const cap = (window as unknown as {
    Capacitor?: { registerPlugin?: <T>(name: string) => T };
  }).Capacitor;
  if (!cap?.registerPlugin) return null;
  pluginRef = cap.registerPlugin<WidgetCachePlugin>("WidgetCache");
  return pluginRef;
}

export async function setCache(key: string, value: string): Promise<void> {
  const p = getPlugin();
  if (!p) return;
  await p.set({ key, value });
}

export async function getCache(key: string): Promise<string | null> {
  const p = getPlugin();
  if (!p) return null;
  const result = await p.get({ key });
  return result.value;
}

export async function notifyWidgets(): Promise<void> {
  const p = getPlugin();
  if (!p) return;
  await p.notifyWidgets();
}

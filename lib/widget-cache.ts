import { isCapacitorNative } from "@/lib/platform";

type WidgetCachePlugin = {
  set(options: { key: string; value: string }): Promise<void>;
  get(options: { key: string }): Promise<{ value: string | null }>;
  notifyWidgets(): Promise<void>;
};

let pluginRef: WidgetCachePlugin | null = null;

async function getPlugin(): Promise<WidgetCachePlugin | null> {
  if (!isCapacitorNative()) return null;
  if (pluginRef) return pluginRef;
  const { registerPlugin } = await import("@capacitor/core");
  pluginRef = registerPlugin<WidgetCachePlugin>("WidgetCache");
  return pluginRef;
}

export async function setCache(key: string, value: string): Promise<void> {
  const p = await getPlugin();
  if (!p) return;
  await p.set({ key, value });
}

export async function getCache(key: string): Promise<string | null> {
  const p = await getPlugin();
  if (!p) return null;
  const result = await p.get({ key });
  return result.value;
}

export async function notifyWidgets(): Promise<void> {
  const p = await getPlugin();
  if (!p) return;
  await p.notifyWidgets();
}

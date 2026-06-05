/**
 * Capacitor 가 webview 에 inject 하는 window.Capacitor 객체로 네이티브 환경 감지.
 * 일반 웹 브라우저에서는 객체가 없어 항상 false.
 */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap || typeof cap.isNativePlatform !== "function") return false;
  return cap.isNativePlatform();
}

"use client";

import { useEffect } from "react";

import { isCapacitorNative } from "@/lib/platform";

/**
 * Capacitor 네이티브 앱에서 OAuth deep link 콜백 처리.
 * 시스템 크롬 → 구글 로그인 → /auth/callback URL → 안드로이드가 우리 앱으로 라우팅 →
 * 여기서 받아서 webview 를 해당 URL 로 이동시킴 → callback route 가 세션 교환.
 */
export function CapacitorDeepLinkHandler() {
  useEffect(() => {
    if (!isCapacitorNative()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const [{ App }, { Browser }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/browser"),
      ]);

      const handle = await App.addListener("appUrlOpen", async (event) => {
        const url = new URL(event.url);
        if (!url.pathname.startsWith("/auth/callback")) return;
        await Browser.close();
        window.location.replace(url.pathname + url.search);
      });

      cleanup = () => {
        handle.remove();
      };
    })();

    return () => {
      cleanup?.();
    };
  }, []);

  return null;
}

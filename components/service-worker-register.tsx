"use client";

import { useEffect } from "react";

/**
 * Serwist 가 빌드한 /sw.js 를 브라우저에 등록.
 * dev 환경 (`next dev`) 에서는 Serwist 가 disable 되어 /sw.js 가 없으므로 skip.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[SW] registration failed", err);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}

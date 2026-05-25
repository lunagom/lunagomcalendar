"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: 24,
          backgroundColor: "#0A0A0A",
          color: "#FAFAFA",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>
          죄송합니다. 문제가 발생했어요.
        </h1>
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          잠시 후 다시 시도해주세요. 문제가 계속되면 새로고침을 눌러주세요.
        </p>
      </body>
    </html>
  );
}

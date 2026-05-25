import * as Sentry from "@sentry/nextjs";

// 브라우저 측 Sentry init. DSN 없으면 자동 no-op — 로컬 dev 안전.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
});

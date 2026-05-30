import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    // Windows + Next.js dev 의 .next/cache/webpack 파일 잠금 충돌을 회피.
    // 디스크 캐시를 끄고 메모리 캐시만 사용 — dev 핫 리로드는 정상.
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

// Serwist (Service Worker) 래핑 — prod 빌드에서만 sw.js 생성.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

// Sentry 래핑 — DSN 없으면 소스맵 업로드 등 모두 no-op.
// SENTRY_AUTH_TOKEN 이 있을 때만 빌드 시 소스맵 업로드.
export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  disableLogger: true,
  hideSourceMaps: true,
  widenClientFileUpload: true,
});

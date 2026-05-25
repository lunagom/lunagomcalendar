// Next 14 표준 — server/edge 의 register 훅.
// 빌드 시점에 runtime 별로 알맞은 Sentry config 가 로드됨.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

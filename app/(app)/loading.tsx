// app/(app)/loading.tsx
// 모든 (app) 하위 페이지의 공통 로딩 스켈레톤.
// 페이지 진입 ~ 데이터 fetch 사이 깜박임 방지용. Next.js 가 데이터 로드 끝나면
// 자동으로 실제 페이지로 교체.

export default function Loading() {
  return (
    <div className="px-4 py-6 space-y-4 max-w-7xl mx-auto animate-pulse">
      <div className="h-7 w-40 rounded bg-muted" />
      <div className="h-4 w-64 rounded bg-muted/70" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted/60" />
        ))}
      </div>
    </div>
  );
}

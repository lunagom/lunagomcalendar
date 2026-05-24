"use client";

import { useEffect, useState } from "react";

/**
 * 작은 매치 미디어 훅. SSR/첫 렌더 시 false 반환 — 컴포넌트가 client 에서만
 * 의미 있게 분기되는 곳(예: 클릭 시 뜨는 모달)에서 사용 권장.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

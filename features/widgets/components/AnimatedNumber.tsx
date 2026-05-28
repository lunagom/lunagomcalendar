"use client";

import { useEffect, useState } from "react";

type Props = {
  /** 최종 표시할 값 (정수). */
  value: number;
  /** 단위 (예: "원"). 기본 빈 문자열. */
  unit?: string;
  /** 애니메이션 길이 ms. 기본 600. */
  duration?: number;
  /** 클래스. */
  className?: string;
};

/**
 * 0 에서 value 까지 부드럽게 카운트 업.
 * prefers-reduced-motion 시 즉시 표시.
 */
export function AnimatedNumber({
  value,
  unit = "",
  duration = 600,
  className,
}: Props) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={className}>
      {display.toLocaleString("ko-KR")}
      {unit}
    </span>
  );
}

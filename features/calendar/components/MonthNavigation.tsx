// features/calendar/components/MonthNavigation.tsx
"use client";
import { useEffect, useRef } from "react";

type Props = {
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  /** ref 로 받는 그리드 컨테이너 — 스와이프 감지 영역. */
  targetRef: React.RefObject<HTMLElement>;
};

export function MonthNavigation({ onPrev, onNext, onToday, targetRef }: Props) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  // 키보드
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        onToday();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPrev, onNext, onToday]);

  // 스와이프
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (startX.current == null || startY.current == null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (Math.abs(dx) > 50 && Math.abs(dy) < 30) {
        if (dx > 0) onPrev();
        else onNext();
      }
      startX.current = null;
      startY.current = null;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onPrev, onNext, targetRef]);

  return null; // 입력 핸들러만 등록
}

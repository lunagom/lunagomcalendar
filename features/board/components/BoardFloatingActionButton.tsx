"use client";

import { Plus } from "lucide-react";

type Props = {
  onClick: () => void;
  disabled: boolean;
};

/**
 * 모바일 전용 + 새 글 FAB. 데스크탑은 헤더 안 버튼 사용.
 */
export function BoardFloatingActionButton({ onClick, disabled }: Props) {
  if (disabled) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform flex items-center justify-center"
      aria-label="새 글 작성"
    >
      <Plus className="h-6 w-6" strokeWidth={2.2} />
    </button>
  );
}

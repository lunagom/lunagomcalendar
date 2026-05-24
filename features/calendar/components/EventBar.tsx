// features/calendar/components/EventBar.tsx
"use client";
import { getTextColor } from "@/lib/colors";

type Props = {
  title: string;
  emoji?: string | null;
  color: string; // hex
  onClick?: () => void;
  /** true 면 텍스트 truncate 안 하고 줄바꿈 (팝업에서 사용) */
  fullText?: boolean;
};

export function EventBar({ title, emoji, color, onClick, fullText }: Props) {
  const textColor = getTextColor(color);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`w-full text-left px-1.5 py-1 rounded text-[10px] sm:text-[11px] sm:px-2 hover:opacity-80 transition ${
        fullText ? "whitespace-normal break-words py-1.5" : "truncate"
      }`}
      style={{ backgroundColor: color, color: textColor }}
    >
      {emoji ? `${emoji} ` : ""}
      {title}
    </button>
  );
}

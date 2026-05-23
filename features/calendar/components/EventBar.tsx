// features/calendar/components/EventBar.tsx
"use client";
import { getTextColor } from "@/lib/colors";

type Props = {
  title: string;
  emoji?: string | null;
  color: string; // hex
  onClick?: () => void;
};

export function EventBar({ title, emoji, color, onClick }: Props) {
  const textColor = getTextColor(color);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate hover:opacity-80 transition"
      style={{ backgroundColor: color, color: textColor }}
    >
      {emoji ? `${emoji} ` : ""}
      {title}
    </button>
  );
}

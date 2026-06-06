// features/calendar/components/EventBar.tsx
"use client";
import { getTextColor } from "@/lib/colors";

export type SpanRole = "single" | "start" | "middle" | "end";

type Props = {
  title: string;
  emoji?: string | null;
  color: string; // hex
  onClick?: () => void;
  /** true 면 텍스트 truncate 안 하고 줄바꿈 (팝업에서 사용) */
  fullText?: boolean;
  /** 멀티데이 이벤트의 셀별 위치. 기본 'single'. */
  spanRole?: SpanRole;
};

export function EventBar({
  title,
  emoji,
  color,
  onClick,
  fullText,
  spanRole = "single",
}: Props) {
  const textColor = getTextColor(color);
  // start 와 single 에만 텍스트 표시. middle / end 셀은 빈 막대 (시각적 연속성)
  const showText = spanRole === "single" || spanRole === "start";
  const corner =
    spanRole === "single"
      ? "rounded"
      : spanRole === "start"
        ? "rounded-l"
        : spanRole === "end"
          ? "rounded-r"
          : "rounded-none";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`w-full text-left px-1 py-0.5 text-[8px] sm:text-[9px] sm:px-1.5 hover:opacity-80 transition ${corner} ${
        fullText ? "whitespace-normal break-words py-1.5" : "overflow-hidden whitespace-nowrap [text-overflow:clip]"
      }`}
      style={{ backgroundColor: color, color: textColor }}
    >
      {showText ? (
        <>
          {emoji ? `${emoji} ` : ""}
          {title}
        </>
      ) : (
        " "
      )}
    </button>
  );
}

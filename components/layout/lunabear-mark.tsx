import { cn } from "@/lib/utils";

/**
 * 루나곰 — 메인 브랜드 마크.
 * 작은 곰 얼굴 + 워드마크. 두 색만 사용 (primary + currentColor).
 * size: 사이즈 프리셋. 사이드바엔 'md', 좁은 곳엔 'sm'.
 */
export function LunabearMark({
  size = "md",
  showWordmark = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}) {
  const iconPx = size === "sm" ? 22 : size === "lg" ? 32 : 26;
  const wordPx = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BearGlyph width={iconPx} height={iconPx} />
      {showWordmark && (
        <span className={cn("font-bold tracking-tight", wordPx)}>
          루나곰
        </span>
      )}
    </span>
  );
}

function BearGlyph({ width, height }: { width: number; height: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* 귀 */}
      <circle cx="8.5" cy="9" r="3.6" fill="hsl(var(--primary))" />
      <circle cx="23.5" cy="9" r="3.6" fill="hsl(var(--primary))" />
      {/* 얼굴 */}
      <circle cx="16" cy="18" r="9.2" fill="hsl(var(--primary))" />
      {/* 눈 */}
      <circle cx="12.6" cy="16.8" r="1.15" fill="hsl(var(--primary-foreground))" />
      <circle cx="19.4" cy="16.8" r="1.15" fill="hsl(var(--primary-foreground))" />
      {/* 코 */}
      <ellipse cx="16" cy="20.2" rx="1.4" ry="1.1" fill="hsl(var(--primary-foreground))" />
    </svg>
  );
}

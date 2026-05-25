import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 루나곰 — 메인 브랜드 마크.
 * 곰 캐릭터 이미지(public/lunabear.png, 투명 배경) + 워드마크. 클릭 시 홈("/") 이동.
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
  // 일러스트에 디테일(스웨터/하트/스파클) 이 있어서 좀 크게 봐야 살아남.
  const iconPx = size === "sm" ? 44 : size === "lg" ? 64 : 52;
  const wordPx =
    size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <Link
      href="/"
      aria-label="홈으로"
      className={cn(
        "inline-flex items-center gap-2 transition-opacity hover:opacity-80",
        className,
      )}
    >
      <Image
        src="/lunabear.png"
        alt="루나곰"
        width={iconPx}
        height={iconPx}
        priority
        className="shrink-0"
      />
      {showWordmark && (
        <span className={cn("font-bold tracking-tight", wordPx)}>
          루나곰 캘린더
        </span>
      )}
    </Link>
  );
}

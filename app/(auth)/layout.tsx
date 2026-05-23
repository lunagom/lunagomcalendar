import Link from "next/link";

import { LunabearMark } from "@/components/layout/lunabear-mark";

/**
 * 로그인 / 회원가입 화면용 단순 레이아웃.
 * 사이드바·하단 탭바 없이 가운데 정렬 카드 한 장.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <header className="mb-7 flex flex-col items-center text-center">
          <Link href="/" aria-label="루나곰 캘린더 홈">
            <LunabearMark size="lg" showWordmark={false} />
          </Link>
          <p className="mt-3 text-lg font-semibold">루나곰 캘린더</p>
          <p className="mt-1 text-sm text-muted-foreground">
            내 일정, 내 돈, 내 사람들 — 한 화면에서.
          </p>
        </header>
        {children}
        <footer className="mt-8 text-center text-xs text-muted-foreground">
          © 2026 루나곰 캘린더
        </footer>
      </div>
    </div>
  );
}

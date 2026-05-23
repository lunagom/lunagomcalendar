"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { LunabearMark } from "./lunabear-mark";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import type { AppShellUser } from "./app-shell";

/**
 * 메인 영역 상단 헤더.
 * - 모바일: 좌측 로고 (사이드바 대체) + 우측 액션
 * - 데스크톱: 검색 입력 + 우측 액션
 * 검색은 캘린더 구현 단계에서 cmdk 등으로 교체.
 */
export function Header({ user }: { user: AppShellUser }) {
  return (
    <header
      className="
        sticky top-0 z-30 flex h-14 items-center gap-3
        border-b border-border bg-background/85 backdrop-blur
        px-4 md:px-6
      "
    >
      <div className="md:hidden">
        <LunabearMark size="sm" />
      </div>

      <div className="ml-auto md:ml-0 md:flex-1 md:max-w-md">
        <label className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            disabled
            placeholder="검색 — 일정, 지출, 사람 (준비 중)"
            className="
              h-9 pl-9 pr-3 text-sm
              bg-muted/50 border-transparent
              hover:bg-muted focus-visible:bg-card focus-visible:border-border
              placeholder:text-muted-foreground/80
              hidden sm:flex
            "
          />
        </label>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}

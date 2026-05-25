"use client";

import { Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { LunabearMark } from "./lunabear-mark";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { SidebarBody } from "./sidebar";
import { useMobileDrawerStore } from "./mobile-drawer-store";
import type { AppShellUser } from "./app-shell";
import type { CalendarRow } from "@/features/calendar/server/queries";

/**
 * 메인 영역 상단 헤더.
 * - 모바일: 햄버거(드로어) + 로고 좌측, 우측 액션
 * - 데스크톱: 검색 입력 + 우측 액션 (햄버거는 숨김)
 */
export function Header({
  user,
  calendars,
  unreadBoardCount,
}: {
  user: AppShellUser;
  calendars: CalendarRow[];
  unreadBoardCount: number;
}) {
  const drawerOpen = useMobileDrawerStore((s) => s.open);
  const setDrawerOpen = useMobileDrawerStore((s) => s.setOpen);

  return (
    <header
      className="
        sticky top-0 z-30 flex h-14 items-center gap-2
        border-b border-border bg-background/85 backdrop-blur
        px-3 md:px-6
      "
    >
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9"
          aria-label="메뉴 열기"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <SheetContent className="px-4 py-5">
          <SheetTitle className="sr-only">메뉴</SheetTitle>
          <SheetDescription className="sr-only">
            캘린더, 가계부, 공유 등 주요 메뉴
          </SheetDescription>
          <SidebarBody
            user={user}
            calendars={calendars}
            unreadBoardCount={unreadBoardCount}
            onNavigate={() => setDrawerOpen(false)}
          />
        </SheetContent>
      </Sheet>

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

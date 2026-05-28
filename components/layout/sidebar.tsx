"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { navItems } from "@/lib/nav";
import { LunabearMark } from "./lunabear-mark";
import { SidebarUserCard } from "./sidebar-user-card";
import type { AppShellUser } from "./app-shell";
import type { CalendarRow } from "@/features/calendar/server/queries";
import { EventModal } from "@/features/calendar/components/EventModal";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 사이드바 내용 — 데스크톱 좌측 사이드바와 모바일 드로어가 공유.
 * `onNavigate` 는 모바일 드로어에서 메뉴 이동 / EventModal 닫힘 시 호출되어 시트를 닫는다.
 */
export function SidebarBody({
  user,
  calendars,
  unreadBoardCount,
  onNavigate,
}: {
  user: AppShellUser;
  calendars: CalendarRow[];
  unreadBoardCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = calendars.length > 0;

  return (
    <>
      {/* 로고 */}
      <div className="px-2 pb-4">
        <LunabearMark size="md" />
        <p className="mt-1 px-0.5 text-xs text-muted-foreground">
          캘린더 · 가계부 · 공유
        </p>
      </div>

      {/* 새 일정 — 클릭 시 EventModal 오픈 (오늘 날짜 prefill) */}
      <Button
        size="sm"
        className="mb-2 h-9 w-full justify-start rounded-lg gap-2 font-medium"
        disabled={!canCreate}
        aria-label="새 일정 추가"
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="h-4 w-4" strokeWidth={1.8} />새 일정
      </Button>

      {/* 메뉴 */}
      <nav className="flex flex-col gap-0.5">
        <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          메뉴
        </p>
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const showBadge = item.href === "/board" && unreadBoardCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
                strokeWidth={1.8}
              />
              <span>{item.label}</span>
              {showBadge && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {unreadBoardCount > 99 ? "99+" : unreadBoardCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <SidebarUserCard user={user} />

      {canCreate && (
        <EventModal
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) onNavigate?.();
          }}
          calendars={calendars}
          defaultDate={todayIso()}
        />
      )}
    </>
  );
}

/**
 * 데스크톱 좌측 사이드바. md 이상에서만 노출.
 * 모바일에서는 Header 의 햄버거 → MobileDrawer 가 동일한 SidebarBody 를 렌더한다.
 */
export function Sidebar({
  user,
  calendars,
  unreadBoardCount,
}: {
  user: AppShellUser;
  calendars: CalendarRow[];
  unreadBoardCount: number;
}) {
  return (
    <aside
      className={cn(
        "hidden md:flex md:w-60 lg:w-64 shrink-0",
        "flex-col gap-2 border-r border-sidebar-border bg-sidebar",
        "px-4 py-5"
      )}
    >
      <SidebarBody
        user={user}
        calendars={calendars}
        unreadBoardCount={unreadBoardCount}
      />
    </aside>
  );
}

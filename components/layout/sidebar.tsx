"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { navItems } from "@/lib/nav";
import { LunabearMark } from "./lunabear-mark";
import { SidebarUserCard } from "./sidebar-user-card";
import type { AppShellUser } from "./app-shell";

/**
 * 데스크톱 좌측 사이드바.
 * 모바일에서는 하단 탭바(MobileTabbar)로 대체되므로 md: 이상에서만 노출.
 */
export function Sidebar({ user }: { user: AppShellUser }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden md:flex md:w-60 lg:w-64 shrink-0",
        "flex-col gap-2 border-r border-sidebar-border bg-sidebar",
        "px-4 py-5"
      )}
    >
      {/* 로고 */}
      <div className="px-2 pb-4">
        <LunabearMark size="md" />
        <p className="mt-1 px-0.5 text-xs text-muted-foreground">
          캘린더 · 가계부 · 공유
        </p>
      </div>

      {/* 새 일정 — 1·2단계엔 비활성, 캘린더 단계에서 모달 */}
      <Button
        size="sm"
        className="mb-2 h-9 w-full justify-start rounded-lg gap-2 font-medium"
        disabled
        aria-label="새 일정 추가 (준비 중)"
      >
        <Plus className="h-4 w-4" />새 일정
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
          return (
            <Link
              key={item.href}
              href={item.href}
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
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <SidebarUserCard user={user} />
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { mobileTabItems } from "@/lib/nav";
import { useMobileDrawerStore } from "./mobile-drawer-store";

/**
 * 모바일 하단 탭바. md 미만에서만 노출.
 * 5개 고정: 홈 / 캘린더 / 할 일 / 가계부 / 더보기.
 * "더보기" 는 헤더 햄버거와 같은 드로어를 연다.
 * iOS 노치 대응을 위해 env(safe-area-inset-bottom) 적용.
 */
export function MobileTabbar() {
  const pathname = usePathname();
  const setDrawerOpen = useMobileDrawerStore((s) => s.setOpen);

  return (
    <nav
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-40",
        "border-t border-border bg-background/95 backdrop-blur",
        "pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      )}
      aria-label="하단 메뉴"
    >
      <ul className="grid grid-cols-5">
        {mobileTabItems.map((item) => {
          const Icon = item.icon;

          if (item.kind === "more") {
            return (
              <li key="more">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="더보기 메뉴 열기"
                >
                  <Icon
                    className="h-[20px] w-[20px] text-muted-foreground"
                    strokeWidth={1.8}
                  />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          }

          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                  active
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-[20px] w-[20px]",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

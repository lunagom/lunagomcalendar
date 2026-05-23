"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { navItems } from "@/lib/nav";

/**
 * 모바일 하단 탭바. md 미만에서만 노출.
 * iOS 노치 대응을 위해 env(safe-area-inset-bottom) 적용.
 */
export function MobileTabbar() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-40",
        "border-t border-border bg-background/95 backdrop-blur",
        "pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      )}
      aria-label="하단 메뉴"
    >
      <ul className="grid grid-cols-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
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

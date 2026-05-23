import { LogOut } from "lucide-react";

import { signOut } from "@/app/auth/actions";
import type { AppShellUser } from "./app-shell";

/**
 * 사이드바 하단 — 현재 로그인 사용자 카드.
 * 닉네임(또는 이메일 앞부분) + 이메일 + 로그아웃.
 */
export function SidebarUserCard({ user }: { user: AppShellUser }) {
  const displayName = user.nickname?.trim() || user.email.split("@")[0];
  const initial = (displayName[0] ?? "?").toUpperCase();

  return (
    <div className="mt-auto rounded-xl border border-sidebar-border bg-card p-2.5">
      <div className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="로그아웃"
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

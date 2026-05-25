import { Sidebar } from "./sidebar";
import { MobileTabbar } from "./mobile-tabbar";
import { Header } from "./header";
import { RealtimeEventsListener } from "@/features/social/components/RealtimeEventsListener";
import type { CalendarRow } from "@/features/calendar/server/queries";

export type AppShellUser = {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
};

/**
 * 전체 화면 골격.
 *   ┌──────────────────────────────┐
 *   │ Sidebar (md+) │  Header      │
 *   │               │──────────────│
 *   │               │  Main        │
 *   └──────────────────────────────┘
 *   모바일은 Sidebar 자리에 아무것도 없고 하단 MobileTabbar.
 */
export function AppShell({
  user,
  calendars,
  unreadBoardCount,
  children,
}: {
  user: AppShellUser;
  calendars: CalendarRow[];
  unreadBoardCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar
        user={user}
        calendars={calendars}
        unreadBoardCount={unreadBoardCount}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          calendars={calendars}
          unreadBoardCount={unreadBoardCount}
        />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </div>
      <MobileTabbar />
      <RealtimeEventsListener />
    </div>
  );
}

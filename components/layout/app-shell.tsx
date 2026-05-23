import { Sidebar } from "./sidebar";
import { MobileTabbar } from "./mobile-tabbar";
import { Header } from "./header";

/**
 * 전체 화면 골격.
 *   ┌──────────────────────────────┐
 *   │ Sidebar (md+) │  Header      │
 *   │               │──────────────│
 *   │               │  Main        │
 *   └──────────────────────────────┘
 *   모바일은 Sidebar 자리에 아무것도 없고 하단 MobileTabbar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </div>
      <MobileTabbar />
    </div>
  );
}

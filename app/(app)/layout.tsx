import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { getCalendars } from "@/features/calendar/server/queries";
import { getUnreadBoardCount } from "@/features/board/server/queries";
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from "@/features/notifications/server/queries";
import { seedDailyNotifications } from "@/features/notifications/server/actions";

/**
 * 로그인 사용자만 접근하는 메인 앱 영역.
 * 미들웨어가 1차 차단하지만, 서버 컴포넌트에서도 한 번 더 확인.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // profile + 캘린더 — 사이드바·헤더·새 일정 모달에서 사용
  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  // 진입 시 일정·구독 묶음 알림 (하루 1번, dedupe). fire-and-forget — page 렌더 안 막음.
  void seedDailyNotifications();

  const [
    calendars,
    unreadBoardCount,
    recentNotifications,
    unreadNotificationCount,
  ] = await Promise.all([
    getCalendars(),
    getUnreadBoardCount(),
    getRecentNotifications(10),
    getUnreadNotificationCount(),
  ]);

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email ?? "",
        nickname: profile?.nickname ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      }}
      calendars={calendars}
      unreadBoardCount={unreadBoardCount}
      recentNotifications={recentNotifications}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </AppShell>
  );
}

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { getCalendars } from "@/features/calendar/server/queries";
import { getUnreadBoardCount } from "@/features/board/server/queries";

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
  const [calendars, unreadBoardCount] = await Promise.all([
    getCalendars(),
    getUnreadBoardCount(),
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
    >
      {children}
    </AppShell>
  );
}

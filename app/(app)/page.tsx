import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getCalendars } from "@/features/calendar/server/queries";
import {
  WIDGET_ITEMS,
  normalizeHidden,
  type WidgetKey,
} from "@/features/widgets/lib/items";
import { PageGreeting } from "@/features/widgets/components/PageGreeting";
import { QuickActions } from "@/features/widgets/components/QuickActions";
import { MiniWeekStrip } from "@/features/widgets/components/MiniWeekStrip";
import { AnimatedWidgetCard } from "@/features/widgets/components/AnimatedWidgetCard";
import { TodayEventsWidget } from "@/features/widgets/components/TodayEventsWidget";
import { UpcomingEventsWidget } from "@/features/widgets/components/UpcomingEventsWidget";
import { MonthSummaryWidget } from "@/features/widgets/components/MonthSummaryWidget";
import { TodayTodosWidget } from "@/features/widgets/components/TodayTodosWidget";
import { IncomingInvitesWidget } from "@/features/widgets/components/IncomingInvitesWidget";

export const metadata = { title: "홈" };

/**
 * 그리드 안에 들어가는 위젯들. invites 는 슬림 배너 형식으로 그리드 밖에 별도 배치.
 */
const GRID_WIDGET_COMPONENTS: Partial<Record<WidgetKey, React.ComponentType>> = {
  today_events: TodayEventsWidget,
  upcoming: UpcomingEventsWidget,
  month_summary: MonthSummaryWidget,
  today_todos: TodayTodosWidget,
};

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [hidden, calendars, profile] = await Promise.all([
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("widget_visibility")
        .eq("id", user.id)
        .maybeSingle();
      return normalizeHidden(data?.widget_visibility);
    })(),
    getCalendars(),
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    })(),
  ]);

  const showInvites = !hidden.includes("invites");
  const gridVisible = WIDGET_ITEMS.filter(
    (w) => !hidden.includes(w.key) && w.key !== "invites",
  );

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      <PageGreeting
        nickname={profile?.nickname ?? null}
        email={user.email ?? ""}
      />
      <QuickActions calendars={calendars} />
      <MiniWeekStrip />
      {showInvites && <IncomingInvitesWidget />}

      {gridVisible.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          메인 위젯이 모두 꺼져있어요.{" "}
          <Link href="/settings" className="text-primary hover:underline">
            설정에서 켜기
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {gridVisible.map((w, i) => {
            const C = GRID_WIDGET_COMPONENTS[w.key];
            if (!C) return null;
            return (
              <AnimatedWidgetCard key={w.key} index={i}>
                <C />
              </AnimatedWidgetCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

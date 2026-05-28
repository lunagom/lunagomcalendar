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

const WIDGET_COMPONENTS: Record<WidgetKey, React.ComponentType> = {
  today_events: TodayEventsWidget,
  upcoming: UpcomingEventsWidget,
  month_summary: MonthSummaryWidget,
  today_todos: TodayTodosWidget,
  invites: IncomingInvitesWidget,
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

  const visible = WIDGET_ITEMS.filter((w) => !hidden.includes(w.key));

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6 space-y-6">
      <PageGreeting
        nickname={profile?.nickname ?? null}
        email={user.email ?? ""}
      />
      <QuickActions calendars={calendars} />
      <MiniWeekStrip />

      {visible.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          메인 위젯이 모두 꺼져있어요.{" "}
          <Link href="/settings" className="text-primary hover:underline">
            설정에서 켜기
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((w, i) => {
            const C = WIDGET_COMPONENTS[w.key];
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

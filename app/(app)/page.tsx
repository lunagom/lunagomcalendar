import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  WIDGET_ITEMS,
  normalizeHidden,
  type WidgetKey,
} from "@/features/widgets/lib/items";
import { TodayEventsWidget } from "@/features/widgets/components/TodayEventsWidget";
import { UpcomingEventsWidget } from "@/features/widgets/components/UpcomingEventsWidget";
import { MonthSummaryWidget } from "@/features/widgets/components/MonthSummaryWidget";
import { MonthExpenseWidget } from "@/features/widgets/components/MonthExpenseWidget";
import { CategoryExpenseWidget } from "@/features/widgets/components/CategoryExpenseWidget";
import { TodayTodosWidget } from "@/features/widgets/components/TodayTodosWidget";
import { IncomingInvitesWidget } from "@/features/widgets/components/IncomingInvitesWidget";

export const metadata = { title: "홈" };

const WIDGET_COMPONENTS: Record<WidgetKey, React.ComponentType> = {
  today_events: TodayEventsWidget,
  upcoming: UpcomingEventsWidget,
  month_summary: MonthSummaryWidget,
  month_expense: MonthExpenseWidget,
  category: CategoryExpenseWidget,
  today_todos: TodayTodosWidget,
  invites: IncomingInvitesWidget,
};

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // (app)/layout 에서 이미 인증 체크 — 여기서는 fail-safe

  const hidden = await (async () => {
    if (!user) return [] as WidgetKey[];
    const { data } = await supabase
      .from("profiles")
      .select("widget_visibility")
      .eq("id", user.id)
      .maybeSingle();
    return normalizeHidden(data?.widget_visibility);
  })();

  const visible = WIDGET_ITEMS.filter((w) => !hidden.includes(w.key));

  if (visible.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl p-6 text-center">
        <p className="text-muted-foreground">
          메인 위젯이 모두 꺼져있어요.{" "}
          <Link href="/settings" className="text-primary hover:underline">
            설정에서 켜기
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map((w) => {
          const C = WIDGET_COMPONENTS[w.key];
          return <C key={w.key} />;
        })}
      </div>
    </div>
  );
}

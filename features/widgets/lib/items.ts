// features/widgets/lib/items.ts
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CalendarDays,
  CheckSquare,
  Users,
  TrendingUp,
} from "lucide-react";

export type WidgetKey =
  | "today_events"
  | "upcoming"
  | "month_summary"
  | "today_todos"
  | "invites";

export type WidgetMeta = { key: WidgetKey; label: string; icon: LucideIcon };

export const WIDGET_ITEMS: WidgetMeta[] = [
  { key: "today_events", label: "오늘의 일정", icon: Calendar },
  { key: "upcoming", label: "다가오는 일정", icon: CalendarDays },
  { key: "month_summary", label: "이번 달 월 요약", icon: TrendingUp },
  { key: "today_todos", label: "오늘 할 일", icon: CheckSquare },
  { key: "invites", label: "받은 초대", icon: Users },
];

export const WIDGET_KEYS: WidgetKey[] = WIDGET_ITEMS.map((w) => w.key);

/** hidden 배열을 안전하게 정규화 — 알 수 없는 key 는 무시. */
export function normalizeHidden(raw: unknown): WidgetKey[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (k): k is WidgetKey =>
      typeof k === "string" && (WIDGET_KEYS as string[]).includes(k),
  );
}

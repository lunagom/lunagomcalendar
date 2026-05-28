"use client";

import {
  Bell,
  Calendar,
  CreditCard,
  Heart,
  HeartCrack,
  HeartHandshake,
  MessageSquare,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { NotificationRow } from "../server/queries";

const ICON_MAP: Record<string, LucideIcon> = {
  event_summary: Calendar,
  subscription_due: CreditCard,
  board_new_post: MessageSquare,
  board_new_comment: MessageSquare,
  calendar_invite: Users,
  board_like: Heart,
  partnership_invite: HeartHandshake,
  partnership_accepted: Heart,
  partnership_ended: HeartCrack,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

type Props = {
  item: NotificationRow;
  onClick: () => void;
};

export function NotificationItem({ item, onClick }: Props) {
  const Icon = ICON_MAP[item.type] ?? Bell;
  const unread = !item.read_at;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-muted/60 ${
        unread ? "bg-primary/5" : ""
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-medium">{item.title}</p>
          {unread && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden
            />
          )}
        </div>
        {item.body && (
          <p className="truncate text-xs text-muted-foreground">{item.body}</p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {relativeTime(item.created_at)}
        </p>
      </div>
    </button>
  );
}

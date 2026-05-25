"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationItem } from "./NotificationItem";
import { markAllAsRead, markAsRead } from "../server/actions";
import type { NotificationRow } from "../server/queries";

type Props = {
  items: NotificationRow[];
  unreadCount: number;
};

export function NotificationsBell({ items, unreadCount }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleClick = (item: NotificationRow) => {
    startTransition(async () => {
      if (!item.read_at) await markAsRead(item.id);
      if (item.link) router.push(item.link);
      router.refresh();
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllAsRead();
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="알림"
          className="relative h-9 w-9 rounded-lg"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">알림</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs text-primary hover:underline"
            >
              모두 읽음
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            새 알림이 없어요
          </p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                item={n}
                onClick={() => handleClick(n)}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

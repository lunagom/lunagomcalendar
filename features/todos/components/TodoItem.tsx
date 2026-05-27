// features/todos/components/TodoItem.tsx
"use client";
import { useTransition } from "react";
import { CalendarClock, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toggleTodo, deleteTodo, moveTodo } from "../server/actions";
import type { TaskRow } from "../server/queries";

type Props = {
  todo: TaskRow;
  /** 오늘 날짜 (YYYY-MM-DD) — 밀림 일수 계산 + 이동 기준. */
  todayIso: string;
};

export function TodoItem({ todo, todayIso }: Props) {
  const [pending, startTransition] = useTransition();
  const done = !!todo.completed_at;
  const daysOverdue = daysBetween(todo.scheduled_date, todayIso);

  const handleToggle = (v: boolean) => {
    startTransition(async () => {
      const r = await toggleTodo(todo.id, v);
      if (!r.ok) toast.error(r.error);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const r = await deleteTodo(todo.id);
      if (!r.ok) toast.error(r.error);
    });
  };

  const handleMoveToToday = () => {
    startTransition(async () => {
      const r = await moveTodo(todo.id, todayIso);
      if (!r.ok) toast.error(r.error);
      else toast.success("오늘로 이동됨");
    });
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/30 group">
      <Checkbox checked={done} onCheckedChange={(v) => handleToggle(Boolean(v))} />
      <span
        className={`flex-1 text-sm truncate flex items-center gap-1 ${
          done ? "line-through text-muted-foreground" : ""
        }`}
      >
        {todo.emoji ? `${todo.emoji} ` : ""}
        {todo.title}
        {todo.linked_event_id && (
          <CalendarClock
            className="h-3 w-3 shrink-0 text-muted-foreground"
            aria-label="일정 연결됨"
          />
        )}
      </span>
      {daysOverdue > 0 && !done && (
        <span className="text-[10px] text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-px rounded-full">
          {daysOverdue}일 밀림
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {daysOverdue > 0 && (
            <DropdownMenuItem onSelect={handleMoveToToday} disabled={pending}>
              오늘로 이동
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={handleDelete}
            disabled={pending}
            className="text-red-600"
          >
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  const diff = (b.getTime() - a.getTime()) / 86400000;
  return Math.round(diff);
}

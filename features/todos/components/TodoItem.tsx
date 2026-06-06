// features/todos/components/TodoItem.tsx
"use client";
import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { CalendarClock, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toggleTodo, deleteTodo, moveTodo, updateTodo } from "../server/actions";
import type { TaskRow } from "../server/queries";

type Props = {
  todo: TaskRow;
  /** 오늘 날짜 (YYYY-MM-DD) — 밀림 일수 계산 + 이동 기준. */
  todayIso: string;
};

export function TodoItem({ todo, todayIso }: Props) {
  const [pending, startTransition] = useTransition();
  const serverDone = !!todo.completed_at;
  // 체크박스 즉시 반응 — 서버 응답 기다리지 않고 로컬 state 로 먼저 반영.
  // 서버 props 가 따라오면 override 해제.
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const done = optimisticDone ?? serverDone;
  useEffect(() => {
    if (optimisticDone !== null && optimisticDone === serverDone) {
      setOptimisticDone(null);
    }
  }, [serverDone, optimisticDone]);

  const daysOverdue = daysBetween(todo.scheduled_date, todayIso);

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);

  const handleEditStart = () => {
    setDraftTitle(todo.title);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setDraftTitle(todo.title);
  };

  const handleEditSave = () => {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === todo.title) {
      setIsEditing(false);
      setDraftTitle(todo.title);
      return;
    }
    startTransition(async () => {
      const r = await updateTodo(todo.id, { title: trimmed });
      if (r.ok) {
        setIsEditing(false);
        toast.success("할 일이 수정됐어요");
      } else {
        toast.error(r.error);
      }
    });
  };

  const handleToggle = (v: boolean) => {
    setOptimisticDone(v);
    startTransition(async () => {
      const r = await toggleTodo(todo.id, v);
      if (!r.ok) {
        toast.error(r.error);
        setOptimisticDone(null); // 실패 시 서버 값으로 복귀
      }
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
      <motion.div
        animate={done ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Checkbox checked={done} onCheckedChange={(v) => handleToggle(Boolean(v))} />
      </motion.div>
      {isEditing ? (
        <input
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={handleEditSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleEditSave();
            else if (e.key === "Escape") handleEditCancel();
          }}
          autoFocus
          className="flex-1 min-w-0 bg-transparent border-b border-primary outline-none text-sm py-0.5"
          aria-label="할 일 제목 수정"
        />
      ) : (
        <span
          onDoubleClick={handleEditStart}
          className={`flex-1 text-sm truncate flex items-center gap-1 transition-all duration-200 cursor-text ${
            done ? "line-through text-muted-foreground opacity-70" : ""
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
      )}
      {daysOverdue > 0 && !done && (
        <span className="text-[10px] text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-px rounded-full">
          {daysOverdue}일 밀림
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
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

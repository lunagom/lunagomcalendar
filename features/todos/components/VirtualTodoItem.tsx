// features/todos/components/VirtualTodoItem.tsx
"use client";

import { useTransition } from "react";
import { Repeat } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { materializeRecurringTodo } from "../server/actions";
import type { VirtualTodo } from "../lib/recurrence";

type Props = {
  virtual: VirtualTodo;
};

/**
 * 가상 반복 카드. 체크하면 materialize → 실제 row 생성 (완료 상태로).
 * 같은 날 동일 제목의 실제 row 가 생기면 다음 unfold 에서 suppress.
 */
export function VirtualTodoItem({ virtual }: Props) {
  const [pending, startTransition] = useTransition();

  const handleCheck = (v: boolean) => {
    if (!v) return;
    startTransition(async () => {
      const r = await materializeRecurringTodo(
        virtual.parentId,
        virtual.scheduled_date,
      );
      if (!r.ok) toast.error(r.error);
    });
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/30 opacity-80">
      <Checkbox
        checked={false}
        onCheckedChange={(v) => handleCheck(Boolean(v))}
        disabled={pending}
      />
      <span className="flex-1 text-sm truncate">
        {virtual.emoji ? `${virtual.emoji} ` : ""}
        {virtual.title}
      </span>
      <Repeat
        className="h-3 w-3 shrink-0 text-muted-foreground"
        aria-label="반복"
      />
    </div>
  );
}

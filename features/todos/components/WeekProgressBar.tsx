// features/todos/components/WeekProgressBar.tsx
"use client";

import { AnimatedNumber } from "@/features/widgets/components/AnimatedNumber";
import type { TaskRow } from "../server/queries";

type Props = {
  weekTodos: TaskRow[];
};

export function WeekProgressBar({ weekTodos }: Props) {
  const total = weekTodos.length;
  const done = weekTodos.filter((t) => !!t.completed_at).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span>주간 진행률</span>
        <span>
          <AnimatedNumber value={done} /> / <AnimatedNumber value={total} /> 완료 ·{" "}
          <AnimatedNumber value={pct} unit="%" />
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

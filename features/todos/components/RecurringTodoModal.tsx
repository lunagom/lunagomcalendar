// features/todos/components/RecurringTodoModal.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createRecurringTodo } from "../server/actions";
import { WEEKDAY_CODES, weekdayCodeLabel, type WeekdayCode } from "../lib/recurrence";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 시작일 기본값 — 보통 오늘. */
  todayIso: string;
};

export function RecurringTodoModal({ open, onOpenChange, todayIso }: Props) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [days, setDays] = useState<WeekdayCode[]>([]);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setTitle("");
    setEmoji("");
    setDays([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("제목을 입력하세요");
      return;
    }
    if (days.length === 0) {
      toast.error("반복할 요일을 1개 이상 선택하세요");
      return;
    }
    startTransition(async () => {
      const r = await createRecurringTodo({
        title: title.trim(),
        scheduled_date: todayIso,
        emoji: emoji.trim() || null,
        recurrence_rule: { freq: "weekly" as const, byday: days },
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("반복 할 일이 추가되었습니다");
      reset();
      onOpenChange(false);
    });
  };

  const toggleDay = (code: WeekdayCode) => {
    setDays((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code],
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>반복 할 일 추가</DialogTitle>
          <DialogDescription>
            매주 같은 요일에 반복되는 할 일을 만듭니다. 체크하면 그 날만
            완료 처리됩니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rec-title">제목</Label>
            <Input
              id="rec-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 분리수거"
              disabled={pending}
              autoFocus
            />
          </div>

          <div className="space-y-1.5 w-24">
            <Label htmlFor="rec-emoji">이모지</Label>
            <Input
              id="rec-emoji"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
              placeholder="🗑️"
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label>반복 요일</Label>
            <div className="flex flex-wrap gap-1">
              {WEEKDAY_CODES.map((code) => {
                const selected = days.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleDay(code)}
                    disabled={pending}
                    className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent"
                    }`}
                  >
                    {weekdayCodeLabel(code)}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              추가
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// features/calendar/components/NewCalendarDialog.tsx
"use client";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PRESETS, DEFAULT_CALENDAR_COLOR } from "@/lib/colors";
import { createCalendar } from "../server/actions";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function NewCalendarDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_CALENDAR_COLOR);
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("이름을 입력하세요");
      return;
    }
    startTransition(async () => {
      const r = await createCalendar({ name: name.trim(), color });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("캘린더가 추가되었습니다");
      setName("");
      setColor(DEFAULT_CALENDAR_COLOR);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>새 캘린더</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cal-name">이름 *</Label>
            <Input
              id="cal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 가족 일정"
              maxLength={50}
            />
          </div>
          <div>
            <Label>색상</Label>
            <div className="grid grid-cols-6 gap-2">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-md border-2 ${
                    color === c ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "추가 중..." : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

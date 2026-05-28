// features/calendar/components/CalendarSettingsDialog.tsx
"use client";
import { useState, useTransition } from "react";
import { Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PRESETS } from "@/lib/colors";
import { updateCalendar, deleteCalendar } from "../server/actions";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ShareDialog } from "@/features/social/components/ShareDialog";
import type { CalendarRow } from "../server/queries";

type Props = {
  calendar: CalendarRow | null;
  onClose: () => void;
};

export function CalendarSettingsDialog({ calendar, onClose }: Props) {
  const [name, setName] = useState(calendar?.name ?? "");
  const [color, setColor] = useState(calendar?.color ?? PRESETS[9]);
  const [confirming, setConfirming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!calendar) return null;

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("이름을 입력하세요");
      return;
    }
    startTransition(async () => {
      const r = await updateCalendar(calendar.id, { name: name.trim(), color });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("수정되었습니다");
      onClose();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const r = await deleteCalendar(calendar.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("삭제되었습니다");
      setConfirming(false);
      onClose();
    });
  };

  return (
    <>
      <Dialog open={!confirming && !sharing} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
              <DialogTitle>캘린더 설정</DialogTitle>
            <DialogDescription className="sr-only">
              캘린더의 이름과 색을 수정하거나 삭제합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cal-name">이름</Label>
              <Input
                id="cal-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                  />
                ))}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => setSharing(true)}
            disabled={pending}
          >
            <Users className="h-4 w-4" strokeWidth={1.8} />
            공유 관리
          </Button>
          <DialogFooter className="justify-between">
            <Button
              variant="destructive"
              onClick={() => setConfirming(true)}
              disabled={pending || calendar.is_default}
              title={calendar.is_default ? "기본 캘린더는 삭제 불가" : ""}
            >
              삭제
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={pending}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={pending}>
                저장
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={handleDelete}
        title="캘린더 삭제"
        description={`"${calendar.name}" 와 그 안의 모든 일정이 함께 삭제됩니다.`}
      />

      <ShareDialog
        calendarId={calendar.id}
        calendarName={calendar.name}
        open={sharing}
        onOpenChange={setSharing}
      />
    </>
  );
}

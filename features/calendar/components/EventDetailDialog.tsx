// features/calendar/components/EventDetailDialog.tsx
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
import { toast } from "sonner";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { EventModal } from "./EventModal";
import { deleteEvent } from "../server/actions";
import type { CalendarRow, EventRow } from "../server/queries";

type Props = {
  event: EventRow | null;
  calendars: CalendarRow[];
  onClose: () => void;
};

export function EventDetailDialog({ event, calendars, onClose }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!event) return null;

  const cal = calendars.find((c) => c.id === event.calendar_id);
  const open = !editing && !confirming;

  const handleDelete = () => {
    startTransition(async () => {
      const r = await deleteEvent(event.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("삭제되었습니다");
      setConfirming(false);
      onClose();
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return event.is_all_day
      ? d.toLocaleDateString("ko-KR")
      : d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {event.emoji ? `${event.emoji} ` : ""}
              {event.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              일정의 상세 정보입니다. 수정하거나 삭제할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">시작</span>{" "}
              {formatDate(event.start_at)}
            </div>
            <div>
              <span className="text-muted-foreground">종료</span>{" "}
              {formatDate(event.end_at)}
            </div>
            <div>
              <span className="text-muted-foreground">캘린더</span>{" "}
              <span
                className="inline-block w-2 h-2 rounded-full align-middle"
                style={{ backgroundColor: cal?.color }}
              />{" "}
              {cal?.name ?? "(삭제됨)"}
            </div>
            {event.location && (
              <div>
                <span className="text-muted-foreground">장소</span>{" "}
                {event.location}
              </div>
            )}
            {event.memo && (
              <div className="mt-2 whitespace-pre-wrap text-foreground/80">
                {event.memo}
              </div>
            )}
            {event.is_lunar && (
              <div className="text-xs text-muted-foreground mt-2">
                ☾ 음력 {event.lunar_month}월 {event.lunar_day}일 (매년 반복)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(true)}>
              수정
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirming(true)}
              disabled={pending}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && (
        <EventModal
          open={editing}
          onOpenChange={(v) => {
            setEditing(v);
            if (!v) onClose();
          }}
          calendars={calendars}
          initial={event}
        />
      )}

      <DeleteConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={handleDelete}
        title="일정을 삭제할까요?"
        description={`"${event.title}" 이 영구 삭제됩니다.`}
      />
    </>
  );
}

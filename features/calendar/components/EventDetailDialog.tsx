// features/calendar/components/EventDetailDialog.tsx
"use client";
import { useState, useTransition } from "react";
import { CheckSquare, Repeat } from "lucide-react";
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
import {
  deleteEvent,
  addRecurrenceException,
  splitRecurringEvent,
  materializeRecurringEvent,
} from "../server/actions";
import { createTodo } from "@/features/todos/server/actions";
import { isoToLocalDateKey } from "@/lib/datetime";
import type { CalendarRow, EventRow } from "../server/queries";

type Props = {
  event: EventRow | null;
  calendars: CalendarRow[];
  onClose: () => void;
};

/** 가상 인스턴스 id 파싱: "virtual-{parentId}-{YYYY-MM-DD}" */
function parseVirtualId(id: string): { parentId: string; date: string } | null {
  if (!id.startsWith("virtual-")) return null;
  const rest = id.slice("virtual-".length);
  // date 가 마지막 10자, 그 앞의 `-` 빼고 parentId
  const date = rest.slice(-10);
  const parentId = rest.slice(0, -11); // -11 = "-{date}".length
  return { parentId, date };
}

export function EventDetailDialog({ event, calendars, onClose }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [recurringDeleteOpen, setRecurringDeleteOpen] = useState(false);
  const [recurringEditOpen, setRecurringEditOpen] = useState(false);
  // 가상 인스턴스를 materialize 한 결과 id (그 row 로 편집 모달 띄움)
  const [materializedId, setMaterializedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!event) return null;

  const cal = calendars.find((c) => c.id === event.calendar_id);
  const virtualInfo = parseVirtualId(event.id);
  const isVirtual = !!virtualInfo;
  const isRecurringParent = event.is_recurring && !isVirtual;
  const isRecurringAny = isVirtual || isRecurringParent;
  const open =
    !editing && !confirming && !recurringDeleteOpen && !recurringEditOpen;

  // 가상 인스턴스의 parentId 또는 원본 id
  const parentId = virtualInfo ? virtualInfo.parentId : event.id;
  // 가상 인스턴스의 발생 날짜 또는 원본 시작 날짜
  const occurrenceDate = virtualInfo
    ? virtualInfo.date
    : event.start_at.slice(0, 10);

  const handleDeleteSingle = () => {
    // 가상이든 원본이든 단발 일정 — 그냥 row 삭제
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

  const handleDeleteThisOnly = () => {
    startTransition(async () => {
      const r = await addRecurrenceException(parentId, occurrenceDate);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("이 항목만 삭제됐어요");
      setRecurringDeleteOpen(false);
      onClose();
    });
  };

  const handleDeleteAfter = () => {
    startTransition(async () => {
      const r = await splitRecurringEvent(parentId, occurrenceDate);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("이후 모두 삭제됐어요");
      setRecurringDeleteOpen(false);
      onClose();
    });
  };

  const handleDeleteAll = () => {
    startTransition(async () => {
      const r = await deleteEvent(parentId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("반복 일정 전체가 삭제됐어요");
      setRecurringDeleteOpen(false);
      onClose();
    });
  };

  const handleEditThisOnly = () => {
    startTransition(async () => {
      // 가상 인스턴스를 materialize → 그 row 의 편집 모달 띄움
      const r = await materializeRecurringEvent(parentId, occurrenceDate);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setMaterializedId(r.data.id);
      setRecurringEditOpen(false);
      setEditing(true);
    });
  };

  const handleEditAll = () => {
    setRecurringEditOpen(false);
    setEditing(true);
  };

  const handleConvertToTodo = () => {
    startTransition(async () => {
      const r = await createTodo({
        title: event.title,
        scheduled_date: isoToLocalDateKey(event.start_at),
        emoji: event.emoji,
        linked_event_id: isVirtual ? parentId : event.id,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("할 일로 추가되었습니다");
    });
  };

  const handleEditClick = () => {
    if (isRecurringAny) setRecurringEditOpen(true);
    else setEditing(true);
  };

  const handleDeleteClick = () => {
    if (isRecurringAny) setRecurringDeleteOpen(true);
    else setConfirming(true);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return event.is_all_day
      ? d.toLocaleDateString("ko-KR")
      : d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  };

  // 편집용 initial — materializedId 가 있으면 그 row 를 불러와서 EventModal 에 전달해야 하지만,
  // 단순화: materializedId 가 있으면 임시로 event 를 그 id 로 바꿔서 EventModal 의 update path 사용.
  // (EventModal 이 initial.id 로 update API 호출하니 id 만 바꾼 객체 넘기면 됨)
  const editInitial: EventRow | null = materializedId
    ? { ...event, id: materializedId, is_recurring: false }
    : event;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              {event.emoji ? `${event.emoji} ` : ""}
              {event.title}
              {isRecurringAny && (
                <Repeat
                  className="h-3.5 w-3.5 text-muted-foreground"
                  strokeWidth={1.8}
                  aria-label="반복 일정"
                />
              )}
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
            {event.expected_amount != null && event.expected_amount > 0 && (
              <div>
                <span className="text-muted-foreground">예상 지출</span>{" "}
                <span className="tabular-nums">
                  {event.expected_amount.toLocaleString("ko-KR")}원
                </span>
                {event.expense_category ? ` · ${event.expense_category}` : ""}
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
          <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleConvertToTodo}
              disabled={pending}
              className="gap-1.5 mr-auto"
            >
              <CheckSquare className="h-4 w-4" strokeWidth={1.8} />
              할 일로 추가
            </Button>
            <Button variant="outline" onClick={handleEditClick}>
              수정
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
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
            if (!v) {
              setMaterializedId(null);
              onClose();
            }
          }}
          calendars={calendars}
          initial={editInitial}
        />
      )}

      <DeleteConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={handleDeleteSingle}
        title="일정을 삭제할까요?"
        description={`"${event.title}" 이 영구 삭제됩니다.`}
      />

      {/* 반복 삭제 다이얼로그 */}
      <Dialog
        open={recurringDeleteOpen}
        onOpenChange={setRecurringDeleteOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반복 일정 삭제</DialogTitle>
            <DialogDescription>어떻게 삭제할까요?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleDeleteThisOnly}
              disabled={pending}
            >
              이 항목만
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteAfter}
              disabled={pending}
            >
              이후 모두
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={pending}
            >
              전체
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 반복 수정 다이얼로그 */}
      <Dialog open={recurringEditOpen} onOpenChange={setRecurringEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반복 일정 수정</DialogTitle>
            <DialogDescription>
              이 항목만 따로 수정할지, 전체 반복 일정을 수정할지 선택하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleEditThisOnly}
              disabled={pending}
            >
              이 항목만 수정
            </Button>
            <Button
              variant="outline"
              onClick={handleEditAll}
              disabled={pending}
            >
              전체 수정
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

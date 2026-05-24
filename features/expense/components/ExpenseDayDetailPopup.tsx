// features/expense/components/ExpenseDayDetailPopup.tsx
"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { ExpenseModal } from "./ExpenseModal";
import { DeleteConfirmDialog } from "@/features/calendar/components/DeleteConfirmDialog";
import { deleteExpense } from "../server/actions";
import { getCategoryColor } from "@/lib/colors";
import type { ExpenseRow } from "../server/queries";

type Props = {
  date: Date;
  expenses: ExpenseRow[];
  usedCategories: string[];
  onClose: () => void;
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export function ExpenseDayDetailPopup({
  date,
  expenses,
  usedCategories,
  onClose,
}: Props) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<ExpenseRow | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const day = date.getDay();
  const dayHeader = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAY[day]})`;
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const popupOpen = !creating && !editing && !confirmingDelete;
  const handleOpenChange = (v: boolean) => {
    if (!v) onClose();
  };

  const handleDelete = () => {
    if (!confirmingDelete) return;
    startTransition(async () => {
      const r = await deleteExpense(confirmingDelete.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("삭제되었습니다");
      setConfirmingDelete(null);
    });
  };

  const description = "선택한 날짜의 지출 목록입니다. 추가·수정·삭제할 수 있습니다.";

  const body = (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          지출 · {expenses.length}개 · 총 {total.toLocaleString("ko-KR")}원
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          지출 추가
        </Button>
      </div>

      {expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 px-1">지출 없음</p>
      ) : (
        <div className="flex flex-col divide-y">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-2 py-2">
              <button
                type="button"
                onClick={() => setEditing(e)}
                className="flex-1 flex items-center gap-2 text-left hover:opacity-70"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: getCategoryColor(e.category),
                  }}
                />
                <span className="text-sm truncate">
                  {e.category}
                  {e.memo ? ` · ${e.memo}` : ""}
                </span>
                <span className="ml-auto text-sm font-medium tabular-nums">
                  {e.amount.toLocaleString("ko-KR")}원
                </span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(e)}
                className="p-1 text-muted-foreground hover:text-destructive"
                aria-label="삭제"
                disabled={pending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={popupOpen} onOpenChange={handleOpenChange}>
          <SheetContent
            side="bottom"
            className="max-h-[85vh] overflow-y-auto px-4 pt-5 pb-6"
          >
            <SheetTitle className="text-base mb-3 pr-8">{dayHeader}</SheetTitle>
            <SheetDescription className="sr-only">
              {description}
            </SheetDescription>
            {body}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={popupOpen} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">{dayHeader}</DialogTitle>
              <DialogDescription className="sr-only">
                {description}
              </DialogDescription>
            </DialogHeader>
            {body}
          </DialogContent>
        </Dialog>
      )}

      {creating && (
        <ExpenseModal
          open
          onOpenChange={(v) => !v && setCreating(false)}
          defaultDate={isoDate}
          usedCategories={usedCategories}
        />
      )}

      {editing && (
        <ExpenseModal
          open
          onOpenChange={(v) => !v && setEditing(null)}
          initial={editing}
          usedCategories={usedCategories}
        />
      )}

      <DeleteConfirmDialog
        open={!!confirmingDelete}
        onOpenChange={(v) => !v && setConfirmingDelete(null)}
        onConfirm={handleDelete}
        title="지출을 삭제할까요?"
        description={
          confirmingDelete
            ? `${confirmingDelete.category} ${confirmingDelete.amount.toLocaleString("ko-KR")}원이 영구 삭제됩니다.`
            : ""
        }
      />
    </>
  );
}

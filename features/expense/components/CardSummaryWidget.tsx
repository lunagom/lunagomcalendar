"use client";

import { useState, useTransition } from "react";
import { Plus, X, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { addCardName, removeCardName } from "../server/card-actions";

type Props = {
  cardNames: string[];
  totals: Record<string, number>;
};

function formatKrw(n: number): string {
  return `₩${n.toLocaleString("ko-KR")}`;
}

export function CardSummaryWidget({ cardNames, totals }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [pending, startTransition] = useTransition();

  const handleAdd = () => {
    const name = nameInput.trim();
    if (!name) {
      toast.error("카드명을 입력해주세요");
      return;
    }
    startTransition(async () => {
      const r = await addCardName(name);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("추가되었습니다");
      setAddOpen(false);
      setNameInput("");
    });
  };

  const handleDelete = (name: string) => {
    startTransition(async () => {
      const r = await removeCardName(name);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("삭제되었습니다");
      setConfirmDelete(null);
    });
  };

  return (
    <section className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard
            size={16}
            strokeWidth={1.8}
            className="text-muted-foreground"
          />
          <h2 className="text-sm font-semibold">카드 결제</h2>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          aria-label="카드 추가"
        >
          <Plus size={14} strokeWidth={1.8} />
          추가
        </button>
      </div>

      {cardNames.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          등록된 카드가 없어요. + 추가 를 눌러 카드를 등록하세요.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {cardNames.map((name) => {
            const total = totals[name] ?? 0;
            return (
              <li
                key={name}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/30 px-3 py-2 group"
              >
                <span className="text-sm">{name}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      total > 0 ? "" : "text-muted-foreground"
                    }`}
                  >
                    {formatKrw(total)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted/60 active:scale-95"
                    aria-label={`${name} 삭제`}
                  >
                    <X size={14} strokeWidth={1.8} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 추가 다이얼로그 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>카드 추가</DialogTitle>
            <DialogDescription>
              카드명을 입력하세요 (예: 삼성카드).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="card-name">카드명</Label>
            <Input
              id="card-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="예: 삼성카드"
              maxLength={30}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button onClick={handleAdd} disabled={pending}>
              {pending ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDelete} 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              카드 목록에서 제거합니다. 기존에 입력한 거래는 그대로 남습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={pending}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

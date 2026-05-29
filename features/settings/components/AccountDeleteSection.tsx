"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMyAccount } from "../server/actions";

type Props = {
  userEmail: string;
};

export function AccountDeleteSection({ userEmail }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [pending, startTransition] = useTransition();

  const canDelete = confirmInput.trim().toLowerCase() === userEmail.toLowerCase();

  const handleDelete = () => {
    if (!canDelete) return;
    startTransition(async () => {
      const r = await deleteMyAccount(confirmInput);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("계정이 삭제됐어요");
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
        <Trash2 className="h-4 w-4" strokeWidth={1.8} />
        위험 영역
      </h2>
      <div className="rounded-lg border border-destructive/40 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          계정을 삭제하면 등록된 모든 데이터가 영구 삭제되며 복구할 수 없어요.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          계정 삭제
        </Button>
      </div>

      <AlertDialog
        open={confirming}
        onOpenChange={(v) => {
          setConfirming(v);
          if (!v) setConfirmInput("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 계정을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없어요. 확인을 위해 아래에 이메일을
              정확히 입력해주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-email">{userEmail}</Label>
            <Input
              id="confirm-email"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="이메일 입력"
              disabled={pending}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!canDelete || pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "삭제 중..." : "영구 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

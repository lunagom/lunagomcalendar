"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { endPartnership } from "../server/actions";
import type { PartnershipRow } from "../server/queries";

export function LinkedPartnerCard({
  partnership,
}: {
  partnership: PartnershipRow;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const name =
    partnership.partner_nickname ?? partnership.partner_email ?? "상대방";
  const sinceLabel = partnership.accepted_at
    ? new Date(partnership.accepted_at).toLocaleDateString("ko-KR")
    : null;

  const handleEnd = () => {
    startTransition(async () => {
      const r = await endPartnership(partnership.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("부부 연결을 해지했어요");
      setConfirming(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 fill-pink-500 text-pink-500" aria-hidden />
        <div className="flex-1">
          <p className="text-sm">
            <span className="font-medium">{name}</span> 와 부부 연결됨
          </p>
          {sinceLabel && (
            <p className="text-xs text-muted-foreground">{sinceLabel} 부터</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        가계부 데이터가 함께 보입니다. 해지해도 그동안 입력한 데이터는 양쪽
        모두에게 그대로 남아요.
      </p>
      <Button
        onClick={() => setConfirming(true)}
        variant="outline"
        size="sm"
        className="w-full"
      >
        부부 연결 해지
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>부부 연결을 해지할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              해지 후 새로 입력하는 가계부는 본인만 보여요. 그동안 같이 쌓아온
              데이터는 양쪽 모두에게 그대로 남아요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnd} disabled={pending}>
              {pending ? "해지 중..." : "해지하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

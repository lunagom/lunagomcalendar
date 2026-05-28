"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { acceptInvite, declineInvite } from "../server/actions";
import type { PartnershipRow } from "../server/queries";

type Props = {
  partnership: PartnershipRow;
  mode: "received" | "sent";
};

export function PendingInviteCard({ partnership, mode }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const displayName =
    partnership.partner_nickname ?? partnership.partner_email ?? "상대방";

  const handleAccept = () => {
    startTransition(async () => {
      const r = await acceptInvite(partnership.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("부부 연결이 시작됐어요!");
      router.refresh();
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      const r = await declineInvite(partnership.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        mode === "received" ? "초대를 거절했어요" : "초대를 취소했어요",
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-pink-500" aria-hidden strokeWidth={1.8} />
        <p className="text-sm">
          {mode === "received" ? (
            <>
              <span className="font-medium">{displayName}</span> 가 부부 연결을
              요청했어요
            </>
          ) : (
            <>
              <span className="font-medium">{displayName}</span> 의 응답을
              기다리고 있어요
            </>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        {mode === "received" && (
          <Button onClick={handleAccept} disabled={pending} className="flex-1">
            {pending ? "..." : "수락"}
          </Button>
        )}
        <Button
          onClick={handleDecline}
          disabled={pending}
          variant="outline"
          className="flex-1"
        >
          {pending ? "..." : mode === "received" ? "거절" : "초대 취소"}
        </Button>
      </div>
    </div>
  );
}

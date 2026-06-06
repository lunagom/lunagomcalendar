// features/expense/components/SubscriptionItem.tsx
"use client";

import { useState, useTransition } from "react";
import { Heart, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SubscriptionModal } from "./SubscriptionModal";
import { DeleteConfirmDialog } from "@/features/calendar/components/DeleteConfirmDialog";
import { deleteSubscription } from "../server/actions";
import {
  daysUntilNextBilling,
  billingUrgency,
  type BillingUrgency,
} from "@/lib/subscription";
import { getCategoryColor } from "@/lib/colors";
import type { SubscriptionRow } from "../server/queries";

type Props = {
  subscription: SubscriptionRow;
  usedCategories: string[];
};

function formatEndDate(iso: string): string {
  // "2026-06-30" → "6/30"
  const [, m, d] = iso.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

function urgencyBadge(days: number, urgency: BillingUrgency): {
  label: string;
  className: string;
} {
  if (urgency === "today") {
    return {
      label: "오늘 결제 예정",
      className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    };
  }
  if (urgency === "soon") {
    return {
      label: `${days}일 후 결제`,
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    };
  }
  if (urgency === "upcoming") {
    return {
      label: `${days}일 후`,
      className: "bg-muted text-foreground/80",
    };
  }
  return {
    label: `${days}일 후`,
    className: "text-muted-foreground",
  };
}

export function SubscriptionItem({ subscription, usedCategories }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const days = daysUntilNextBilling(subscription.billing_day);
  const urgency = billingUrgency(days);
  const badge = subscription.is_active ? urgencyBadge(days, urgency) : null;

  const handleDelete = () => {
    startTransition(async () => {
      const r = await deleteSubscription(subscription.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("삭제되었습니다");
      setConfirming(false);
    });
  };

  return (
    <>
      <div
        className={`flex items-center gap-3 py-3 ${
          !subscription.is_active ? "opacity-50" : ""
        }`}
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: getCategoryColor(subscription.category) }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-medium truncate">{subscription.name}</span>
            {subscription.partner_id && (
              <Heart
                className="h-3 w-3 shrink-0 fill-pink-500 text-pink-500"
                aria-label="부부 공유"
              />
            )}
            {badge && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {subscription.category} · 매월 {subscription.billing_day}일
            {subscription.end_date && (
              <span className="ml-1">
                · ~{formatEndDate(subscription.end_date)} 종료
              </span>
            )}
          </div>
        </div>
        <div className="text-sm font-medium tabular-nums shrink-0">
          {subscription.amount.toLocaleString("ko-KR")}원
        </div>
        <div className="flex gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setEditing(true)}
            aria-label="수정"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirming(true)}
            disabled={pending}
            aria-label="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          </Button>
        </div>
      </div>

      {editing && (
        <SubscriptionModal
          open
          onOpenChange={(v) => !v && setEditing(false)}
          initial={subscription}
          usedCategories={usedCategories}
        />
      )}

      <DeleteConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={handleDelete}
        title="구독을 삭제할까요?"
        description={`"${subscription.name}" 이 영구 삭제됩니다.`}
      />
    </>
  );
}

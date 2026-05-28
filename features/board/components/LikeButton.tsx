"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { toggleLike } from "../server/actions";

type Props = {
  targetType: "post" | "comment";
  targetId: string;
  count: number;
  liked: boolean;
};

export function LikeButton({ targetType, targetId, count, liked }: Props) {
  const [optimistic, setOptimistic] = useState({ count, liked });
  const [pending, startTransition] = useTransition();

  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    // optimistic
    const nextLiked = !optimistic.liked;
    const nextCount = optimistic.count + (nextLiked ? 1 : -1);
    setOptimistic({ count: nextCount, liked: nextLiked });
    startTransition(async () => {
      const r = await toggleLike({ target_type: targetType, target_id: targetId });
      if (!r.ok) {
        toast.error(r.error);
        // rollback
        setOptimistic({ count, liked });
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className={`inline-flex items-center gap-1 text-xs transition ${
        optimistic.liked
          ? "text-red-600"
          : "text-muted-foreground hover:text-foreground"
      }`}
      aria-label={optimistic.liked ? "좋아요 취소" : "좋아요"}
    >
      <Heart
        className="h-3.5 w-3.5"
        fill={optimistic.liked ? "currentColor" : "none"}
        strokeWidth={1.8}
      />
      {optimistic.count > 0 && (
        <span className="tabular-nums">{optimistic.count}</span>
      )}
    </button>
  );
}

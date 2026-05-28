"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { AnimatedNumber } from "@/features/widgets/components/AnimatedNumber";
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
  const [pulseKey, setPulseKey] = useState(0);

  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLiked = !optimistic.liked;
    const nextCount = optimistic.count + (nextLiked ? 1 : -1);
    setOptimistic({ count: nextCount, liked: nextLiked });
    setPulseKey((k) => k + 1);
    startTransition(async () => {
      const r = await toggleLike({ target_type: targetType, target_id: targetId });
      if (!r.ok) {
        toast.error(r.error);
        setOptimistic({ count, liked });
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className={`inline-flex items-center gap-1 text-xs transition-colors ${
        optimistic.liked
          ? "text-red-600"
          : "text-muted-foreground hover:text-foreground"
      }`}
      aria-label={optimistic.liked ? "좋아요 취소" : "좋아요"}
    >
      <motion.span
        key={pulseKey}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <Heart
          className="h-3.5 w-3.5"
          fill={optimistic.liked ? "currentColor" : "none"}
          strokeWidth={1.8}
        />
      </motion.span>
      {optimistic.count > 0 && (
        <AnimatedNumber value={optimistic.count} className="tabular-nums" />
      )}
    </button>
  );
}

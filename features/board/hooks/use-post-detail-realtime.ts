"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  postId: string | null;
  /** 변경 감지 시 호출 (예: PostDetailDialog 의 load 함수). */
  onChange: () => void;
};

/**
 * 열린 글의 댓글/좋아요 변경 구독.
 * Supabase Dashboard 에서 board_comments + board_likes Realtime 활성화 필요.
 */
export function usePostDetailRealtime({ postId, onChange }: Props) {
  useEffect(() => {
    if (!postId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`post:${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "board_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => onChange(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "board_likes",
          filter: `target_id=eq.${postId}`,
        },
        () => onChange(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [postId, onChange]);
}

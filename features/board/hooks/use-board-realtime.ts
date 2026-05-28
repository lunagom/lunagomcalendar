"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Props = {
  calendarId: string;
  currentUserId: string;
};

/**
 * 현재 캘린더의 board_posts 변경을 구독.
 * - INSERT (다른 사용자): 토스트 + router.refresh()
 * - UPDATE / DELETE: 조용히 refresh
 *
 * Supabase Dashboard 에서 board_posts 테이블의 Realtime 활성화 필요.
 */
export function useBoardRealtime({ calendarId, currentUserId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`board:${calendarId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "board_posts",
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          const newPost = payload.new as { author_id?: string };
          if (newPost.author_id && newPost.author_id !== currentUserId) {
            toast.info("새 글이 도착했어요");
          }
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "board_posts",
          filter: `calendar_id=eq.${calendarId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "board_posts",
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [calendarId, currentUserId, router]);
}

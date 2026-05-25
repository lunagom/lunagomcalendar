"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * 공유 캘린더의 events 변경(다른 멤버의 INSERT/UPDATE/DELETE)을 받아
 * 현재 페이지를 자동 refresh. RLS 가 자동으로 필터링하므로 클라이언트는
 * 추가 filter 없이 events 테이블 전체 채널에 subscribe 한다.
 *
 * AppShell(로그인 영역) 안에 mount — 모든 페이지에서 active.
 * 비공유 본인-only 변경도 같이 받지만 무해 (router.refresh 만).
 */
export function RealtimeEventsListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("events-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}

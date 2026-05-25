// features/notifications/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type NotificationRow =
  Database["public"]["Tables"]["notifications"]["Row"];

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** 최근 알림 (최신순, 기본 10개). 실패 시 빈 배열. */
export async function getRecentNotifications(
  limit = 10,
): Promise<NotificationRow[]> {
  try {
    const supabase = createClient();
    const me = await currentUserId();
    if (!me) return [];
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", me)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

/** 안 읽은 알림 카운트. 실패 시 0. */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const supabase = createClient();
    const me = await currentUserId();
    if (!me) return 0;
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", me)
      .is("read_at", null);
    if (error) throw error;
    return count ?? 0;
  } catch {
    return 0;
  }
}

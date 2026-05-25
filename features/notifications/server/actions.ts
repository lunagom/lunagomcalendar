// features/notifications/server/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

export async function markAsRead(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function markAllAsRead(): Promise<ActionResult> {
  const userId = await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/**
 * 진입 시 호출. 하루 1번 묶음 알림 생성 (unique index 가 dedupe).
 * - event_summary:<today_iso> — 오늘/내일 일정 카운트
 * - subscription_due:<today_iso> — 오늘/내일 구독 결제 카운트
 * 실패 silent — layout 안 죽게.
 */
export async function seedDailyNotifications(): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(tomorrow.getDate() + 1);

    // 오늘+내일 일정 (RLS 가 멤버 캘린더만 필터)
    const eventsStart = new Date(today);
    eventsStart.setHours(0, 0, 0, 0);
    const { count: eventCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("start_at", eventsStart.toISOString())
      .lt("start_at", dayAfter.toISOString());

    if ((eventCount ?? 0) > 0) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "event_summary",
        title: `오늘·내일 일정 ${eventCount}개`,
        body: "캘린더에서 자세히 보기",
        link: "/calendar",
        dedupe_key: `event_summary:${todayIso}`,
      });
    }

    // 오늘/내일 구독 결제 (billing_day 매치, is_active)
    const todayDay = today.getDate();
    const tomorrowDay = tomorrow.getDate();
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("id, name, amount, billing_day")
      .eq("is_active", true)
      .in("billing_day", [todayDay, tomorrowDay]);

    if (subs && subs.length > 0) {
      const total = subs.reduce((s, x) => s + x.amount, 0);
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "subscription_due",
        title: `오늘·내일 구독 결제 ${subs.length}건`,
        body: `${total.toLocaleString("ko-KR")}원 — ${subs[0].name}${subs.length > 1 ? " 외" : ""}`,
        link: "/expense",
        dedupe_key: `subscription_due:${todayIso}`,
      });
    }
  } catch {
    // silent — 마이그레이션 적용 전 또는 다른 에러로 layout 죽지 않게
  }
}

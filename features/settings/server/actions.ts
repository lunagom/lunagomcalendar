"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

const nicknameSchema = z.object({
  nickname: z.string().min(1).max(40),
});

/** 닉네임 수정 — 본인 프로필만 (RLS). */
export async function updateNickname(input: unknown): Promise<ActionResult> {
  const parsed = nicknameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "닉네임은 1~40자로 입력해주세요" };

  const userId = await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ nickname: parsed.data.nickname.trim() })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout"); // 사이드바 닉네임도 갱신
  return { ok: true, data: undefined };
}

/** 로그아웃. */
export async function signOut(): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

const NotificationPrefsSchema = z.object({
  partnership_invite: z.boolean(),
  partnership_accepted: z.boolean(),
  partnership_ended: z.boolean(),
  daily_summary: z.boolean(),
});

export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

export async function updateNotificationPrefs(
  input: unknown,
): Promise<ActionResult> {
  const parsed = NotificationPrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "잘못된 입력" };
  const userId = await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: parsed.data })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function exportMyData(): Promise<
  ActionResult<{ json: string; filename: string }>
> {
  const userId = await getUserId();
  const supabase = createClient();

  const [
    profileRes,
    calendarsRes,
    eventsRes,
    expensesRes,
    incomesRes,
    tasksRes,
    subscriptionsRes,
    recurringIncomesRes,
    budgetsRes,
    monthlyTargetsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("calendars").select("*").eq("user_id", userId),
    supabase.from("events").select("*").eq("user_id", userId),
    supabase.from("expenses").select("*").eq("user_id", userId),
    supabase.from("incomes").select("*").eq("user_id", userId),
    supabase.from("tasks").select("*").eq("user_id", userId),
    supabase.from("subscriptions").select("*").eq("user_id", userId),
    supabase.from("recurring_incomes").select("*").eq("user_id", userId),
    supabase.from("budgets").select("*").eq("user_id", userId),
    supabase.from("monthly_targets").select("*").eq("user_id", userId),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profileRes.data,
    calendars: calendarsRes.data,
    events: eventsRes.data,
    expenses: expensesRes.data,
    incomes: incomesRes.data,
    tasks: tasksRes.data,
    subscriptions: subscriptionsRes.data,
    recurring_incomes: recurringIncomesRes.data,
    budgets: budgetsRes.data,
    monthly_targets: monthlyTargetsRes.data,
  };
  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    data: { json, filename: `lunabear-export-${date}.json` },
  };
}

export async function deleteMyAccount(
  confirmationEmail: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  if (
    !user.email ||
    user.email.toLowerCase() !== confirmationEmail.trim().toLowerCase()
  ) {
    return { ok: false, error: "이메일이 일치하지 않아요" };
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: error.message };
  await supabase.auth.signOut();
  return { ok: true, data: undefined };
}

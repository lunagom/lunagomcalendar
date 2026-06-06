"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const recurrenceRuleSchema = z
  .object({
    freq: z.enum(["daily", "weekly", "monthly"]),
    byday: z.array(z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"])).optional(),
    bymonthday: z.number().int().min(1).max(31).optional(),
    exceptions: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  })
  .nullable();

const eventInputSchema = z.object({
  title: z.string().min(1).max(200),
  calendar_id: z.string().uuid(),
  start_at: z.string(), // ISO
  end_at: z.string(),
  is_all_day: z.boolean().default(false),
  location: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  emoji: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  is_lunar: z.boolean().default(false),
  lunar_month: z.number().int().min(1).max(12).nullable().optional(),
  lunar_day: z.number().int().min(1).max(30).nullable().optional(),
  expected_amount: z.number().int().min(0).nullable().optional(),
  expense_category: z.string().min(1).max(50).nullable().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: recurrenceRuleSchema.optional(),
  recurrence_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  recurrence_count: z.number().int().min(2).max(365).nullable().optional(),
});

export type EventInput = z.infer<typeof eventInputSchema>;

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

export async function createEvent(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  return { ok: true, data: { id: data.id } };
}

export async function updateEvent(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = eventInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

/** 드래그앤드롭으로 일정 시간 이동. */
export async function moveEvent(
  id: string,
  newStart: string,
  newEnd: string,
): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ start_at: newStart, end_at: newEnd })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

// === 반복 일정 actions ===

/**
 * 가상 반복 인스턴스를 실제 단일 row 로 복사 생성.
 * - 원본의 모든 필드 복사
 * - is_recurring=false 로
 * - start_at / end_at 의 날짜만 `dateIso` 로 바꿈 (시간은 유지)
 * 반환 id 로 이후 별도 수정 가능.
 */
export async function materializeRecurringEvent(
  parentId: string,
  dateIso: string,
): Promise<ActionResult<{ id: string }>> {
  const userId = await getUserId();
  const supabase = createClient();
  const { data: parent, error: e1 } = await supabase
    .from("events")
    .select("*")
    .eq("id", parentId)
    .eq("user_id", userId)
    .single();
  if (e1 || !parent) return { ok: false, error: "원본을 찾을 수 없어요" };

  const parentStartTime = parent.start_at.slice(10); // "THH:MM:..."
  const parentEndTime = parent.end_at.slice(10);
  const newStart = `${dateIso}${parentStartTime}`;
  const newEnd = `${dateIso}${parentEndTime}`;

  const { data: created, error: e2 } = await supabase
    .from("events")
    .insert({
      calendar_id: parent.calendar_id,
      user_id: userId,
      title: parent.title,
      start_at: newStart,
      end_at: newEnd,
      color: parent.color,
      emoji: parent.emoji,
      memo: parent.memo,
      location: parent.location,
      is_all_day: parent.is_all_day,
      is_lunar: false,
      lunar_month: null,
      lunar_day: null,
      expected_amount: parent.expected_amount,
      expense_category: parent.expense_category,
      is_recurring: false,
      recurrence_rule: null,
      recurrence_until: null,
      recurrence_count: null,
    })
    .select("id")
    .single();
  if (e2 || !created) return { ok: false, error: "복사 실패" };

  // 원본의 exceptions 에 이 날짜 추가 (가상 인스턴스를 더 이상 안 그리도록)
  await addRecurrenceException(parentId, dateIso);

  revalidatePath("/calendar");
  return { ok: true, data: { id: created.id } };
}

/**
 * "이후 모두 삭제" — 원본의 recurrence_until 을 dateIso 의 전날로 갱신.
 * 그 날짜의 가상 인스턴스도 같이 사라짐.
 */
export async function splitRecurringEvent(
  parentId: string,
  dateIso: string,
): Promise<ActionResult> {
  const userId = await getUserId();
  const supabase = createClient();
  const dt = new Date(dateIso);
  dt.setDate(dt.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const untilIso = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

  const { error } = await supabase
    .from("events")
    .update({ recurrence_until: untilIso })
    .eq("id", parentId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

/**
 * "이 항목만 삭제" — 원본의 recurrence_rule.exceptions 에 dateIso 추가.
 */
export async function addRecurrenceException(
  parentId: string,
  dateIso: string,
): Promise<ActionResult> {
  const userId = await getUserId();
  const supabase = createClient();
  const { data: parent, error: e1 } = await supabase
    .from("events")
    .select("recurrence_rule")
    .eq("id", parentId)
    .eq("user_id", userId)
    .single();
  if (e1 || !parent) return { ok: false, error: "원본을 찾을 수 없어요" };

  const rule =
    parent.recurrence_rule && typeof parent.recurrence_rule === "object"
      ? (parent.recurrence_rule as Record<string, unknown>)
      : {};
  const existing = Array.isArray(rule.exceptions)
    ? (rule.exceptions as string[])
    : [];
  const exceptions = existing.includes(dateIso)
    ? existing
    : [...existing, dateIso];

  const { error } = await supabase
    .from("events")
    .update({ recurrence_rule: { ...rule, exceptions } })
    .eq("id", parentId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

// === Calendar Actions ===

const calendarInputSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export async function createCalendar(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = calendarInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("calendars")
    .insert({ ...parsed.data, user_id: userId, is_default: false })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  return { ok: true, data: { id: data.id } };
}

export async function updateCalendar(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = calendarInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("calendars")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

export async function deleteCalendar(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();

  // 기본 캘린더는 삭제 금지
  const { data: cal } = await supabase
    .from("calendars")
    .select("is_default")
    .eq("id", id)
    .single();
  if (cal?.is_default) return { ok: false, error: "기본 캘린더는 삭제할 수 없습니다" };

  const { error } = await supabase.from("calendars").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

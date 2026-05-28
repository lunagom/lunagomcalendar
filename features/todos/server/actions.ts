// features/todos/server/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const taskInputSchema = z.object({
  title: z.string().min(1).max(200),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  emoji: z.string().nullable().optional(),
  linked_event_id: z.string().uuid().nullable().optional(),
});

export type TaskInput = z.infer<typeof taskInputSchema>;
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

export async function createTodo(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: { id: data.id } };
}

export async function toggleTodo(
  id: string,
  completed: boolean,
): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: undefined };
}

export async function deleteTodo(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: undefined };
}

// ───────── 반복 할 일 ─────────

const recurrenceRuleSchema = z.object({
  freq: z.literal("weekly"),
  byday: z
    .array(z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]))
    .min(1),
});

const recurringTaskInputSchema = z.object({
  title: z.string().min(1).max(200),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  emoji: z.string().nullable().optional(),
  recurrence_rule: recurrenceRuleSchema,
});

/** 반복 할 일 "원본" 행 생성. is_recurring=true 로 저장. */
export async function createRecurringTodo(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = recurringTaskInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...parsed.data,
      user_id: userId,
      is_recurring: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: { id: data.id } };
}

/** 반복 원본 삭제. 이미 생성된 인스턴스는 그대로 남음. */
export async function deleteRecurringTodo(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("is_recurring", true);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: undefined };
}

/**
 * 가상 반복 카드를 실제 row 로 변환 (체크된 상태로).
 * 원본은 RLS 로 본인 것만 조회됨.
 */
export async function materializeRecurringTodo(
  parentId: string,
  dateIso: string,
): Promise<ActionResult<{ id: string }>> {
  const dateParsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(dateIso);
  if (!dateParsed.success) return { ok: false, error: "유효하지 않은 날짜" };

  const userId = await getUserId();
  const supabase = createClient();

  const { data: parent, error: parentError } = await supabase
    .from("tasks")
    .select("title, emoji, is_recurring")
    .eq("id", parentId)
    .single();
  if (parentError || !parent) {
    return { ok: false, error: "반복 원본을 찾을 수 없습니다" };
  }
  if (!parent.is_recurring) {
    return { ok: false, error: "반복 원본이 아닙니다" };
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: parent.title,
      emoji: parent.emoji,
      scheduled_date: dateIso,
      completed_at: new Date().toISOString(),
      is_recurring: false,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: { id: data.id } };
}

/**
 * 한 날(컬럼) 내의 할 일들을 주어진 순서대로 sort_order 재할당.
 * orderedIds: 컬럼 최종 순서 (위 → 아래). 100, 200, 300, ... 으로 균등 spacing.
 */
export async function reorderTodosInDay(
  date: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const dateParsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(date);
  if (!dateParsed.success) return { ok: false, error: "유효하지 않은 날짜" };
  const idsParsed = z.array(z.string().uuid()).min(1).safeParse(orderedIds);
  if (!idsParsed.success) return { ok: false, error: "잘못된 입력" };

  await getUserId();
  const supabase = createClient();

  // 개별 update 를 Promise.all — Supabase JS 는 batch update 지원 안 함.
  const results = await Promise.all(
    idsParsed.data.map((id, idx) =>
      supabase
        .from("tasks")
        .update({
          sort_order: (idx + 1) * 100,
          scheduled_date: dateParsed.data,
        })
        .eq("id", id),
    ),
  );
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) return { ok: false, error: firstError.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: undefined };
}

/** 드래그앤드롭으로 같은 주 내에서 다른 요일로 이동. sort_order 도 같이 갱신 가능. */
export async function reorderTodo(
  id: string,
  newDate: string,
  newSortOrder?: number,
): Promise<ActionResult> {
  const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(newDate);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 날짜" };

  await getUserId();
  const supabase = createClient();
  const update: { scheduled_date: string; sort_order?: number } = {
    scheduled_date: newDate,
  };
  if (typeof newSortOrder === "number") update.sort_order = newSortOrder;
  const { error } = await supabase.from("tasks").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: undefined };
}

/** 다른 날짜로 이동 (밀린 항목의 "다른 날로 옮기기"). */
export async function moveTodo(
  id: string,
  newDate: string,
): Promise<ActionResult> {
  const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(newDate);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 날짜" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ scheduled_date: newDate })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/todos");
  return { ok: true, data: undefined };
}

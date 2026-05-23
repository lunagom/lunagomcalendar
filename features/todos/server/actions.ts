// features/todos/server/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const taskInputSchema = z.object({
  title: z.string().min(1).max(200),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  emoji: z.string().nullable().optional(),
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

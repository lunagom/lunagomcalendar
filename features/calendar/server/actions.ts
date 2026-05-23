"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  revalidatePath("/day");
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
  revalidatePath("/day");
  return { ok: true, data: undefined };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  revalidatePath("/day");
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
  revalidatePath("/day");
  return { ok: true, data: undefined };
}

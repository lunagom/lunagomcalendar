"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// === Schemas ===

const expenseInputSchema = z.object({
  amount: z.number().int().min(0),
  category: z.string().min(1).max(50),
  paid_at: z.string(), // ISO
  memo: z.string().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
});

const subscriptionInputSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().int().min(0),
  billing_day: z.number().int().min(1).max(31),
  category: z.string().min(1).max(50),
  is_active: z.boolean().optional().default(true),
});

const budgetInputSchema = z.object({
  category: z.string().min(1).max(50),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  limit_amount: z.number().int().min(0),
});

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

function revalidateExpensePaths() {
  revalidatePath("/expense");
  revalidatePath("/calendar"); // DayCell 지출 합계 위젯에 반영
}

// === Expense Actions ===

export async function createExpense(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = expenseInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidateExpensePaths();
  return { ok: true, data: { id: data.id } };
}

export async function updateExpense(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = expenseInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("expenses")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateExpensePaths();
  return { ok: true, data: undefined };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateExpensePaths();
  return { ok: true, data: undefined };
}

// === Subscription Actions ===

export async function createSubscription(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = subscriptionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/expense");
  return { ok: true, data: { id: data.id } };
}

export async function updateSubscription(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = subscriptionInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/expense");
  return { ok: true, data: undefined };
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/expense");
  return { ok: true, data: undefined };
}

// === Budget Actions ===

/** (user_id, category, month) UNIQUE 위에 upsert. */
export async function setBudget(input: unknown): Promise<ActionResult> {
  const parsed = budgetInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("budgets").upsert(
    { ...parsed.data, user_id: userId },
    { onConflict: "user_id,category,month" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/expense");
  return { ok: true, data: undefined };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/expense");
  return { ok: true, data: undefined };
}

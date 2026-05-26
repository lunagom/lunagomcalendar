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

const monthlyTargetInputSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  amount: z.number().int().min(0),
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

// === Monthly Target Actions ===

/** (user_id, month) UNIQUE 위에 upsert. 월 전체 목표 지출액 설정. */
export async function setMonthlyTarget(
  input: unknown,
): Promise<ActionResult> {
  const parsed = monthlyTargetInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("monthly_targets").upsert(
    { ...parsed.data, user_id: userId },
    { onConflict: "user_id,month" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/expense");
  return { ok: true, data: undefined };
}

export async function deleteMonthlyTarget(
  month: string,
): Promise<ActionResult> {
  const userId = await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("monthly_targets")
    .delete()
    .eq("user_id", userId)
    .eq("month", month);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/expense");
  return { ok: true, data: undefined };
}

// ============================================================================
// 수입 — incomes / recurring_incomes
// ============================================================================

const incomeInputSchema = z.object({
  amount: z.number().int().min(0).max(2_000_000_000),
  category: z.string().min(1).max(50),
  memo: z.string().nullable().optional(),
  received_at: z.string(), // ISO
});

export async function createIncome(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = incomeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("incomes")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/expense");
  revalidatePath("/calendar");
  return { ok: true, data: { id: data.id } };
}

export async function updateIncome(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = incomeInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("incomes")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/expense");
  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

export async function deleteIncome(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("incomes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/expense");
  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

const recurringIncomeInputSchema = z.object({
  name: z.string().min(1).max(50),
  amount: z.number().int().min(0).max(2_000_000_000),
  receive_day: z.number().int().min(1).max(31),
  category: z.string().min(1).max(50),
  is_active: z.boolean().optional().default(true),
});

export async function createRecurringIncome(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = recurringIncomeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_incomes")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/expense");
  return { ok: true, data: { id: data.id } };
}

export async function updateRecurringIncome(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = recurringIncomeInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("recurring_incomes")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/expense");
  return { ok: true, data: undefined };
}

export async function deleteRecurringIncome(
  id: string,
): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("recurring_incomes")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/expense");
  return { ok: true, data: undefined };
}

export async function toggleRecurringIncomeActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("recurring_incomes")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/expense");
  return { ok: true, data: undefined };
}

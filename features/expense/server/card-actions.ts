"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./actions";

const nameSchema = z.string().min(1).max(30);

async function getUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

async function readCardNames(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("card_names")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  const raw = data?.card_names;
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  return [];
}

async function writeCardNames(
  userId: string,
  names: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ card_names: names })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addCardName(name: unknown): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success)
    return { ok: false, error: "카드명은 1-30자로 입력해주세요" };
  const trimmed = parsed.data.trim();
  if (!trimmed) return { ok: false, error: "카드명을 입력해주세요" };

  const userId = await getUserId();
  const current = await readCardNames(userId);
  if (current.includes(trimmed)) {
    return { ok: false, error: "이미 등록된 카드입니다" };
  }
  const updated = [...current, trimmed];
  const result = await writeCardNames(userId, updated);
  if (!result.ok) return result;
  revalidatePath("/expense");
  return { ok: true, data: undefined };
}

export async function removeCardName(name: unknown): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success)
    return { ok: false, error: "유효하지 않은 카드명입니다" };

  const userId = await getUserId();
  const current = await readCardNames(userId);
  const updated = current.filter((n) => n !== parsed.data);
  const result = await writeCardNames(userId, updated);
  if (!result.ok) return result;
  revalidatePath("/expense");
  return { ok: true, data: undefined };
}

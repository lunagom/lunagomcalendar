"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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

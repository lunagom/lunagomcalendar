"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("이메일 형식이 올바르지 않습니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

export type LoginState = { error: string | null };

export async function loginWithPassword(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값이 잘못되었습니다." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Supabase 에러 메시지를 한국어로 매핑
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "이메일 확인이 아직 완료되지 않았습니다. 받은 메일의 인증 링크를 눌러주세요." };
    }
    if (error.message.toLowerCase().includes("invalid login")) {
      return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }
    return { error: error.message };
  }

  const next = (formData.get("next") as string | null) || "/";
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signInWithOAuth(provider: "kakao" | "google", next?: string) {
  const supabase = createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectTo = new URL("/auth/callback", origin);
  if (next) redirectTo.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectTo.toString() },
  });

  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  return { error: "소셜 로그인 URL 생성에 실패했습니다." };
}

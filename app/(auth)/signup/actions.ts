"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const signupSchema = z
  .object({
    nickname: z
      .string()
      .min(2, "닉네임은 2자 이상이어야 합니다.")
      .max(20, "닉네임은 20자 이하여야 합니다."),
    email: z.string().email("이메일 형식이 올바르지 않습니다."),
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 일치하지 않습니다.",
  });

export type SignupState =
  | { status: "idle"; error: null }
  | { status: "error"; error: string }
  | { status: "sent"; email: string };

export async function signUpWithPassword(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    nickname: formData.get("nickname"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "입력값이 잘못되었습니다.",
    };
  }

  const { email, password, nickname } = parsed.data;
  const supabase = createClient();

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("user already registered")) {
      return { status: "error", error: "이미 가입된 이메일입니다. 로그인해주세요." };
    }
    return { status: "error", error: error.message };
  }

  // 이메일 confirm 정책 require — 메일 발송 안내 화면으로
  return { status: "sent", email };
}

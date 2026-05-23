"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithPassword, type SignupState } from "./actions";

const initialState: SignupState = { status: "idle", error: null };

export function SignupForm() {
  const [state, formAction] = useFormState(signUpWithPassword, initialState);

  if (state.status === "sent") {
    return (
      <div className="rounded-xl border border-border bg-accent/40 p-5 text-center">
        <MailCheck className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 text-sm font-semibold">이메일을 확인해주세요</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{state.email}</span> 로
          인증 메일을 보냈습니다. 메일의 링크를 누르면 가입이 완료됩니다.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          로그인 화면으로
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="nickname">닉네임</Label>
        <Input
          id="nickname"
          name="nickname"
          type="text"
          required
          minLength={2}
          maxLength={20}
          placeholder="루나곰"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="8자 이상"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      {state.status === "error" && (
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </p>
      )}

      <SubmitButton />

      <p className="text-xs text-muted-foreground">
        가입하시면 서비스 이용에 동의하는 것으로 간주됩니다.
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-11 w-full">
      {pending ? "가입 중..." : "이메일로 가입하기"}
    </Button>
  );
}

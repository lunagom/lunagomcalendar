import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { SocialButtons } from "@/components/auth/social-buttons";
import { SignupForm } from "./signup-form";

export const metadata = { title: "회원가입" };

export default function SignupPage() {
  return (
    <Card className="rounded-xl border-border">
      <CardContent className="p-6">
        <h1 className="text-xl font-bold tracking-tight">회원가입</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          이메일 또는 소셜 계정으로 가입하세요.
        </p>

        <div className="mt-6">
          <SignupForm />
        </div>

        <SocialButtons />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

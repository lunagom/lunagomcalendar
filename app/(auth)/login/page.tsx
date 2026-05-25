import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { SocialButtons } from "@/components/auth/social-buttons";
import { LoginForm } from "./login-form";

export const metadata = { title: "로그인" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <Card className="rounded-xl border-border">
      <CardContent className="p-6">
        <h1 className="text-xl font-bold tracking-tight">로그인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          이메일 또는 소셜 계정으로 계속하세요.
        </p>

        <div className="mt-6">
          <LoginForm next={searchParams.next} />
        </div>

        <SocialButtons next={searchParams.next} />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          아직 계정이 없으신가요?{" "}
          <Link
            href={`/signup${searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : ""}`}
            className="font-medium text-primary hover:underline"
          >
            회원가입
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

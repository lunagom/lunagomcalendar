import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * 이메일 인증 링크의 콜백.
 * Supabase 가 보낸 메일의 "Confirm signup" 링크가
 *   /auth/confirm?token_hash=...&type=signup&next=...
 * 으로 돌아온다. token_hash 를 OTP 로 검증해 세션을 만든다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const errorUrl = new URL("/login", origin);
  errorUrl.searchParams.set("error", "confirm_failed");
  return NextResponse.redirect(errorUrl);
}

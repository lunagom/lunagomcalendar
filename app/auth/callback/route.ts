import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth (카카오 / 구글) provider 로부터 돌아오는 콜백.
 * code 를 세션으로 교환한 뒤 next 또는 / 로 보낸다.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // 실패 — 로그인 화면으로 에러와 함께 복귀
  const errorUrl = new URL("/login", origin);
  errorUrl.searchParams.set("error", "oauth_failed");
  return NextResponse.redirect(errorUrl);
}

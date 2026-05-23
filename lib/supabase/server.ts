import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * Server Component / Route Handler / Server Action 용 Supabase 클라이언트.
 * Next.js cookies() 를 사용해 세션을 읽고 갱신한다.
 *
 * Server Component 안에서 set 호출이 막혀 있는 경우를 대비해 try/catch 로
 * 감싼다 (이 경우 미들웨어가 세션 갱신을 담당).
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 에서 set 시도 시 발생 — 무시 (middleware 가 처리)
          }
        },
      },
    }
  );
}

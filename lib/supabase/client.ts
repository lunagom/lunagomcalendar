import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * 브라우저(Client Component)용 Supabase 클라이언트.
 * 클라이언트 컴포넌트에서 직접 호출. 같은 탭에서는 싱글톤처럼 동작한다.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

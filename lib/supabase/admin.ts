import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Service role 키로 만든 Supabase admin client.
 * RLS 를 우회하므로 반드시 server 전용. 클라이언트 코드에서 import 금지.
 *
 * 주된 용도: 이메일로 auth.users 조회 (초대 흐름 등).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

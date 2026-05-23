// 테스트용 유저 1명 생성 (이메일 확인 완료 상태). 로컬 개발 전용.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envText = readFileSync(".env.local", "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
    .filter(([k, v]) => k && v),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const email = "pw-test@lunabear.dev";
const password = "test12345";

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error && /already.*registered|exists/i.test(error.message)) {
  console.log(`✓ 유저 이미 존재: ${email}`);
} else if (error) {
  console.error("ERROR:", error.message);
  process.exit(1);
} else {
  console.log(`✓ 유저 생성됨: ${email} (id=${data.user.id})`);
}
console.log(`로그인: ${email} / ${password}`);

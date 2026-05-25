import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron 이 매일 1회 호출 → Supabase 무료 일시정지 회피.
// 7일 무활동 시 일시정지 → 매일 가벼운 쿼리로 카운터 리셋.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const got = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || got !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").select("id").limit(1);
  if (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, at: new Date().toISOString() });
}

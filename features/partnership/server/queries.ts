import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PartnershipRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: "pending" | "active" | "ended";
  created_at: string;
  accepted_at: string | null;
  ended_at: string | null;
  // join 으로 채울 상대방 정보
  partner_nickname: string | null;
  partner_email: string | null;
};

/**
 * 현재 사용자의 partnership 상태.
 * - active: 연결됨
 * - 받은 pending: 수락/거절 대기 (내가 user_b)
 * - 보낸 pending: 상대 응답 대기 (내가 user_a)
 * - null: 연결 안 됨
 *
 * 상대방 닉네임·이메일은 admin client 로 join (profiles 는 본인 RLS, auth.users 는 admin).
 */
export async function getMyPartnership(): Promise<{
  active: PartnershipRow | null;
  receivedPending: PartnershipRow | null;
  sentPending: PartnershipRow | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { active: null, receivedPending: null, sentPending: null };

  const { data: rows } = await supabase
    .from("partnerships")
    .select("id, user_a_id, user_b_id, status, created_at, accepted_at, ended_at")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .in("status", ["pending", "active"]);

  if (!rows || rows.length === 0) {
    return { active: null, receivedPending: null, sentPending: null };
  }

  const partnerIds = rows.map((r) =>
    r.user_a_id === user.id ? r.user_b_id : r.user_a_id,
  );

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nickname")
    .in("id", partnerIds);
  const nicknameMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.nickname]),
  );

  // 각 partner 의 이메일 — admin.auth.admin.getUserById 로 개별 조회
  const emailEntries = await Promise.all(
    partnerIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      return [id, data.user?.email ?? null] as const;
    }),
  );
  const emailMap = new Map(emailEntries);

  const enrich = (r: (typeof rows)[number]): PartnershipRow => {
    const partnerId = r.user_a_id === user.id ? r.user_b_id : r.user_a_id;
    return {
      ...r,
      status: r.status as "pending" | "active" | "ended",
      partner_nickname: nicknameMap.get(partnerId) ?? null,
      partner_email: emailMap.get(partnerId) ?? null,
    };
  };

  let active: PartnershipRow | null = null;
  let receivedPending: PartnershipRow | null = null;
  let sentPending: PartnershipRow | null = null;

  for (const r of rows) {
    const e = enrich(r);
    if (r.status === "active") active = e;
    else if (r.status === "pending") {
      if (r.user_a_id === user.id) sentPending = e;
      else receivedPending = e;
    }
  }

  return { active, receivedPending, sentPending };
}

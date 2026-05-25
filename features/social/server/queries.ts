import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export type SharedCalendarRow =
  Database["public"]["Tables"]["shared_calendars"]["Row"];

export type ProfileSnippet = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
};

export type CalendarSnippet = { id: string; name: string; color: string };

export type SharedCalendarWithMeta = SharedCalendarRow & {
  calendar: CalendarSnippet | null;
  /** 초대를 보낸 owner. 받는 쪽에서 누가 공유했는지 표시. */
  owner: ProfileSnippet | null;
};

export type CalendarMember = SharedCalendarRow & {
  member: ProfileSnippet | null;
};

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function joinOwners(
  rows: SharedCalendarRow[],
): Promise<SharedCalendarWithMeta[]> {
  if (rows.length === 0) return [];
  const supabase = createClient();

  // calendar 정보
  const calIds = Array.from(new Set(rows.map((r) => r.calendar_id)));
  const { data: cals } = await supabase
    .from("calendars")
    .select("id, name, color")
    .in("id", calIds);
  const calMap = new Map((cals ?? []).map((c) => [c.id, c]));

  // owner 프로필 — profiles RLS 가 본인만 select 라 admin 으로 우회
  const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id)));
  const admin = createAdminClient();
  const { data: owners } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url")
    .in("id", ownerIds);
  const ownerMap = new Map((owners ?? []).map((o) => [o.id, o]));

  return rows.map((r) => ({
    ...r,
    calendar: calMap.get(r.calendar_id) ?? null,
    owner: ownerMap.get(r.owner_id) ?? null,
  }));
}

/** 내가 받은 pending 초대들. */
export async function getMyIncomingInvites(): Promise<SharedCalendarWithMeta[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shared_calendars")
    .select("*")
    .eq("member_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return joinOwners(data ?? []);
}

/** 내가 받은 accepted 공유 캘린더들 — owner 닉네임 / 권한 같이. */
export async function getMyAcceptedShares(): Promise<SharedCalendarWithMeta[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shared_calendars")
    .select("*")
    .eq("member_id", userId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return joinOwners(data ?? []);
}

/**
 * 내가 소유한 캘린더 중 누군가에게 공유한 것 + 그 멤버들.
 * /social 의 "내가 공유한 캘린더" 섹션용.
 */
export async function getMyOwnedSharesGroupedByCalendar(): Promise<
  {
    calendar: CalendarSnippet;
    members: CalendarMember[];
  }[]
> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const supabase = createClient();

  // 내가 소유한 캘린더 전체
  const { data: cals } = await supabase
    .from("calendars")
    .select("id, name, color")
    .eq("user_id", userId);
  if (!cals || cals.length === 0) return [];

  // 그 중 공유된 행
  const { data: shares, error } = await supabase
    .from("shared_calendars")
    .select("*")
    .eq("owner_id", userId)
    .in(
      "calendar_id",
      cals.map((c) => c.id),
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!shares || shares.length === 0) return [];

  // 멤버 프로필 (admin 으로 우회)
  const memberIds = Array.from(new Set(shares.map((s) => s.member_id)));
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url")
    .in("id", memberIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // calendar 별 그루핑
  const byCal = new Map<
    string,
    { calendar: CalendarSnippet; members: CalendarMember[] }
  >();
  for (const c of cals) {
    byCal.set(c.id, { calendar: c, members: [] });
  }
  for (const s of shares) {
    const bucket = byCal.get(s.calendar_id);
    if (!bucket) continue;
    bucket.members.push({ ...s, member: profileMap.get(s.member_id) ?? null });
  }
  return Array.from(byCal.values()).filter((b) => b.members.length > 0);
}

/** 특정 캘린더의 멤버들 (owner 시점). ShareDialog 에서 사용. */
export async function getCalendarMembers(
  calendarId: string,
): Promise<CalendarMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shared_calendars")
    .select("*")
    .eq("calendar_id", calendarId)
    .order("created_at");
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const memberIds = Array.from(new Set(data.map((m) => m.member_id)));
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url")
    .in("id", memberIds);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));

  return data.map((m) => ({ ...m, member: map.get(m.member_id) ?? null }));
}

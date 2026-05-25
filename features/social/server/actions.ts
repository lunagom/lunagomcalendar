"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarMembers, type CalendarMember } from "./queries";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

const inviteSchema = z.object({
  calendarId: z.string().uuid(),
  email: z.string().email(),
  permission: z.enum(["view", "edit"]).default("view"),
});

/**
 * 이메일로 사용자를 찾아 캘린더에 초대한다.
 * - 자기 자신은 초대 불가
 * - 이미 초대된 사용자는 중복 불가
 * - 가입하지 않은 이메일은 에러
 */
export async function inviteByEmail(
  input: unknown,
): Promise<ActionResult<{ sharedCalendarId: string }>> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "이메일 형식을 확인해주세요" };
  }
  const { calendarId, email, permission } = parsed.data;

  const ownerId = await getUserId();
  const supabase = createClient();

  // 1) calendar 소유자 확인 (RLS 통과)
  const { data: cal, error: calErr } = await supabase
    .from("calendars")
    .select("user_id")
    .eq("id", calendarId)
    .maybeSingle();
  if (calErr) return { ok: false, error: calErr.message };
  if (!cal || cal.user_id !== ownerId) {
    return { ok: false, error: "캘린더 소유자만 초대할 수 있습니다" };
  }

  // 2) email → user_id 조회 (admin)
  const admin = createAdminClient();
  const { data: usersRes, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) return { ok: false, error: listErr.message };
  const target = usersRes.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!target) {
    return { ok: false, error: "가입된 사용자가 아닙니다" };
  }
  if (target.id === ownerId) {
    return { ok: false, error: "자기 자신은 초대할 수 없습니다" };
  }

  // 3) shared_calendars insert (status: pending)
  const { data, error } = await supabase
    .from("shared_calendars")
    .insert({
      calendar_id: calendarId,
      owner_id: ownerId,
      member_id: target.id,
      permission,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    // unique constraint 위반 등
    if (error.code === "23505") {
      return { ok: false, error: "이미 초대된 사용자입니다" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/social");
  revalidatePath("/calendar");
  return { ok: true, data: { sharedCalendarId: data.id } };
}

/** 받은 초대 수락 — 본인 row 만 가능 (RLS) */
export async function acceptInvite(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("shared_calendars")
    .update({ status: "accepted" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/social");
  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

/**
 * shared_calendars row 삭제 — 한 함수가 4가지 케이스 커버.
 * RLS 의 OR 정책 (owner_id = me OR member_id = me) 이 케이스마다 권한 결정:
 *  · owner — 보낸 초대 취소 (pending) / 멤버 제거 (accepted)
 *  · member — 받은 초대 거절 (pending) / 캘린더에서 나가기 (accepted)
 * 모두 row 삭제 효과.
 */
export async function declineInvite(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("shared_calendars")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/social");
  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

/** 멤버 제거 (owner 권한) — declineInvite 와 동일 effect, alias. */
export async function removeMember(id: string): Promise<ActionResult> {
  return declineInvite(id);
}

const permissionSchema = z.object({
  id: z.string().uuid(),
  permission: z.enum(["view", "edit"]),
});

/** 멤버 권한 변경 — owner 또는 member 자기 자신 (RLS update) */
export async function changePermission(
  input: unknown,
): Promise<ActionResult> {
  const parsed = permissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "잘못된 요청입니다" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("shared_calendars")
    .update({ permission: parsed.data.permission })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/social");
  revalidatePath("/calendar");
  return { ok: true, data: undefined };
}

/** 특정 캘린더 멤버 목록 — owner 확인 후 admin 으로 프로필 조회. */
export async function fetchMembers(
  calendarId: string,
): Promise<ActionResult<CalendarMember[]>> {
  const userId = await getUserId();
  const supabase = createClient();
  const { data: cal } = await supabase
    .from("calendars")
    .select("user_id")
    .eq("id", calendarId)
    .maybeSingle();
  if (!cal || cal.user_id !== userId) {
    return { ok: false, error: "권한이 없습니다" };
  }
  try {
    const members = await getCalendarMembers(calendarId);
    return { ok: true, data: members };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "조회 실패";
    return { ok: false, error: msg };
  }
}

/** 공유받은 캘린더에서 나가기 — member 본인 권한 (RLS 보강 후 가능). */
export async function leaveCalendar(id: string): Promise<ActionResult> {
  return declineInvite(id);
}

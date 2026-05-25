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

/** 받은 초대 거절 (= row 삭제). owner 도 'pending' 이면 취소 효과. */
export async function declineInvite(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  // RLS: member 본인 update 가능, owner delete 가능. delete 권한이 owner 만이라
  // 거절은 member 가 status 를 declined 로 둘 자리가 없으니 owner-cancel 만 가능.
  // 대신 member 가 직접 delete 시도 — RLS delete 정책상 owner 만이라 실패.
  // 그래서 member 가 거절하면 status 만 변경 (예: 'pending' 그대로 두기는 부자연).
  // 단순화: owner 가 본 권한으로 취소 가능. member 거절도 같은 effect 를 위해
  // RLS 를 member delete 까지 허용하도록 보강하는 게 정공이지만, 일단 owner
  // 권한으로만 'cancel/decline' 동작. member 거절 UX 는 후속에서.
  const { error } = await supabase
    .from("shared_calendars")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/social");
  return { ok: true, data: undefined };
}

/** 멤버 제거 — owner 만 (RLS) */
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

/**
 * 공유받은 캘린더에서 나가기 — member 본인.
 * RLS delete 정책상 owner 만 가능하므로 status 만 별도 처리할 자리 없음.
 * 임시: leaveCalendar 도 declineInvite 와 같은 한계 — owner 가 제거해주는
 * 방식이 가장 간단. 후속 작업에서 member 의 leave 권한 RLS 보강 검토.
 */
export async function leaveCalendar(_id: string): Promise<ActionResult> {
  return {
    ok: false,
    error: "현재 버전에서는 캘린더 소유자에게 제거를 요청해주세요",
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

const InviteSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아니에요"),
});

/**
 * 이메일로 부부 연결 초대 보내기.
 * - 본인 이메일 차단
 * - 이미 active 인 경우는 partnerships unique index 가 막음
 * - 상대방이 존재하는 가입자인지 admin client 로 확인
 */
export async function invitePartner(formData: FormData): Promise<Result> {
  const parsed = InviteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "잘못된 입력" };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  if (user.email?.toLowerCase() === parsed.data.email.toLowerCase()) {
    return { ok: false, error: "본인 이메일은 사용할 수 없어요" };
  }

  const admin = createAdminClient();
  const { data: list } = await admin.auth.admin.listUsers();
  const target = list?.users.find(
    (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
  );
  if (!target) {
    return { ok: false, error: "해당 이메일로 가입된 사용자가 없어요" };
  }

  const { error } = await supabase.from("partnerships").insert({
    user_a_id: user.id,
    user_b_id: target.id,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "이미 진행 중인 연결이 있어요" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * 받은 초대 수락 → status='active', accepted_at=now()
 */
export async function acceptInvite(partnershipId: string): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { data, error } = await supabase
    .from("partnerships")
    .update({ status: "active", accepted_at: new Date().toISOString() })
    .eq("id", partnershipId)
    .eq("user_b_id", user.id)
    .eq("status", "pending")
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "초대를 찾을 수 없거나 이미 처리됐어요" };
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * 받은 초대 거절 또는 보낸 초대 취소 = pending row 삭제.
 */
export async function declineInvite(partnershipId: string): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { data, error } = await supabase
    .from("partnerships")
    .delete()
    .eq("id", partnershipId)
    .eq("status", "pending")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "초대를 찾을 수 없어요" };
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * 부부 해지 → status='ended', ended_at=now(). row 의 partner_id 는 그대로 → 양쪽 영원히 access.
 */
export async function endPartnership(partnershipId: string): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { data, error } = await supabase
    .from("partnerships")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", partnershipId)
    .eq("status", "active")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "활성 부부 연결을 찾을 수 없어요" };
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

// features/widgets/server/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { WIDGET_KEYS } from "../lib/items";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const hiddenSchema = z
  .array(z.enum(WIDGET_KEYS as [string, ...string[]]))
  .max(WIDGET_KEYS.length);

/** 메인 위젯 보임/숨김 저장. hidden 배열 (=숨길 키). */
export async function updateWidgetVisibility(
  hidden: unknown,
): Promise<ActionResult> {
  const parsed = hiddenSchema.safeParse(hidden);
  if (!parsed.success) return { ok: false, error: "잘못된 위젯 키" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("profiles")
    .update({ widget_visibility: parsed.data })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

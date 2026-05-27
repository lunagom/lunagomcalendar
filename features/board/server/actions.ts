// features/board/server/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getPostDetail } from "./queries";
import type { PostListItem, CommentItem } from "./queries";

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

const postSchema = z.object({
  calendar_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});

export async function createPost(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "제목·본문을 입력해주세요" };
  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("board_posts")
    .insert({ ...parsed.data, author_id: userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/board");
  return { ok: true, data: { id: data.id } };
}

const updatePostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});

export async function updatePost(input: unknown): Promise<ActionResult> {
  const parsed = updatePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "제목·본문을 입력해주세요" };
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("board_posts")
    .update({ title: parsed.data.title, body: parsed.data.body })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/board");
  return { ok: true, data: undefined };
}

export async function deletePost(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("board_posts")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0)
    return { ok: false, error: "권한이 없거나 이미 삭제된 글입니다" };
  revalidatePath("/board");
  return { ok: true, data: undefined };
}

const commentSchema = z.object({
  post_id: z.string().uuid(),
  body: z.string().min(1).max(1000),
});

export async function createComment(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "댓글을 입력해주세요" };
  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("board_comments")
    .insert({ ...parsed.data, author_id: userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/board");
  return { ok: true, data: { id: data.id } };
}

export async function deleteComment(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("board_comments")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0)
    return { ok: false, error: "권한이 없거나 이미 삭제된 댓글입니다" };
  revalidatePath("/board");
  return { ok: true, data: undefined };
}

const likeSchema = z.object({
  target_type: z.enum(["post", "comment"]),
  target_id: z.string().uuid(),
});

/** 좋아요 토글 — 존재하면 delete, 없으면 insert. */
export async function toggleLike(
  input: unknown,
): Promise<ActionResult<{ liked: boolean }>> {
  const parsed = likeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "잘못된 요청" };
  const userId = await getUserId();
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("board_likes")
    .select("user_id")
    .eq("user_id", userId)
    .eq("target_type", parsed.data.target_type)
    .eq("target_id", parsed.data.target_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("board_likes")
      .delete()
      .eq("user_id", userId)
      .eq("target_type", parsed.data.target_type)
      .eq("target_id", parsed.data.target_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/board");
    return { ok: true, data: { liked: false } };
  }
  const { error } = await supabase
    .from("board_likes")
    .insert({ user_id: userId, ...parsed.data });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/board");
  return { ok: true, data: { liked: true } };
}

/** 게시판 마지막 본 시각 갱신 — board_reads upsert. */
export async function markBoardRead(
  calendarId: string,
): Promise<ActionResult> {
  const userId = await getUserId();
  const supabase = createClient();
  const { error } = await supabase.from("board_reads").upsert(
    {
      user_id: userId,
      calendar_id: calendarId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "user_id,calendar_id" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/** PostDetailDialog 가 client 라 server query 를 action 으로 wrap. */
export async function fetchPostDetail(
  postId: string,
): Promise<
  ActionResult<{ post: PostListItem; comments: CommentItem[] }>
> {
  await getUserId();
  try {
    const r = await getPostDetail(postId);
    if (!r) return { ok: false, error: "글을 찾을 수 없습니다" };
    return { ok: true, data: r };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "조회 실패";
    return { ok: false, error: msg };
  }
}

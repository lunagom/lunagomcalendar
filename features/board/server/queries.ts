// features/board/server/queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PostListItem = {
  id: string;
  calendar_id: string;
  author_id: string;
  author_nickname: string | null;
  title: string;
  body: string;
  created_at: string;
  comment_count: number;
  like_count: number;
  liked_by_me: boolean;
};

export type CommentItem = {
  id: string;
  post_id: string;
  author_id: string;
  author_nickname: string | null;
  body: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
};

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** 캘린더의 글 목록 (최신순). 댓글/좋아요 카운트 + 내 좋아요 여부 포함. */
export async function getPostsForCalendar(
  calendarId: string,
): Promise<PostListItem[]> {
  const supabase = createClient();
  const me = await currentUserId();
  if (!me) return [];

  const { data: posts, error } = await supabase
    .from("board_posts")
    .select("id, calendar_id, author_id, title, body, created_at")
    .eq("calendar_id", calendarId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));

  // 댓글 카운트
  const { data: comments } = await supabase
    .from("board_comments")
    .select("post_id")
    .in("post_id", postIds);
  const commentCount = new Map<string, number>();
  for (const c of comments ?? []) {
    commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
  }

  // 좋아요
  const { data: likes } = await supabase
    .from("board_likes")
    .select("target_id, user_id")
    .eq("target_type", "post")
    .in("target_id", postIds);
  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likes ?? []) {
    likeCount.set(l.target_id, (likeCount.get(l.target_id) ?? 0) + 1);
    if (l.user_id === me) likedByMe.add(l.target_id);
  }

  // 작성자 닉네임 (admin client 로 profiles RLS 우회)
  const admin = createAdminClient();
  const { data: profs } = await admin
    .from("profiles")
    .select("id, nickname")
    .in("id", authorIds);
  const nick = new Map<string, string | null>(
    (profs ?? []).map((p) => [p.id, p.nickname]),
  );

  return posts.map((p) => ({
    ...p,
    author_nickname: nick.get(p.author_id) ?? null,
    comment_count: commentCount.get(p.id) ?? 0,
    like_count: likeCount.get(p.id) ?? 0,
    liked_by_me: likedByMe.has(p.id),
  }));
}

/** 단일 글 + 댓글들 + 좋아요. */
export async function getPostDetail(postId: string): Promise<{
  post: PostListItem;
  comments: CommentItem[];
} | null> {
  const supabase = createClient();
  const me = await currentUserId();
  if (!me) return null;

  const { data: post } = await supabase
    .from("board_posts")
    .select("id, calendar_id, author_id, title, body, created_at")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return null;

  // 글 좋아요
  const { data: postLikes } = await supabase
    .from("board_likes")
    .select("user_id")
    .eq("target_type", "post")
    .eq("target_id", postId);
  const postLikeCount = postLikes?.length ?? 0;
  const postLikedByMe = (postLikes ?? []).some((l) => l.user_id === me);

  // 댓글
  const { data: comments } = await supabase
    .from("board_comments")
    .select("id, post_id, author_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at");
  const commentIds = (comments ?? []).map((c) => c.id);

  // 댓글 좋아요
  let cLikeCount = new Map<string, number>();
  let cLikedByMe = new Set<string>();
  if (commentIds.length > 0) {
    const { data: cLikes } = await supabase
      .from("board_likes")
      .select("target_id, user_id")
      .eq("target_type", "comment")
      .in("target_id", commentIds);
    for (const l of cLikes ?? []) {
      cLikeCount.set(l.target_id, (cLikeCount.get(l.target_id) ?? 0) + 1);
      if (l.user_id === me) cLikedByMe.add(l.target_id);
    }
  }

  const allAuthorIds = Array.from(
    new Set([post.author_id, ...(comments ?? []).map((c) => c.author_id)]),
  );
  const admin = createAdminClient();
  const { data: profs } = await admin
    .from("profiles")
    .select("id, nickname")
    .in("id", allAuthorIds);
  const nick = new Map<string, string | null>(
    (profs ?? []).map((p) => [p.id, p.nickname]),
  );

  return {
    post: {
      ...post,
      author_nickname: nick.get(post.author_id) ?? null,
      comment_count: comments?.length ?? 0,
      like_count: postLikeCount,
      liked_by_me: postLikedByMe,
    },
    comments: (comments ?? []).map((c) => ({
      ...c,
      author_nickname: nick.get(c.author_id) ?? null,
      like_count: cLikeCount.get(c.id) ?? 0,
      liked_by_me: cLikedByMe.has(c.id),
    })),
  };
}

/**
 * 안 본 글 카운트 — 멤버인 모든 캘린더의 last_read_at 이후 글 합산. 내가 쓴 글 제외.
 * board_* 테이블 적용 전이면 안전하게 0 반환 (layout 이 죽지 않게).
 */
export async function getUnreadBoardCount(): Promise<number> {
  try {
    const supabase = createClient();
    const me = await currentUserId();
    if (!me) return 0;

    const { data: cals } = await supabase.from("calendars").select("id");
    if (!cals || cals.length === 0) return 0;
    const calIds = cals.map((c) => c.id);

    const { data: reads } = await supabase
      .from("board_reads")
      .select("calendar_id, last_read_at")
      .in("calendar_id", calIds);
    const readMap = new Map(
      (reads ?? []).map((r) => [r.calendar_id, r.last_read_at]),
    );

    const { data: posts } = await supabase
      .from("board_posts")
      .select("id, calendar_id, created_at, author_id")
      .in("calendar_id", calIds);
    if (!posts) return 0;

    let unread = 0;
    for (const p of posts) {
      if (p.author_id === me) continue;
      const lastRead = readMap.get(p.calendar_id);
      if (!lastRead || new Date(p.created_at) > new Date(lastRead)) unread++;
    }
    return unread;
  } catch {
    return 0;
  }
}

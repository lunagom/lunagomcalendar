"use client";

import { MessageSquare } from "lucide-react";
import { LikeButton } from "./LikeButton";
import type { PostListItem } from "../server/queries";

type Props = {
  post: PostListItem;
  onClick: () => void;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

export function PostCard({ post, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border bg-card p-4 text-left transition hover:border-primary/60 hover:shadow-sm"
    >
      <h3 className="mb-1 font-semibold">{post.title}</h3>
      <p className="line-clamp-2 text-sm text-muted-foreground whitespace-pre-wrap">
        {post.body}
      </p>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{post.author_nickname ?? "(알 수 없음)"}</span>
        <span>·</span>
        <span>{relativeTime(post.created_at)}</span>
        <div className="ml-auto flex items-center gap-3">
          {post.comment_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {post.comment_count}
            </span>
          )}
          <LikeButton
            targetType="post"
            targetId={post.id}
            count={post.like_count}
            liked={post.liked_by_me}
          />
        </div>
      </div>
    </button>
  );
}

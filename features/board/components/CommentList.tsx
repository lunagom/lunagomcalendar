"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LikeButton } from "./LikeButton";
import { createComment, deleteComment } from "../server/actions";
import type { CommentItem } from "../server/queries";

type Props = {
  postId: string;
  comments: CommentItem[];
  currentUserId: string;
  onMutate: () => void;
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

export function CommentList({ postId, comments, currentUserId, onMutate }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await createComment({ post_id: postId, body: body.trim() });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setBody("");
      onMutate();
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const r = await deleteComment(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onMutate();
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        댓글 {comments.length}
      </p>
      {comments.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">아직 댓글이 없어요</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">
                  {c.author_nickname ?? "(알 수 없음)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {relativeTime(c.created_at)}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <LikeButton
                    targetType="comment"
                    targetId={c.id}
                    count={c.like_count}
                    liked={c.liked_by_me}
                  />
                  {c.author_id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      disabled={pending}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="댓글 삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="댓글 입력"
          maxLength={1000}
          disabled={pending}
          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        />
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          작성
        </Button>
      </form>
    </div>
  );
}

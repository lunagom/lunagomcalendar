"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/features/calendar/components/DeleteConfirmDialog";
import { LikeButton } from "./LikeButton";
import { CommentList } from "./CommentList";
import { NewPostDialog } from "./NewPostDialog";
import { deletePost, fetchPostDetail } from "../server/actions";
import type { CommentItem, PostListItem } from "../server/queries";

type Props = {
  postId: string | null;
  onClose: () => void;
  currentUserId: string;
  calendarId: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PostDetailDialog({
  postId,
  onClose,
  currentUserId,
  calendarId,
}: Props) {
  const router = useRouter();
  const [post, setPost] = useState<PostListItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = async (id: string) => {
    setLoading(true);
    const r = await fetchPostDetail(id);
    setLoading(false);
    if (r.ok) {
      setPost(r.data.post);
      setComments(r.data.comments);
    } else {
      toast.error(r.error);
    }
  };

  useEffect(() => {
    if (postId) void load(postId);
    else {
      setPost(null);
      setComments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleDelete = () => {
    if (!post) return;
    startTransition(async () => {
      const r = await deletePost(post.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("삭제됐어요");
      setConfirmingDelete(false);
      onClose();
      router.refresh();
    });
  };

  const open = postId != null && !editing && !confirmingDelete;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {post?.title ?? (loading ? "불러오는 중..." : "")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              게시판 글 본문과 댓글
            </DialogDescription>
          </DialogHeader>

          {post && (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{post.author_nickname ?? "(알 수 없음)"}</span>
                <span>·</span>
                <span>{formatDate(post.created_at)}</span>
                <div className="ml-auto flex items-center gap-2">
                  <LikeButton
                    targetType="post"
                    targetId={post.id}
                    count={post.like_count}
                    liked={post.liked_by_me}
                  />
                  {post.author_id === currentUserId && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="글 수정"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="글 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm">{post.body}</p>
              <CommentList
                postId={post.id}
                comments={comments}
                currentUserId={currentUserId}
                onMutate={() => void load(post.id)}
              />
            </>
          )}

          {!post && !loading && (
            <p className="text-sm text-muted-foreground">
              글을 불러오지 못했어요
            </p>
          )}
        </DialogContent>
      </Dialog>

      {post && editing && (
        <NewPostDialog
          open={editing}
          onOpenChange={(v) => {
            setEditing(v);
            if (!v) void load(post.id);
          }}
          calendarId={calendarId}
          initial={{ id: post.id, title: post.title, body: post.body }}
        />
      )}

      <DeleteConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        onConfirm={handleDelete}
        title="글을 삭제할까요?"
        description="글과 그 안의 모든 댓글·좋아요가 함께 삭제됩니다."
      />
    </>
  );
}

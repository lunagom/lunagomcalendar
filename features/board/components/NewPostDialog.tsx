"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPost, updatePost } from "../server/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarId: string;
  /** 있으면 수정 모드. */
  initial?: { id: string; title: string; body: string };
};

export function NewPostDialog({
  open,
  onOpenChange,
  calendarId,
  initial,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("제목·본문을 입력해주세요");
      return;
    }
    startTransition(async () => {
      const r = initial
        ? await updatePost({ id: initial.id, title: title.trim(), body: body.trim() })
        : await createPost({ calendar_id: calendarId, title: title.trim(), body: body.trim() });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(initial ? "수정됐어요" : "글이 등록됐어요");
      onOpenChange(false);
      if (!initial) {
        setTitle("");
        setBody("");
      }
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "글 수정" : "새 글"}</DialogTitle>
          <DialogDescription className="sr-only">
            공유 게시판에 글을 작성합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="post-title">제목 *</Label>
            <Input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={pending}
            />
          </div>
          <div>
            <Label htmlFor="post-body">본문 *</Label>
            <textarea
              id="post-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              maxLength={4000}
              disabled={pending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

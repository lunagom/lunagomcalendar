"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePermission,
  fetchMembers,
  inviteByEmail,
  removeMember,
} from "../server/actions";
import type { CalendarMember } from "../server/queries";

type Props = {
  calendarId: string;
  calendarName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShareDialog({
  calendarId,
  calendarName,
  open,
  onOpenChange,
}: Props) {
  const [members, setMembers] = useState<CalendarMember[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const reload = async () => {
    setLoading(true);
    const r = await fetchMembers(calendarId);
    setLoading(false);
    if (r.ok) setMembers(r.data);
    else toast.error(r.error);
  };

  useEffect(() => {
    if (open) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, calendarId]);

  const handleInvite = () => {
    if (!email.trim()) {
      toast.error("이메일을 입력하세요");
      return;
    }
    startTransition(async () => {
      const r = await inviteByEmail({
        calendarId,
        email: email.trim(),
        permission,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("초대를 보냈어요");
      setEmail("");
      void reload();
    });
  };

  const handlePermissionChange = (id: string, value: "view" | "edit") => {
    startTransition(async () => {
      const r = await changePermission({ id, permission: value });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("권한이 변경됐어요");
        void reload();
      }
    });
  };

  const handleRemove = (id: string, isPending: boolean) => {
    startTransition(async () => {
      const r = await removeMember(id);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(isPending ? "초대를 취소했어요" : "멤버를 제거했어요");
        void reload();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>"{calendarName}" 공유 관리</DialogTitle>
          <DialogDescription className="sr-only">
            이 캘린더의 멤버를 초대하거나 권한을 변경합니다.
          </DialogDescription>
        </DialogHeader>

        {/* 초대 입력 */}
        <div className="space-y-2">
          <Label htmlFor="invite-email">새 멤버 초대</Label>
          <div className="flex gap-2">
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInvite();
              }}
            />
            <select
              value={permission}
              onChange={(e) =>
                setPermission(e.target.value as "view" | "edit")
              }
              className="rounded-md border border-input bg-background px-2 text-sm"
              disabled={pending}
            >
              <option value="view">보기</option>
              <option value="edit">편집</option>
            </select>
            <Button onClick={handleInvite} disabled={pending}>
              <UserPlus className="mr-1 h-4 w-4" /> 초대
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            가입한 사용자만 초대할 수 있어요.
          </p>
        </div>

        {/* 멤버 목록 */}
        <div className="space-y-2 pt-2">
          <Label>멤버</Label>
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 멤버가 없어요. 위에서 이메일로 초대해보세요.
            </p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {m.member?.nickname ?? "(알 수 없는 사용자)"}
                    {m.status === "pending" && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        · 초대 대기
                      </span>
                    )}
                  </span>
                  <select
                    className="rounded border border-input bg-background px-1 py-0.5 text-xs"
                    value={m.permission}
                    disabled={pending}
                    onChange={(e) =>
                      handlePermissionChange(
                        m.id,
                        e.target.value as "view" | "edit",
                      )
                    }
                  >
                    <option value="view">보기</option>
                    <option value="edit">편집</option>
                  </select>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      handleRemove(m.id, m.status === "pending")
                    }
                    aria-label="제거"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

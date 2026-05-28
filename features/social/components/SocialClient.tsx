"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/features/calendar/components/DeleteConfirmDialog";
import {
  acceptInvite,
  changePermission,
  declineInvite,
  leaveCalendar,
  removeMember,
  type ActionResult,
} from "../server/actions";
import type {
  CalendarMember,
  CalendarSnippet,
  SharedCalendarWithMeta,
} from "../server/queries";

type Props = {
  invites: SharedCalendarWithMeta[];
  accepted: SharedCalendarWithMeta[];
  owned: { calendar: CalendarSnippet; members: CalendarMember[] }[];
};

export function SocialClient({ invites, accepted, owned }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [leaving, setLeaving] = useState<SharedCalendarWithMeta | null>(null);

  const confirmLeave = () => {
    if (!leaving) return;
    startTransition(async () => {
      const r = await leaveCalendar(leaving.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("캘린더에서 나왔어요");
      setLeaving(null);
      router.refresh();
    });
  };

  const handle = (
    fn: () => Promise<ActionResult>,
    successMsg: string,
  ) => {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(successMsg);
        router.refresh();
      }
    });
  };

  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-6">
      {/* 1. 받은 초대 */}
      <section>
        <h2 className="mb-3 text-base font-semibold">받은 초대</h2>
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">받은 초대가 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-3 rounded-lg border border-border/40 p-3"
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-full"
                  style={{ backgroundColor: inv.calendar?.color ?? "#888" }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {inv.calendar?.name ?? "(삭제된 캘린더)"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {inv.owner?.nickname ?? "(알 수 없는 사용자)"} 님이 초대 ·{" "}
                    {inv.permission === "edit" ? "편집" : "보기"} 권한
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => handle(() => acceptInvite(inv.id), "초대를 수락했어요")}
                >
                  <Check className="mr-1 h-4 w-4" /> 수락
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handle(() => declineInvite(inv.id), "초대를 거절했어요")}
                >
                  거절
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. 함께 보는 캘린더 (내가 받은 공유) */}
      <section>
        <h2 className="mb-3 text-base font-semibold">함께 보는 캘린더</h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            공유받은 캘린더가 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {accepted.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-border/40 p-3"
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-full"
                  style={{ backgroundColor: s.calendar?.color ?? "#888" }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.calendar?.name ?? "(삭제된 캘린더)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.owner?.nickname ?? "(알 수 없는 사용자)"} ·{" "}
                    {s.permission === "edit" ? "편집" : "보기"} 권한
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setLeaving(s)}
                  className="gap-1.5 text-muted-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  나가기
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. 내가 공유한 캘린더 (owner 시점) */}
      <section>
        <h2 className="mb-3 text-base font-semibold">내가 공유한 캘린더</h2>
        {owned.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 공유한 캘린더가 없어요. 캘린더 설정의 "공유" 에서 멤버를 초대해보세요.
          </p>
        ) : (
          <div className="space-y-4">
            {owned.map((g) => (
              <div key={g.calendar.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: g.calendar.color }}
                    aria-hidden
                  />
                  <h3 className="text-sm font-medium">{g.calendar.name}</h3>
                </div>
                <ul className="space-y-2">
                  {g.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {m.member?.nickname ?? "(알 수 없는 사용자)"}
                        {m.status === "pending" && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            · 초대 대기
                          </span>
                        )}
                      </span>
                      <select
                        className="rounded border bg-background px-1 py-0.5 text-xs"
                        value={m.permission}
                        disabled={pending}
                        onChange={(e) =>
                          handle(
                            () =>
                              changePermission({
                                id: m.id,
                                permission: e.target.value as "view" | "edit",
                              }),
                            "권한이 변경됐어요",
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
                          handle(
                            () => removeMember(m.id),
                            m.status === "pending"
                              ? "초대를 취소했어요"
                              : "멤버를 제거했어요",
                          )
                        }
                        aria-label="제거"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <DeleteConfirmDialog
        open={!!leaving}
        onOpenChange={(v) => !v && setLeaving(null)}
        onConfirm={confirmLeave}
        title="캘린더에서 나갈까요?"
        description={
          leaving
            ? `"${leaving.calendar?.name ?? "(이 캘린더)"}" 에서 나가면 더 이상 이 캘린더의 일정을 볼 수 없어요. 다시 보려면 소유자에게 재초대를 받아야 해요.`
            : ""
        }
      />
    </div>
  );
}

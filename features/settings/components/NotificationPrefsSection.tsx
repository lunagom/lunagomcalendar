"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  updateNotificationPrefs,
  type NotificationPrefs,
} from "../server/actions";

type Props = {
  initial: NotificationPrefs;
};

const OPTIONS: Array<{ key: keyof NotificationPrefs; label: string; description: string }> = [
  {
    key: "partnership_invite",
    label: "부부 초대 받음",
    description: "다른 사용자가 나에게 부부 연결을 요청할 때",
  },
  {
    key: "partnership_accepted",
    label: "부부 초대 수락됨",
    description: "내가 보낸 초대를 상대방이 수락했을 때",
  },
  {
    key: "partnership_ended",
    label: "부부 연결 해지",
    description: "부부 연결이 해지됐을 때",
  },
  {
    key: "daily_summary",
    label: "일일 알림",
    description: "오늘의 일정 / 정기 결제 등 매일 요약",
  },
];

export function NotificationPrefsSection({ initial }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial);
  const [pending, startTransition] = useTransition();

  const handleToggle = (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    startTransition(async () => {
      const r = await updateNotificationPrefs(next);
      if (!r.ok) {
        toast.error(r.error);
        setPrefs(prefs); // revert
        return;
      }
      toast.success("저장됐어요");
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Bell className="h-4 w-4" strokeWidth={1.8} />
        알림
      </h2>
      <div className="rounded-lg border border-border/40 p-4 space-y-3">
        {OPTIONS.map((opt) => (
          <label
            key={opt.key}
            className="flex items-start gap-3 cursor-pointer"
          >
            <Checkbox
              checked={prefs[opt.key]}
              onCheckedChange={(v) => handleToggle(opt.key, Boolean(v))}
              disabled={pending}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{opt.label}</div>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

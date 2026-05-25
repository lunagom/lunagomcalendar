"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LogOut,
  Monitor,
  Moon,
  Plus,
  Settings as SettingsIcon,
  Sun,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NewCalendarDialog } from "@/features/calendar/components/NewCalendarDialog";
import { CalendarSettingsDialog } from "@/features/calendar/components/CalendarSettingsDialog";
import {
  WIDGET_ITEMS,
  type WidgetKey,
} from "@/features/widgets/lib/items";
import { updateWidgetVisibility } from "@/features/widgets/server/actions";
import { signOut, updateNickname } from "../server/actions";
import type { CalendarRow } from "@/features/calendar/server/queries";

type Props = {
  email: string;
  initialNickname: string;
  initialHiddenWidgets: WidgetKey[];
  calendars: CalendarRow[];
  partnerSlot?: React.ReactNode;
};

const THEME_OPTIONS = [
  { value: "light", label: "라이트", icon: Sun },
  { value: "dark", label: "다크", icon: Moon },
  { value: "system", label: "시스템", icon: Monitor },
] as const;

export function SettingsClient({
  email,
  initialNickname,
  initialHiddenWidgets,
  calendars,
  partnerSlot,
}: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [nickname, setNickname] = useState(initialNickname);
  const [savedNickname, setSavedNickname] = useState(initialNickname);
  const [hiddenWidgets, setHiddenWidgets] =
    useState<WidgetKey[]>(initialHiddenWidgets);
  const [creatingCal, setCreatingCal] = useState(false);
  const [editingCal, setEditingCal] = useState<CalendarRow | null>(null);
  const [pending, startTransition] = useTransition();

  const handleWidgetToggle = (key: WidgetKey, visible: boolean) => {
    const next = visible
      ? hiddenWidgets.filter((k) => k !== key)
      : Array.from(new Set([...hiddenWidgets, key]));
    startTransition(async () => {
      const r = await updateWidgetVisibility(next);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setHiddenWidgets(next);
      toast.success("위젯 설정 저장됨");
      router.refresh();
    });
  };

  const nicknameDirty = nickname.trim() !== savedNickname;

  const handleSaveNickname = () => {
    if (!nickname.trim()) {
      toast.error("닉네임을 입력하세요");
      return;
    }
    startTransition(async () => {
      const r = await updateNickname({ nickname });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("닉네임이 변경됐어요");
      setSavedNickname(nickname.trim());
    });
  };

  const handleSignOut = () => {
    startTransition(async () => {
      const r = await signOut();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-6">
      {/* 1. 계정 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">계정</h2>
        <div className="rounded-lg border p-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" value={email} readOnly disabled />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nickname">닉네임</Label>
            <div className="flex gap-2">
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={40}
                disabled={pending}
              />
              <Button
                onClick={handleSaveNickname}
                disabled={pending || !nicknameDirty}
              >
                저장
              </Button>
            </div>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={pending}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </section>

      {/* 1.5 부부 연결 — server component 로 외부에서 주입 */}
      {partnerSlot}

      {/* 2. 테마 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">테마</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-4 text-sm transition ${
                  active
                    ? "border-primary bg-primary/5 font-medium"
                    : "hover:bg-muted/60"
                }`}
              >
                <Icon className="h-5 w-5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. 메인 위젯 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">메인 위젯</h2>
        <div className="rounded-lg border p-4 space-y-1">
          {WIDGET_ITEMS.map((w) => {
            const visible = !hiddenWidgets.includes(w.key);
            const Icon = w.icon;
            return (
              <label
                key={w.key}
                className="flex items-center gap-3 py-1.5 cursor-pointer"
              >
                <Checkbox
                  checked={visible}
                  onCheckedChange={(v) =>
                    handleWidgetToggle(w.key, Boolean(v))
                  }
                  disabled={pending}
                />
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{w.label}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* 4. 연결된 캘린더 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">연결된 캘린더</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreatingCal(true)}
            disabled={pending}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />새 캘린더
          </Button>
        </div>
        {calendars.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 캘린더가 없어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {calendars.map((cal) => (
              <li
                key={cal.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full"
                  style={{ backgroundColor: cal.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {cal.name}
                  {cal.is_default && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      · 기본
                    </span>
                  )}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingCal(cal)}
                  aria-label="캘린더 설정"
                >
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NewCalendarDialog
        open={creatingCal}
        onOpenChange={setCreatingCal}
      />
      <CalendarSettingsDialog
        calendar={editingCal}
        onClose={() => setEditingCal(null)}
      />
    </div>
  );
}

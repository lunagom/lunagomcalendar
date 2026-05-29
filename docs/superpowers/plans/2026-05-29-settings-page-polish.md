# 설정 페이지 폴리시 + 신규 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 설정 페이지에 페이지 헤더, 섹션 헤더 통일, stagger 진입, 인터랙션 폴리시 + 신규 섹션 3개 (알림 설정, 데이터 내보내기, 계정 삭제) 추가.

**Architecture:** DB 마이그레이션 (notification_prefs 컬럼) + 4개 신규 컴포넌트 + 3개 신규 server action + SettingsClient 통합.

**Tech Stack:** Next.js 14, React 18, framer-motion, Supabase, shadcn/ui, lucide-react.

**Spec 출처:** `docs/superpowers/specs/2026-05-29-settings-page-polish-design.md`

---

## File Structure

### Create
- `supabase/migrations/20260529120000_profiles_notification_prefs.sql`
- `notification-prefs-bootstrap.sql` (gitignored)
- `features/settings/components/SettingsPageHeader.tsx`
- `features/settings/components/NotificationPrefsSection.tsx`
- `features/settings/components/DataExportSection.tsx`
- `features/settings/components/AccountDeleteSection.tsx`

### Modify
- `types/database.ts` — profiles.notification_prefs 추가
- `features/settings/server/actions.ts` — 3개 신규 action
- `features/settings/components/SettingsClient.tsx` — 통합 (헤더 + 섹션 헤더 + stagger + 마이크로 + 신규 섹션)
- `app/(app)/settings/page.tsx` — notification_prefs fetch
- `.gitignore` — notification-prefs-bootstrap.sql 추가

---

## Task 1: DB 마이그레이션 + 타입 갱신

**Files:**
- Create: `supabase/migrations/20260529120000_profiles_notification_prefs.sql`
- Create: `notification-prefs-bootstrap.sql`
- Modify: `types/database.ts`
- Modify: `.gitignore`

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/20260529120000_profiles_notification_prefs.sql`:

```sql
-- supabase/migrations/20260529120000_profiles_notification_prefs.sql
-- profiles 에 알림 환경설정 컬럼 추가
-- null = 모두 ON (legacy 호환)
-- 예시 값: {"partnership_invite": false, "partnership_accepted": true, "partnership_ended": true, "daily_summary": true}

alter table public.profiles
  add column if not exists notification_prefs jsonb;
```

- [ ] **Step 2: Bootstrap SQL 작성**

`notification-prefs-bootstrap.sql` (root, gitignored):

```sql
alter table public.profiles
  add column if not exists notification_prefs jsonb;

-- 검증 (선택):
-- select count(*) from public.profiles where notification_prefs is null;
```

- [ ] **Step 3: .gitignore 갱신**

`.gitignore` 에 추가:
```
/notification-prefs-bootstrap.sql
```

- [ ] **Step 4: types/database.ts 갱신**

`profiles.Row/Insert/Update` 에 `notification_prefs: Json | null` 추가. 다른 컬럼 사이 알파벳 순.

- [ ] **Step 5: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/ types/database.ts .gitignore
git commit -m "$(cat <<'EOF'
feat(settings): profiles.notification_prefs jsonb 컬럼 추가 마이그레이션 + 타입

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: SettingsPageHeader

**Files:**
- Create: `features/settings/components/SettingsPageHeader.tsx`

- [ ] **Step 1: 작성**

```tsx
/**
 * 설정 페이지 헤더 — h1 + 부제.
 */
export function SettingsPageHeader() {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold">설정</h1>
      <p className="text-sm text-muted-foreground">
        계정과 환경설정을 관리해요
      </p>
    </header>
  );
}
```

- [ ] **Step 2: 타입체크 + Commit**

```bash
pnpm tsc --noEmit
git add features/settings/components/SettingsPageHeader.tsx
git commit -m "$(cat <<'EOF'
feat(settings): SettingsPageHeader — h1 + 부제

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Server actions (3개 신규)

**Files:**
- Modify: `features/settings/server/actions.ts`

- [ ] **Step 1: Read 현재 actions.ts**

기존 패턴 (getUserId, ActionResult 등) 확인.

- [ ] **Step 2: updateNotificationPrefs 추가**

```ts
const NotificationPrefsSchema = z.object({
  partnership_invite: z.boolean(),
  partnership_accepted: z.boolean(),
  partnership_ended: z.boolean(),
  daily_summary: z.boolean(),
});

export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

export async function updateNotificationPrefs(
  input: unknown,
): Promise<ActionResult> {
  const parsed = NotificationPrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "잘못된 입력" };
  const userId = await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: parsed.data })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
```

- [ ] **Step 3: exportMyData 추가**

```ts
export async function exportMyData(): Promise<
  ActionResult<{ json: string; filename: string }>
> {
  const userId = await getUserId();
  const supabase = createClient();

  const [
    profileRes,
    calendarsRes,
    eventsRes,
    expensesRes,
    incomesRes,
    tasksRes,
    subscriptionsRes,
    recurringIncomesRes,
    budgetsRes,
    monthlyTargetsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("calendars").select("*").eq("user_id", userId),
    supabase.from("events").select("*").eq("user_id", userId),
    supabase.from("expenses").select("*").eq("user_id", userId),
    supabase.from("incomes").select("*").eq("user_id", userId),
    supabase.from("tasks").select("*").eq("user_id", userId),
    supabase.from("subscriptions").select("*").eq("user_id", userId),
    supabase.from("recurring_incomes").select("*").eq("user_id", userId),
    supabase.from("budgets").select("*").eq("user_id", userId),
    supabase.from("monthly_targets").select("*").eq("user_id", userId),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profileRes.data,
    calendars: calendarsRes.data,
    events: eventsRes.data,
    expenses: expensesRes.data,
    incomes: incomesRes.data,
    tasks: tasksRes.data,
    subscriptions: subscriptionsRes.data,
    recurring_incomes: recurringIncomesRes.data,
    budgets: budgetsRes.data,
    monthly_targets: monthlyTargetsRes.data,
  };
  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    data: { json, filename: `lunabear-export-${date}.json` },
  };
}
```

- [ ] **Step 4: deleteMyAccount 추가**

상단에 `import { createAdminClient } from "@/lib/supabase/admin";` 추가 (없으면).

```ts
export async function deleteMyAccount(
  confirmationEmail: string,
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  if (
    !user.email ||
    user.email.toLowerCase() !== confirmationEmail.trim().toLowerCase()
  ) {
    return { ok: false, error: "이메일이 일치하지 않아요" };
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: error.message };
  await supabase.auth.signOut();
  return { ok: true, data: undefined };
}
```

- [ ] **Step 5: 타입체크 + Commit**

```bash
pnpm tsc --noEmit
git add features/settings/server/actions.ts
git commit -m "$(cat <<'EOF'
feat(settings): updateNotificationPrefs + exportMyData + deleteMyAccount actions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: NotificationPrefsSection

**Files:**
- Create: `features/settings/components/NotificationPrefsSection.tsx`

- [ ] **Step 1: 작성**

```tsx
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
```

- [ ] **Step 2: 타입체크 + Commit**

```bash
pnpm tsc --noEmit
git add features/settings/components/NotificationPrefsSection.tsx
git commit -m "$(cat <<'EOF'
feat(settings): NotificationPrefsSection — 4개 알림 토글

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: DataExportSection

**Files:**
- Create: `features/settings/components/DataExportSection.tsx`

- [ ] **Step 1: 작성**

```tsx
"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportMyData } from "../server/actions";

export function DataExportSection() {
  const [pending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      const r = await exportMyData();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const blob = new Blob([r.data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("다운로드 시작됐어요");
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Download className="h-4 w-4" strokeWidth={1.8} />
        데이터 내보내기
      </h2>
      <div className="rounded-lg border border-border/40 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          내가 등록한 모든 데이터(일정, 가계부, 할 일 등)를 JSON 파일로
          내보냅니다.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={pending}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
          {pending ? "준비 중..." : "JSON 다운로드"}
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 타입체크 + Commit**

```bash
pnpm tsc --noEmit
git add features/settings/components/DataExportSection.tsx
git commit -m "$(cat <<'EOF'
feat(settings): DataExportSection — 모든 사용자 데이터 JSON 다운로드

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: AccountDeleteSection

**Files:**
- Create: `features/settings/components/AccountDeleteSection.tsx`

- [ ] **Step 1: 작성**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMyAccount } from "../server/actions";

type Props = {
  userEmail: string;
};

export function AccountDeleteSection({ userEmail }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [pending, startTransition] = useTransition();

  const canDelete = confirmInput.trim().toLowerCase() === userEmail.toLowerCase();

  const handleDelete = () => {
    if (!canDelete) return;
    startTransition(async () => {
      const r = await deleteMyAccount(confirmInput);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("계정이 삭제됐어요");
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
        <Trash2 className="h-4 w-4" strokeWidth={1.8} />
        위험 영역
      </h2>
      <div className="rounded-lg border border-destructive/40 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          계정을 삭제하면 등록된 모든 데이터가 영구 삭제되며 복구할 수 없어요.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          계정 삭제
        </Button>
      </div>

      <AlertDialog
        open={confirming}
        onOpenChange={(v) => {
          setConfirming(v);
          if (!v) setConfirmInput("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 계정을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없어요. 확인을 위해 아래에 이메일을
              정확히 입력해주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-email">{userEmail}</Label>
            <Input
              id="confirm-email"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="이메일 입력"
              disabled={pending}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!canDelete || pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "삭제 중..." : "영구 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
```

- [ ] **Step 2: 타입체크 + Commit**

```bash
pnpm tsc --noEmit
git add features/settings/components/AccountDeleteSection.tsx
git commit -m "$(cat <<'EOF'
feat(settings): AccountDeleteSection — 이메일 일치 확인 + 계정 영구 삭제

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: SettingsClient 통합 (헤더 + 섹션 통일 + stagger + 신규 섹션)

**Files:**
- Modify: `features/settings/components/SettingsClient.tsx`

- [ ] **Step 1: Read 현재 파일**

- [ ] **Step 2: 변경사항**

1. Props 에 `initialNotificationPrefs: NotificationPrefs` 추가
2. imports 추가:
```tsx
import { motion } from "framer-motion";
import { SettingsPageHeader } from "./SettingsPageHeader";
import { NotificationPrefsSection } from "./NotificationPrefsSection";
import { DataExportSection } from "./DataExportSection";
import { AccountDeleteSection } from "./AccountDeleteSection";
import type { NotificationPrefs } from "../server/actions";
```

3. stagger helper:
```tsx
const stagger = (idx: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: idx * 0.06, ease: "easeOut" as const },
});
```

4. 모든 섹션 헤더 `<h2 className="text-base font-semibold">` → `<h2 className="text-lg font-semibold">`

5. 테마 카드에 `active:scale-[0.97]` 추가:
```tsx
className={`flex flex-col items-center gap-1.5 rounded-lg border p-4 text-sm transition-all duration-200 active:scale-[0.97] ${
  active
    ? "border-primary bg-primary/5 font-medium"
    : "hover:bg-muted/60"
}`}
```

6. 위젯 라벨에 hover 추가:
```tsx
<label
  key={w.key}
  className="flex items-center gap-3 py-1.5 cursor-pointer -mx-2 px-2 rounded transition-colors hover:bg-accent/30"
>
```

7. 캘린더 li 에 hover 추가:
```tsx
<li
  key={cal.id}
  className="flex items-center gap-3 rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted/30"
>
```

8. JSX 전체 구조 — 페이지 헤더 + 각 섹션을 motion.div stagger 로 감쌈:

```tsx
return (
  <div className="container mx-auto max-w-3xl space-y-8 px-4 py-6 md:px-6 md:py-8">
    <motion.div {...stagger(0)}>
      <SettingsPageHeader />
    </motion.div>
    
    <motion.div {...stagger(1)}>
      {/* 1. 계정 섹션 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">계정</h2>
        ...
      </section>
    </motion.div>

    <motion.div {...stagger(2)}>
      {partnerSlot}
    </motion.div>

    <motion.div {...stagger(3)}>
      {/* 2. 테마 */}
      ...
    </motion.div>

    <motion.div {...stagger(4)}>
      {/* 3. 메인 위젯 */}
      ...
    </motion.div>

    <motion.div {...stagger(5)}>
      {/* 4. 연결된 캘린더 */}
      ...
    </motion.div>

    <motion.div {...stagger(6)}>
      <NotificationPrefsSection initial={initialNotificationPrefs} />
    </motion.div>

    <motion.div {...stagger(7)}>
      <DataExportSection />
    </motion.div>

    <motion.div {...stagger(8)}>
      <AccountDeleteSection userEmail={email} />
    </motion.div>

    {/* dialogs (기존 그대로) */}
  </div>
);
```

- [ ] **Step 3: 타입체크 + /settings 200**

```bash
pnpm tsc --noEmit
curl -s -o /dev/null -w "/settings: %{http_code}\n" http://localhost:3000/settings
```
Expected: tsc 0, curl 307

- [ ] **Step 4: Commit**

```bash
git add features/settings/components/SettingsClient.tsx
git commit -m "$(cat <<'EOF'
feat(settings): SettingsClient 통합 — 헤더+섹션통일+stagger+마이크로+신규3섹션

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: page.tsx 갱신 (notification_prefs fetch + prop drilling)

**Files:**
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: 갱신**

`app/(app)/settings/page.tsx`:

```tsx
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCalendars } from "@/features/calendar/server/queries";
import { normalizeHidden } from "@/features/widgets/lib/items";
import { SettingsClient } from "@/features/settings/components/SettingsClient";
import { PartnerSection } from "@/features/partnership/components/PartnerSection";
import type { NotificationPrefs } from "@/features/settings/server/actions";

export const metadata = { title: "설정" };

const DEFAULT_PREFS: NotificationPrefs = {
  partnership_invite: true,
  partnership_accepted: true,
  partnership_ended: true,
  daily_summary: true,
};

function parsePrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object") return DEFAULT_PREFS;
  const o = raw as Record<string, unknown>;
  return {
    partnership_invite:
      typeof o.partnership_invite === "boolean" ? o.partnership_invite : true,
    partnership_accepted:
      typeof o.partnership_accepted === "boolean" ? o.partnership_accepted : true,
    partnership_ended:
      typeof o.partnership_ended === "boolean" ? o.partnership_ended : true,
    daily_summary:
      typeof o.daily_summary === "boolean" ? o.daily_summary : true,
  };
}

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, widget_visibility, notification_prefs")
    .eq("id", user.id)
    .maybeSingle();

  const calendars = await getCalendars();

  return (
    <SettingsClient
      email={user.email ?? ""}
      initialNickname={profile?.nickname ?? ""}
      initialHiddenWidgets={normalizeHidden(profile?.widget_visibility)}
      initialNotificationPrefs={parsePrefs(profile?.notification_prefs)}
      calendars={calendars}
      partnerSlot={<PartnerSection />}
    />
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add 'app/(app)/settings/page.tsx'
git commit -m "$(cat <<'EOF'
feat(settings): page.tsx — notification_prefs fetch + parse + prop drill

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Supabase Dashboard SQL 적용 (사용자 수동)

**사용자 작업:**

1. https://supabase.com/dashboard/project/rhtnszvdeqmacwawnznj/sql/new (prod) 접속
2. `notification-prefs-bootstrap.sql` 파일 내용 붙여넣기 → Run
3. https://supabase.com/dashboard/project/rkqtcuaifhwyyzbavhio/sql/new (dev) 동일 적용
4. 검증: `select count(*) from public.profiles where notification_prefs is null;` — 모든 행이 null 인 것이 정상 (기본값 없음)

---

## Task 10: 최종 회귀 + push

- [ ] **Step 1: 전체 검증**

```bash
pnpm tsc --noEmit
pnpm lint
curl -s -o /dev/null -w "/settings: %{http_code}\n" http://localhost:3000/settings
```
Expected: tsc 0, lint clean, curl 307

- [ ] **Step 2: 시각 회귀**

`/settings`:
- 페이지 헤더 "설정" h1 + 부제
- 섹션 헤더 모두 text-lg
- 진입 시 stagger
- 테마 카드 클릭 시 scale 미세
- 위젯 라벨 hover bg
- 캘린더 항목 hover bg
- 알림 토글 4개 동작
- JSON 다운로드 동작
- 계정 삭제 다이얼로그 — 이메일 입력 일치 검증

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 페이지 헤더 → Task 2
- ✅ 섹션 헤더 통일 → Task 7
- ✅ Stagger 진입 → Task 7
- ✅ 마이크로 (테마/위젯/캘린더) → Task 7
- ✅ DB 마이그레이션 → Task 1
- ✅ updateNotificationPrefs → Task 3
- ✅ exportMyData → Task 3
- ✅ deleteMyAccount → Task 3
- ✅ NotificationPrefsSection → Task 4
- ✅ DataExportSection → Task 5
- ✅ AccountDeleteSection → Task 6
- ✅ SettingsClient 통합 → Task 7
- ✅ page.tsx 갱신 → Task 8
- ✅ Supabase 콘솔 안내 → Task 9
- ✅ 회귀 → Task 10

**2. Placeholder scan:** Task 7 의 변경 항목 8개 — 상세 코드 제공.

**3. Type consistency:** NotificationPrefs type 이 actions.ts → page.tsx → SettingsClient → NotificationPrefsSection 일관.

**4. 의존성 순서:**
- Task 1 (DB) — 가장 먼저
- Task 2, 3 (header, actions) — Task 1 후
- Task 4, 5, 6 (3 신규 섹션) — Task 3 후
- Task 7 (SettingsClient 통합) — Task 2, 4, 5, 6 후
- Task 8 (page.tsx) — Task 1, 3, 7 후
- Task 9 (Supabase 수동) — 작업 중 또는 마지막
- Task 10 — 모두 후

권장 순서: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

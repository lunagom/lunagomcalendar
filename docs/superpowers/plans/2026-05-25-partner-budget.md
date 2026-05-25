# 부부 가계부 공유 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부부로 등록된 두 사용자가 가계부 데이터(expenses/subscriptions/budgets/monthly_targets)를 100% 양방향 공유. /settings 의 새 섹션에서 초대·수락·해지, 가계부 row 옆에 ❤️ 표시.

**Architecture:** 새 `partnerships` 테이블 + 기존 4 테이블에 `partner_id` 컬럼. INSERT 시 trigger 가 활성 partnership 의 상대 user_id 를 자동 채움. RLS 정책이 `auth.uid() = user_id OR auth.uid() = partner_id` 로 변경되어 양쪽 모두 read/insert/update/delete. 해지 후에도 row 의 partner_id 가 남아 영원히 양쪽 access.

**Tech Stack:** Supabase Postgres (RLS + trigger), Next.js 14 server actions + server components, Tailwind, lucide-react

**작업 디렉토리:** `C:\dev\lunabear-calendar`

**Spec:** `docs/superpowers/specs/2026-05-25-partner-budget-design.md`

---

## 파일 변경 맵

```
supabase/migrations/
  20260525160000_partnerships.sql              # 신규 — 모든 DB 변경 한 덩어리

types/database.ts                              # 재생성 (마이그레이션 후)

features/partnership/                          # 신규 도메인
  server/
    queries.ts                                 # 신규
    actions.ts                                 # 신규
  components/
    PartnerSection.tsx                         # 신규 (server component)
    InviteForm.tsx                             # 신규 (client)
    PendingInviteCard.tsx                      # 신규 (client)
    LinkedPartnerCard.tsx                      # 신규 (client)

features/settings/components/
  SettingsClient.tsx                           # 수정 — PartnerSection 통합

app/(app)/settings/page.tsx                    # 수정 — partnership 정보 fetch + prop

features/notifications/components/
  NotificationItem.tsx                         # 수정 — ICON_MAP 3개 추가

features/expense/
  server/queries.ts                            # 수정 — partner_id select 추가
  components/ExpenseDayDetailPopup.tsx         # 수정 — row 옆 ❤️
  components/SubscriptionItem.tsx              # 수정 — ❤️
  components/MonthTargetWidget.tsx             # 수정 — ❤️
  components/BudgetEditor.tsx                  # 수정 — ❤️

prod-partner-migration.sql                     # 일회성 (gitignore, prod 적용 후 삭제)
```

---

## 실행 순서 (전체 흐름)

```
Task 1: 마이그레이션 SQL 파일 작성 (코드만)
Task 2: dev Supabase 에 마이그레이션 적용 (사용자 콘솔)
Task 3: types/database.ts 재생성
Task 4: partnership/server/queries.ts
Task 5: partnership/server/actions.ts
Task 6: partnership/components/* (3개)
Task 7: SettingsClient + page.tsx 통합
Task 8: NotificationItem ICON_MAP 추가
Task 9: expense queries 에 partner_id select 추가
Task 10: 가계부 row 들에 ❤️ 표시
Task 11: typecheck + 로컬 빌드 + 커밋 + push
Task 12: prod Supabase 에 마이그레이션 적용 (사용자 콘솔)
Task 13: 종합 검증 (2 계정 시크릿 브라우저)
```

---

## Task 1: 마이그레이션 SQL 작성

**Files:**
- Create: `C:\dev\lunabear-calendar\supabase\migrations\20260525160000_partnerships.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- ============================================================================
-- 부부 가계부 공유 — partnerships 테이블 + partner_id 4 컬럼 + RLS + trigger + 알림
-- ============================================================================

-- ─── partnerships 테이블 ─────────────────────────────────────────────────────
create table public.partnerships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','active','ended')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  constraint partnerships_no_self check (user_a_id <> user_b_id)
);

create unique index partnerships_one_active_per_user_a
  on public.partnerships (user_a_id) where status='active';
create unique index partnerships_one_active_per_user_b
  on public.partnerships (user_b_id) where status='active';
create unique index partnerships_one_pending_pair
  on public.partnerships (user_a_id, user_b_id) where status='pending';
create index partnerships_user_a_idx on public.partnerships (user_a_id, status);
create index partnerships_user_b_idx on public.partnerships (user_b_id, status);

alter table public.partnerships enable row level security;

create policy "partnerships_select_involved"
  on public.partnerships for select
  using (auth.uid() in (user_a_id, user_b_id));

create policy "partnerships_insert_self"
  on public.partnerships for insert
  with check (auth.uid() = user_a_id);

create policy "partnerships_update_involved"
  on public.partnerships for update
  using (auth.uid() in (user_a_id, user_b_id))
  with check (auth.uid() in (user_a_id, user_b_id));

create policy "partnerships_delete_involved"
  on public.partnerships for delete
  using (auth.uid() in (user_a_id, user_b_id));

-- ─── 4 테이블에 partner_id 컬럼 추가 ──────────────────────────────────────────
alter table public.expenses        add column partner_id uuid references auth.users(id);
alter table public.subscriptions   add column partner_id uuid references auth.users(id);
alter table public.budgets         add column partner_id uuid references auth.users(id);
alter table public.monthly_targets add column partner_id uuid references auth.users(id);

create index expenses_partner_idx        on public.expenses (partner_id) where partner_id is not null;
create index subscriptions_partner_idx   on public.subscriptions (partner_id) where partner_id is not null;
create index budgets_partner_idx         on public.budgets (partner_id) where partner_id is not null;
create index monthly_targets_partner_idx on public.monthly_targets (partner_id) where partner_id is not null;

-- ─── RLS 정책 재설정 — 본인 또는 파트너 ──────────────────────────────────────
drop policy "expenses_all_own" on public.expenses;
create policy "expenses_all_own_or_partner" on public.expenses for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

drop policy "subscriptions_all_own" on public.subscriptions;
create policy "subscriptions_all_own_or_partner" on public.subscriptions for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

drop policy "budgets_all_own" on public.budgets;
create policy "budgets_all_own_or_partner" on public.budgets for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

drop policy monthly_targets_select_own on public.monthly_targets;
drop policy monthly_targets_insert_own on public.monthly_targets;
drop policy monthly_targets_update_own on public.monthly_targets;
drop policy monthly_targets_delete_own on public.monthly_targets;
create policy "monthly_targets_all_own_or_partner" on public.monthly_targets for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

-- ─── INSERT trigger: partner_id 자동 채우기 ──────────────────────────────────
create or replace function public.set_partner_id_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner uuid;
begin
  if new.partner_id is not null then return new; end if;

  select case when p.user_a_id = new.user_id then p.user_b_id else p.user_a_id end
    into v_partner
    from public.partnerships p
    where (p.user_a_id = new.user_id or p.user_b_id = new.user_id)
      and p.status = 'active'
    limit 1;

  new.partner_id := v_partner;
  return new;
end;
$$;

create trigger expenses_set_partner_id
  before insert on public.expenses
  for each row execute function public.set_partner_id_on_insert();
create trigger subscriptions_set_partner_id
  before insert on public.subscriptions
  for each row execute function public.set_partner_id_on_insert();
create trigger budgets_set_partner_id
  before insert on public.budgets
  for each row execute function public.set_partner_id_on_insert();
create trigger monthly_targets_set_partner_id
  before insert on public.monthly_targets
  for each row execute function public.set_partner_id_on_insert();

-- ─── 알림 type check constraint 확장 ─────────────────────────────────────────
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'event_summary', 'subscription_due',
    'board_new_post', 'board_new_comment',
    'calendar_invite', 'board_like',
    'partnership_invite', 'partnership_accepted', 'partnership_ended'
  ));

-- ─── 알림 trigger: partnership 변화 시 알림 생성 ─────────────────────────────
create or replace function public.notify_partnership_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter_nickname text;
begin
  if new.status <> 'pending' then return new; end if;
  select nickname into v_inviter_nickname from public.profiles where id = new.user_a_id;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  values (
    new.user_b_id, 'partnership_invite',
    '새 부부 연결 요청',
    coalesce(v_inviter_nickname, '누군가') || ' 가 부부 연결을 요청했어요',
    '/settings',
    'partnership_invite:' || new.id::text
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
exception when others then
  return new;
end;
$$;

create trigger partnerships_invite_notify
  after insert on public.partnerships
  for each row execute function public.notify_partnership_invite();

create or replace function public.notify_partnership_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a_nickname text;
  v_b_nickname text;
begin
  -- pending → active (수락): 양쪽에 알림
  if old.status = 'pending' and new.status = 'active' then
    select nickname into v_a_nickname from public.profiles where id = new.user_a_id;
    select nickname into v_b_nickname from public.profiles where id = new.user_b_id;

    insert into public.notifications (user_id, type, title, body, link, dedupe_key)
    values
      (new.user_a_id, 'partnership_accepted', '부부 연결 완료',
       coalesce(v_b_nickname, '상대방') || ' 가 부부 연결을 수락했어요',
       '/settings', 'partnership_accepted:' || new.id::text || ':a'),
      (new.user_b_id, 'partnership_accepted', '부부 연결 완료',
       coalesce(v_a_nickname, '상대방') || ' 와 부부 연결이 시작됐어요',
       '/settings', 'partnership_accepted:' || new.id::text || ':b')
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;

  -- → ended (해지): 변경한 쪽 반대편에 알림
  if old.status = 'active' and new.status = 'ended' then
    insert into public.notifications (user_id, type, title, body, link, dedupe_key)
    select
      case when auth.uid() = new.user_a_id then new.user_b_id else new.user_a_id end,
      'partnership_ended',
      '부부 연결 해지',
      '상대방이 부부 연결을 해지했어요. 이전 가계부 데이터는 그대로 남아있어요.',
      '/settings',
      'partnership_ended:' || new.id::text
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return new;
exception when others then
  return new;
end;
$$;

create trigger partnerships_status_change_notify
  after update on public.partnerships
  for each row execute function public.notify_partnership_status_change();
```

(커밋은 Task 2 끝 — 마이그레이션 적용 검증 후)

---

## Task 2: dev Supabase 에 마이그레이션 적용 (사용자 콘솔)

**Files:** 없음 — 사용자 콘솔 액션.

**의존성:** Task 1 완료.

- [ ] **Step 1: 마이그레이션 파일 내용 복사용 임시 SQL 준비**

클로드가 `C:\dev\lunabear-calendar\partner-migration-bootstrap.sql` 에 Task 1 의 SQL 그대로 복사 (사용자 콘솔 붙여넣기 편의용). `.gitignore` 에 `/partner-migration-bootstrap.sql` 추가.

- [ ] **Step 2: 사용자 안내**

> dev Supabase 콘솔 (`현재 쓰던 프로젝트` — prod 아님) → SQL Editor → New query
> → `partner-migration-bootstrap.sql` 전체 복사 붙여넣기 → Run.
>
> 에러 없으면 검증 쿼리도 실행:
>
> ```sql
> -- partnerships 테이블 존재 + RLS 활성
> select count(*) from public.partnerships;  -- 0
> select tablename, rowsecurity from pg_tables
>   where schemaname='public' and tablename='partnerships';  -- t
>
> -- partner_id 컬럼 4 테이블 모두 추가됨
> select table_name, column_name from information_schema.columns
>   where table_schema='public' and column_name='partner_id';
>   -- 4 행: expenses, subscriptions, budgets, monthly_targets
> ```

- [ ] **Step 3: 사용자 확인 보고 받기**

검증 결과 알려주세요. partner-migration-bootstrap.sql 은 prod 적용 후 삭제.

---

## Task 3: types/database.ts 재생성

**Files:**
- Modify: `C:\dev\lunabear-calendar\types\database.ts`

**의존성:** Task 2 완료 (dev DB 상태가 새 마이그레이션 반영).

- [ ] **Step 1: 자동 생성 시도**

```bash
cd /c/dev/lunabear-calendar && pnpm db:types 2>&1 | tail -20
```

**기대:** types/database.ts 가 새 partnerships 테이블 + partner_id 4 컬럼 반영해서 재생성됨.

실패 시 (`Cannot find project`):
- `pnpm db:link` → 사용자에게 dev 프로젝트 선택 안내
- 또는 수동으로 partnerships 타입과 partner_id 컬럼 추가

- [ ] **Step 2: typecheck**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck 2>&1 | tail -10
```

**기대:** 새 타입 인식, 에러 0.

---

## Task 4: features/partnership/server/queries.ts

**Files:**
- Create: `C:\dev\lunabear-calendar\features\partnership\server\queries.ts`

**의존성:** Task 3 완료.

- [ ] **Step 1: queries.ts 작성**

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PartnershipRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: "pending" | "active" | "ended";
  created_at: string;
  accepted_at: string | null;
  ended_at: string | null;
  // join 으로 채울 상대방 정보
  partner_nickname: string | null;
  partner_email: string | null;
};

/**
 * 현재 사용자의 partnership 상태를 한 번에 조회.
 * - active: 연결됨
 * - 받은 pending: 수락/거절 대기
 * - 보낸 pending: 상대 응답 대기
 * - null: 연결 안 됨
 */
export async function getMyPartnership(): Promise<{
  active: PartnershipRow | null;
  receivedPending: PartnershipRow | null;
  sentPending: PartnershipRow | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { active: null, receivedPending: null, sentPending: null };

  const { data: rows } = await supabase
    .from("partnerships")
    .select("id, user_a_id, user_b_id, status, created_at, accepted_at, ended_at")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .in("status", ["pending", "active"]);

  if (!rows || rows.length === 0) {
    return { active: null, receivedPending: null, sentPending: null };
  }

  // 상대방 user_id 모아서 닉네임·이메일 한 번에 조회 (admin client — profiles RLS 우회)
  const partnerIds = rows.map((r) =>
    r.user_a_id === user.id ? r.user_b_id : r.user_a_id,
  );
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nickname")
    .in("id", partnerIds);
  const { data: emails } = await admin.auth.admin.listUsers();
  const emailMap = new Map(
    (emails?.users ?? []).map((u) => [u.id, u.email ?? null]),
  );
  const nicknameMap = new Map((profiles ?? []).map((p) => [p.id, p.nickname]));

  const enrich = (r: typeof rows[number]): PartnershipRow => {
    const partnerId = r.user_a_id === user.id ? r.user_b_id : r.user_a_id;
    return {
      ...r,
      partner_nickname: nicknameMap.get(partnerId) ?? null,
      partner_email: emailMap.get(partnerId) ?? null,
    };
  };

  let active: PartnershipRow | null = null;
  let receivedPending: PartnershipRow | null = null;
  let sentPending: PartnershipRow | null = null;

  for (const r of rows) {
    const e = enrich(r);
    if (r.status === "active") active = e;
    else if (r.status === "pending") {
      if (r.user_a_id === user.id) sentPending = e;
      else receivedPending = e;
    }
  }

  return { active, receivedPending, sentPending };
}
```

(커밋은 Task 11 끝에 모아서)

---

## Task 5: features/partnership/server/actions.ts

**Files:**
- Create: `C:\dev\lunabear-calendar\features\partnership\server\actions.ts`

**의존성:** Task 4 완료.

- [ ] **Step 1: actions.ts 작성**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

const InviteSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아니에요"),
});

/**
 * 이메일로 부부 연결 초대 보내기.
 * - 본인 이메일 차단
 * - 이미 active 인 경우 차단
 * - 상대방이 존재하는 가입자인지 admin client 로 확인
 */
export async function invitePartner(formData: FormData): Promise<Result> {
  const parsed = InviteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "잘못된 입력" };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  if (user.email?.toLowerCase() === parsed.data.email.toLowerCase()) {
    return { ok: false, error: "본인 이메일은 사용할 수 없어요" };
  }

  // 상대방 user_id 조회 (admin: auth.users 직접 검색 가능)
  const admin = createAdminClient();
  const { data: list } = await admin.auth.admin.listUsers();
  const target = list?.users.find(
    (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
  );
  if (!target) {
    return { ok: false, error: "해당 이메일로 가입된 사용자가 없어요" };
  }

  // INSERT — unique index 가 active/pending 중복 차단
  const { error } = await supabase.from("partnerships").insert({
    user_a_id: user.id,
    user_b_id: target.id,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "이미 진행 중인 연결이 있어요" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * 받은 초대 수락 → status='active', accepted_at=now()
 */
export async function acceptInvite(partnershipId: string): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { data, error } = await supabase
    .from("partnerships")
    .update({ status: "active", accepted_at: new Date().toISOString() })
    .eq("id", partnershipId)
    .eq("user_b_id", user.id)
    .eq("status", "pending")
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "초대를 찾을 수 없거나 이미 처리됐어요" };
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * 받은 초대 거절 = row 삭제. 보낸 초대 취소도 동일하게 row 삭제.
 */
export async function declineInvite(partnershipId: string): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { data, error } = await supabase
    .from("partnerships")
    .delete()
    .eq("id", partnershipId)
    .eq("status", "pending")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "초대를 찾을 수 없어요" };
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * 부부 해지 → status='ended', ended_at=now(). row 의 partner_id 는 그대로.
 */
export async function endPartnership(partnershipId: string): Promise<Result> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { data, error } = await supabase
    .from("partnerships")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", partnershipId)
    .eq("status", "active")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "활성 부부 연결을 찾을 수 없어요" };
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
```

---

## Task 6: partnership UI 컴포넌트 3개

**Files:**
- Create: `C:\dev\lunabear-calendar\features\partnership\components\PartnerSection.tsx`
- Create: `C:\dev\lunabear-calendar\features\partnership\components\InviteForm.tsx`
- Create: `C:\dev\lunabear-calendar\features\partnership\components\PendingInviteCard.tsx`
- Create: `C:\dev\lunabear-calendar\features\partnership\components\LinkedPartnerCard.tsx`

**의존성:** Task 5 완료.

- [ ] **Step 1: PartnerSection.tsx (server component)**

```tsx
import { getMyPartnership } from "../server/queries";
import { InviteForm } from "./InviteForm";
import { PendingInviteCard } from "./PendingInviteCard";
import { LinkedPartnerCard } from "./LinkedPartnerCard";

export async function PartnerSection() {
  const { active, receivedPending, sentPending } = await getMyPartnership();

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">부부 연결</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          부부로 연결하면 가계부 (지출·정기 구독·예산·월 목표) 가 양쪽 모두에게 보여요.
        </p>
      </div>

      {active && <LinkedPartnerCard partnership={active} />}
      {!active && receivedPending && (
        <PendingInviteCard partnership={receivedPending} mode="received" />
      )}
      {!active && sentPending && (
        <PendingInviteCard partnership={sentPending} mode="sent" />
      )}
      {!active && !receivedPending && !sentPending && <InviteForm />}
    </section>
  );
}
```

- [ ] **Step 2: InviteForm.tsx (client)**

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invitePartner } from "../server/actions";

export function InviteForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const r = await invitePartner(formData);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("초대를 보냈어요. 상대방이 수락하면 연결돼요.");
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="space-y-2 rounded-lg border border-border p-4">
      <Label htmlFor="partner-email" className="text-xs">
        상대방 이메일
      </Label>
      <Input
        id="partner-email"
        name="email"
        type="email"
        placeholder="partner@example.com"
        required
        disabled={pending}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "보내는 중..." : "초대 보내기"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: PendingInviteCard.tsx (client)**

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { acceptInvite, declineInvite } from "../server/actions";
import type { PartnershipRow } from "../server/queries";

type Props = {
  partnership: PartnershipRow;
  mode: "received" | "sent";
};

export function PendingInviteCard({ partnership, mode }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const displayName =
    partnership.partner_nickname ?? partnership.partner_email ?? "상대방";

  const handleAccept = () => {
    startTransition(async () => {
      const r = await acceptInvite(partnership.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("부부 연결이 시작됐어요!");
      router.refresh();
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      const r = await declineInvite(partnership.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(mode === "received" ? "초대를 거절했어요" : "초대를 취소했어요");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-pink-500" aria-hidden />
        <p className="text-sm">
          {mode === "received" ? (
            <>
              <span className="font-medium">{displayName}</span> 가 부부 연결을
              요청했어요
            </>
          ) : (
            <>
              <span className="font-medium">{displayName}</span> 의 응답을 기다리고 있어요
            </>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        {mode === "received" && (
          <Button onClick={handleAccept} disabled={pending} className="flex-1">
            {pending ? "..." : "수락"}
          </Button>
        )}
        <Button
          onClick={handleDecline}
          disabled={pending}
          variant="outline"
          className="flex-1"
        >
          {pending ? "..." : mode === "received" ? "거절" : "초대 취소"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: LinkedPartnerCard.tsx (client)**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { endPartnership } from "../server/actions";
import type { PartnershipRow } from "../server/queries";

export function LinkedPartnerCard({
  partnership,
}: {
  partnership: PartnershipRow;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const name =
    partnership.partner_nickname ?? partnership.partner_email ?? "상대방";
  const sinceLabel = partnership.accepted_at
    ? new Date(partnership.accepted_at).toLocaleDateString("ko-KR")
    : null;

  const handleEnd = () => {
    startTransition(async () => {
      const r = await endPartnership(partnership.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("부부 연결을 해지했어요");
      setConfirming(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 fill-pink-500 text-pink-500" aria-hidden />
        <div className="flex-1">
          <p className="text-sm">
            <span className="font-medium">{name}</span> 와 부부 연결됨
          </p>
          {sinceLabel && (
            <p className="text-xs text-muted-foreground">{sinceLabel} 부터</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        가계부 데이터가 함께 보입니다. 해지해도 그동안 입력한 데이터는 양쪽 모두에게 그대로 남아요.
      </p>
      <Button
        onClick={() => setConfirming(true)}
        variant="outline"
        size="sm"
        className="w-full"
      >
        부부 연결 해지
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>부부 연결을 해지할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              해지 후 새로 입력하는 가계부는 본인만 보여요. 그동안 같이 쌓아온 데이터는
              양쪽 모두에게 그대로 남아요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnd} disabled={pending}>
              {pending ? "해지 중..." : "해지하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

---

## Task 7: /settings 통합

**Files:**
- Modify: `C:\dev\lunabear-calendar\features\settings\components\SettingsClient.tsx`
- Modify: `C:\dev\lunabear-calendar\app\(app)\settings\page.tsx`

**의존성:** Task 6 완료.

- [ ] **Step 1: page.tsx — PartnerSection 직접 mount (server component 이므로 SettingsClient 외부에서 렌더)**

```tsx
// app/(app)/settings/page.tsx
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCalendars } from "@/features/calendar/server/queries";
import { normalizeHidden } from "@/features/widgets/lib/items";
import { SettingsClient } from "@/features/settings/components/SettingsClient";
import { PartnerSection } from "@/features/partnership/components/PartnerSection";

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, widget_visibility")
    .eq("id", user.id)
    .maybeSingle();

  const calendars = await getCalendars();

  return (
    <SettingsClient
      email={user.email ?? ""}
      initialNickname={profile?.nickname ?? ""}
      initialHiddenWidgets={normalizeHidden(profile?.widget_visibility)}
      calendars={calendars}
      partnerSlot={<PartnerSection />}
    />
  );
}
```

- [ ] **Step 2: SettingsClient.tsx 에 partnerSlot prop 추가**

`type Props` 에:
```ts
partnerSlot?: React.ReactNode;
```

함수 시그니처에 `partnerSlot` 추가 + render 중 적당한 위치 (계정 섹션과 캘린더 섹션 사이 또는 끝) 에 `{partnerSlot}` 삽입.

구체적 위치는 SettingsClient 의 layout 보면서 결정. 일반적으로 "계정" → "부부 연결" → "테마" → "캘린더" 순.

- [ ] **Step 3: 로컬 검증**

```bash
cd /c/dev/lunabear-calendar && pnpm dev
```

브라우저에서 `/settings` 진입 → "부부 연결" 섹션 보임 (현재 사용자가 active 가 없으니 InviteForm).

---

## Task 8: NotificationItem ICON_MAP 확장

**Files:**
- Modify: `C:\dev\lunabear-calendar\features\notifications\components\NotificationItem.tsx`

**의존성:** Task 7 완료.

- [ ] **Step 1: ICON_MAP 에 3 타입 추가**

```ts
import {
  Bell, Calendar, CreditCard, Heart, MessageSquare, Users,
  HeartHandshake, HeartCrack,                       // ← 추가
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  event_summary: Calendar,
  subscription_due: CreditCard,
  board_new_post: MessageSquare,
  board_new_comment: MessageSquare,
  calendar_invite: Users,
  board_like: Heart,
  partnership_invite: HeartHandshake,    // 받은 초대
  partnership_accepted: Heart,            // 양쪽 연결 완료
  partnership_ended: HeartCrack,          // 해지
};
```

---

## Task 9: expense queries 에 partner_id select 추가

**Files:**
- Modify: `C:\dev\lunabear-calendar\features\expense\server\queries.ts`

**의존성:** Task 3 완료 (types 갱신됨).

- [ ] **Step 1: 변경할 select 들 찾기**

```bash
grep -n "from(\"expenses\"\|from(\"subscriptions\"\|from(\"budgets\"\|from(\"monthly_targets\"" /c/dev/lunabear-calendar/features/expense/server/queries.ts
```

각 select 에 `partner_id` 컬럼 추가.

- [ ] **Step 2: ExpenseRow / SubscriptionRow / BudgetRow / MonthlyTargetRow 타입에 partner_id 추가**

각 type 정의에 `partner_id: string | null;` 추가.

- [ ] **Step 3: typecheck**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck 2>&1 | tail -10
```

---

## Task 10: 가계부 row 들에 ❤️ 표시

**Files:**
- Modify: `C:\dev\lunabear-calendar\features\expense\components\ExpenseDayDetailPopup.tsx`
- Modify: `C:\dev\lunabear-calendar\features\expense\components\SubscriptionItem.tsx`
- Modify: `C:\dev\lunabear-calendar\features\expense\components\MonthTargetWidget.tsx`
- Modify: `C:\dev\lunabear-calendar\features\expense\components\BudgetEditor.tsx`

**의존성:** Task 9 완료.

- [ ] **Step 1: 각 row 렌더 위치에 조건부 ❤️ 추가**

패턴 — row 의 어떤 요소 옆에 작은 ❤️ 아이콘:

```tsx
import { Heart } from "lucide-react";

// row 안 어디든:
{row.partner_id && (
  <Heart
    className="h-3 w-3 fill-pink-500 text-pink-500"
    aria-label="부부 공유"
  />
)}
```

- [ ] **Step 2: 각 컴포넌트별 위치**

- `ExpenseDayDetailPopup.tsx` — 지출 row 의 금액 옆 또는 시간 옆
- `SubscriptionItem.tsx` — 구독명 옆
- `MonthTargetWidget.tsx` — 카드 우상단 (월 목표가 한 row 라)
- `BudgetEditor.tsx` — 카테고리 row 의 금액 옆

각 파일을 열어 row 의 안정적인 위치를 골라 위 패턴으로 삽입.

- [ ] **Step 3: typecheck**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck 2>&1 | tail -10
```

---

## Task 11: 로컬 검증 + 커밋 + 푸시

**Files:** 없음 — 검증/커밋만.

**의존성:** Task 10 완료.

- [ ] **Step 1: 로컬 빌드 통과 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm build 2>&1 | tail -30
```

**기대:** 빌드 성공, route 목록에 `/settings` 보임.

- [ ] **Step 2: 테스트 통과**

```bash
cd /c/dev/lunabear-calendar && pnpm test:run 2>&1 | tail -10
```

**기대:** 모든 테스트 통과 (기존 57 + 새로 추가한 게 있으면 더).

- [ ] **Step 3: 커밋 (2 덩어리)**

```bash
cd /c/dev/lunabear-calendar && git add supabase/migrations/20260525160000_partnerships.sql types/database.ts && git commit -m "$(cat <<'EOF'
migration: 부부 가계부 공유 — partnerships + partner_id + RLS + 알림

partnerships 테이블 (1:1, status), 4 가계부 테이블에 partner_id 컬럼,
RLS 정책을 본인 or 파트너로 확장, INSERT trigger 가 partner_id 자동 채움,
알림 type 3종 추가 + 관련 trigger 함수 2개.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

```bash
git add features/partnership/ features/settings/components/SettingsClient.tsx "app/(app)/settings/page.tsx" features/notifications/components/NotificationItem.tsx features/expense/ && git commit -m "$(cat <<'EOF'
feat(partnership): 부부 가계부 공유 — 도메인 + /settings 통합 + ❤️

- features/partnership/ 신규 도메인 (queries/actions/4 components)
- /settings 의 "부부 연결" 섹션 통합
- 알림 NotificationItem 에 3 타입 매핑 추가
- 가계부 row 의 작성자 표시에 partner_id != null 이면 ❤️

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: prod DB 적용 전 push 보류**

❗ **여기서 push 하면 안 됨** — Vercel 이 자동 재배포하는데 prod DB 에 partnerships 테이블 없어서 런타임 에러 (PartnerSection fetch 가 깨짐).

먼저 Task 12 에서 prod 마이그레이션 적용 → 그 다음 push.

---

## Task 12: prod Supabase 에 마이그레이션 적용 (사용자 콘솔)

**Files:** 없음 — 사용자 콘솔.

**의존성:** Task 11 완료. partner-migration-bootstrap.sql 파일이 작업 디렉토리에 있음 (Task 2 에서 생성).

- [ ] **Step 1: 사용자 안내**

> **prod Supabase** (`rhtnszvdeqmacwawnznj`) 콘솔 → SQL Editor → New query → `partner-migration-bootstrap.sql` 전체 복사 붙여넣기 → Run.
>
> 검증 쿼리 (별도 새 query):
>
> ```sql
> select count(*) from public.partnerships;  -- 0
> select table_name, column_name from information_schema.columns
>   where table_schema='public' and column_name='partner_id';
>   -- 4 행
> ```

- [ ] **Step 2: 적용 후 push 실행**

prod DB 준비 완료되면 클로드가 푸시:

```bash
cd /c/dev/lunabear-calendar && git push origin main 2>&1 | tail -5
```

Vercel 자동 재배포 시작.

- [ ] **Step 3: 빌드 결과 확인**

Vercel 대시보드 → Deployments → 최신 빌드 → 성공 여부.

- [ ] **Step 4: 일회성 파일 정리 (선택)**

사용자가 `partner-migration-bootstrap.sql` 파일 삭제 (gitignore 처리되어 git 영향 없음).

---

## Task 13: 종합 검증 (2 계정 시크릿 브라우저)

**Files:** 없음 — prod 검증.

**의존성:** Task 12 완료.

- [ ] **Step 1: 두 계정 준비**

- 계정 A: 첫 시크릿 브라우저, 이미 만든 베타 계정 또는 새로
- 계정 B: 다른 시크릿 브라우저 (다른 인스턴스), 새 이메일

각각 prod URL 로 로그인.

- [ ] **Step 2: 초대 보내기 (A)**

A 의 /settings → "부부 연결" 섹션 → B 의 이메일 입력 → "초대 보내기" → 토스트 "초대를 보냈어요" → 화면 "보낸 초대" 상태로 전환.

- [ ] **Step 3: 알림 수신 + 수락 (B)**

B 의 헤더 종 클릭 → "새 부부 연결 요청" 알림 보임 → 클릭 → /settings → "받은 초대" 카드 → "수락" 버튼 → 토스트 "부부 연결이 시작됐어요!" → "연결됨" 카드로 전환.

- [ ] **Step 4: 양쪽 알림 (수락 통보)**

A 의 헤더 종 → "부부 연결 완료" 알림 새로 추가됨.

- [ ] **Step 5: 가계부 양방향 공유 확인**

- A 가 /expense → 지출 1개 추가 ("점심 식대" 12,000원)
- B 가 /expense → A 가 입력한 지출 보임. 옆에 ❤️ 표시.
- B 가 지출 1개 추가 ("저녁 식대" 18,000원) → 옆에 ❤️
- A 의 화면에도 B 의 지출 보임 + ❤️

- [ ] **Step 6: 수정·삭제 권한 확인 (완전 신뢰)**

- B 가 A 가 입력한 "점심 식대" 클릭 → 수정 모달 → 금액 변경 → 저장 → 양쪽 갱신
- A 가 B 가 입력한 "저녁 식대" 삭제 → 양쪽에서 사라짐

- [ ] **Step 7: 정기 구독·예산·월 목표도 동일 동작 확인**

각각 한 row 씩 빠르게.

- [ ] **Step 8: 해지 → 데이터 영원 공유 확인**

A 의 /settings → "부부 연결 해지" → 확인 모달 → "해지하기" → "연결 안 됨" 상태로 전환.

B 의 헤더 종 → "부부 연결 해지" 알림.

A 와 B 모두 /expense → **그동안 같이 쌓은 지출들 양쪽 모두 그대로 보임** + ❤️ 그대로.

A 가 해지 후 새 지출 추가 → A 에만 보임, ❤️ 없음. B 에는 안 보임.

- [ ] **Step 9: 1:1 강제 확인 (선택)**

해지 후 A 가 다른 사용자 C 에게 초대 → 가능. (active 가 없으므로)
active 동안 다른 사람에게 초대 시도 → unique index 가 막아서 에러 토스트.

검증 통과 → **부부 가계부 공유 기능 라이브.** 🎉

---

## 트러블슈팅 색인

| 증상 | 원인 후보 | 조치 |
| --- | --- | --- |
| /settings 진입 시 500 | partnerships 테이블 없음 (prod 마이그레이션 누락) | Supabase prod SQL Editor 에서 partner-migration-bootstrap.sql 실행 |
| 초대 보낼 때 "사용자 없음" 에러 (실제 가입한 이메일인데) | admin client RLS 우회 안 됨 / SUPABASE_SERVICE_ROLE_KEY 누락 | Vercel 환경변수 확인 |
| 수락 후 가계부 안 공유됨 | partner_id 가 안 채워짐 — trigger 동작 안 함 | SQL Editor: `select id, user_id, partner_id from expenses where user_id=? order by created_at desc limit 5` 로 확인. 빈 경우 trigger 등록 확인 |
| 해지 후 알림 안 옴 | notify_partnership_status_change trigger 가 auth.uid() 못 읽음 (security definer) | trigger 함수가 `current_setting('request.jwt.claims', true)` 사용으로 변경 필요 — 추후 polish |
| 가계부 row 옆 ❤️ 안 보임 | partner_id select 누락 또는 type 누락 | features/expense/server/queries.ts 에 partner_id 추가 확인 |

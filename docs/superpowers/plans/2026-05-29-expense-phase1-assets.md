# 가계부 Phase 1 — 자산 관리 + 거래 연동 + 미니멈 자족 보완 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자산 5종(현금/은행/체크카드/신용카드/저축·투자)을 관리하고 모든 거래를 자산에 연결해 잔액을 자동 추적하며, TransactionModal 의 입력 부담을 줄이고 PWA 바로가기로 빠른 진입을 제공한다.

**Architecture:** 신규 `assets` 테이블 + 기존 4 거래 테이블에 `asset_id` 컬럼 추가. 자산 잔액은 서버 액션의 `applyAssetDelta` 헬퍼로 거래 발생/수정/삭제 시 자동 +/-. 가계부 페이지에 5번째 탭 "자산" 신설. 미니멈 자족 보완은 TransactionModal 컴포넌트 확장 + 자연어 파서 키워드 사전 확장 + manifest.json shortcuts.

**Tech Stack:** Next.js 14 (App Router), Supabase (Postgres + RLS), TypeScript strict, shadcn/ui, lucide-react, framer-motion, vitest, Tailwind 3.4.

**Spec 출처:** `docs/superpowers/specs/2026-05-29-expense-phase1-assets-design.md`

**Working directory:** `C:\dev\lunabear-calendar` (CLI cwd 가 `C:\dev\캘린더앱` 와 다름 — 항상 절대 경로 사용 또는 명시적 `cd`)

---

## File Structure

### Create
- `supabase/migrations/20260529150000_assets.sql` — 마이그레이션
- `features/expense/lib/asset-types.ts` — type union + 라벨/아이콘 매핑
- `features/expense/lib/asset-colors.ts` — 6색 팔레트
- `features/expense/server/asset-queries.ts` — getActiveAssets, getAssetById, getAssetsGrouped, getTransactionsForAsset, getTotalNetWorth, getCreditCardsAwaitingSettlement, getRecentMemos
- `features/expense/server/asset-actions.ts` — createAsset, updateAsset, archiveAsset, deleteAsset, adjustAssetBalance, settleCreditCard
- `features/expense/server/asset-balance.ts` — applyAssetDelta + reverseAssetDelta helpers (server-only)
- `features/expense/components/assets/AssetsTab.tsx`
- `features/expense/components/assets/AssetsSummaryHeader.tsx`
- `features/expense/components/assets/AssetGroup.tsx`
- `features/expense/components/assets/AssetCard.tsx`
- `features/expense/components/assets/AssetModal.tsx`
- `features/expense/components/assets/AssetColorPicker.tsx`
- `features/expense/components/assets/CreditCardSettleButton.tsx`
- `features/expense/components/assets/AssetDetailView.tsx`
- `features/expense/components/assets/AssetBalanceAdjustDialog.tsx`
- `features/expense/components/transaction-extras/QuickAmountChips.tsx`
- `features/expense/components/transaction-extras/CalculatorPopover.tsx`
- `features/expense/components/transaction-extras/AssetChipPicker.tsx`
- `features/expense/components/transaction-extras/MemoAutocomplete.tsx`
- `public/manifest.json`

### Modify
- `types/database.ts` — assets Row/Insert/Update + 기존 4 테이블에 asset_id
- `features/expense/server/actions.ts` — 모든 expense/income 액션에 applyAssetDelta 통합 + asset_id 스키마 추가
- `features/expense/components/TransactionModal.tsx` — QuickAmountChips, CalculatorPopover, AssetChipPicker, MemoAutocomplete 통합
- `features/expense/components/ExpensePage.tsx` — 5탭 구조 (자산 탭 2번째)
- `app/(app)/expense/page.tsx` — getActiveAssets + getRecentMemos 추가
- `app/(app)/layout.tsx` — manifest meta 태그
- `lib/expense-parser.ts` — 자산 키워드 매칭 + asset_id 반환
- `lib/income-parser.ts` — 자산 키워드 매칭 + asset_id 반환
- `lib/expense-parser.test.ts` — 자산 매칭 테스트 추가
- `lib/income-parser.test.ts` — 자산 매칭 테스트 추가

---

## Task 1: DB Migration + Types

**Files:**
- Create: `supabase/migrations/20260529150000_assets.sql`
- Modify: `types/database.ts` — assets 테이블 추가 + 기존 4 테이블에 asset_id

### Step 1: 마이그레이션 SQL 작성

Create `supabase/migrations/20260529150000_assets.sql`:

```sql
-- ============================================================================
-- 자산 관리 (Phase 1) — assets 테이블 + 기존 거래 테이블에 asset_id + RLS
-- ============================================================================

-- ─── assets (자산) ────────────────────────────────────────────────────────
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 30),
  type text not null check (type in (
    'cash', 'bank', 'debit_card', 'credit_card', 'savings_investment'
  )),
  balance integer not null default 0,
  linked_asset_id uuid references public.assets(id) on delete set null,
  payment_day smallint check (payment_day between 1 and 31),
  color text not null default '#5B6CFF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assets_user_idx on public.assets (user_id, is_archived, sort_order);

-- ─── 기존 거래 테이블에 asset_id (nullable) ──────────────────────────────
alter table public.expenses add column if not exists asset_id uuid references public.assets(id) on delete set null;
alter table public.incomes add column if not exists asset_id uuid references public.assets(id) on delete set null;
alter table public.subscriptions add column if not exists asset_id uuid references public.assets(id) on delete set null;
alter table public.recurring_incomes add column if not exists asset_id uuid references public.assets(id) on delete set null;
create index if not exists expenses_asset_idx on public.expenses (asset_id) where asset_id is not null;
create index if not exists incomes_asset_idx on public.incomes (asset_id) where asset_id is not null;

-- ─── RLS ─────────────────────────────────────────────────────────────────
alter table public.assets enable row level security;

create policy assets_select_own on public.assets for select using (user_id = auth.uid());
create policy assets_insert_own on public.assets for insert with check (user_id = auth.uid());
create policy assets_update_own on public.assets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy assets_delete_own on public.assets for delete using (user_id = auth.uid());

-- ─── 기존 사용자에게 "현금" 자산 1개 자동 생성 ────────────────────────────
insert into public.assets (user_id, name, type, balance, color, sort_order)
select id, '현금', 'cash', 0, '#9CA3AF', 0
from auth.users
on conflict do nothing;

-- ─── 신규 가입 시 "현금" 자산 자동 생성 트리거 ───────────────────────────
create or replace function public.create_default_asset_for_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.assets (user_id, name, type, balance, color, sort_order)
  values (new.id, '현금', 'cash', 0, '#9CA3AF', 0);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_default_asset on auth.users;
create trigger on_auth_user_created_default_asset
  after insert on auth.users
  for each row
  execute function public.create_default_asset_for_new_user();
```

### Step 2: prod + dev Supabase SQL Editor 에 적용

이 SQL 을 다음 두 곳에 붙여넣어 실행 (사용자가 직접):
- prod: `rhtnszvdeqmacwawnznj` SQL Editor
- dev: `rkqtcuaifhwyyzbavhio` SQL Editor

실행 후 확인 쿼리:
```sql
select count(*) from public.assets where name = '현금';
-- 기존 user 수와 같아야 함

select count(*) from auth.users;
-- 위와 같은 수

\d public.assets
-- 또는 Table Editor 에서 컬럼 확인
```

### Step 3: types/database.ts 에 assets 타입 수동 추가

Open `types/database.ts`. Find `public.Tables` section. Add `assets` table type (use existing `expenses` 형식 참고). 그리고 expenses / incomes / subscriptions / recurring_incomes 각 Row/Insert/Update 에 `asset_id: string | null` 추가.

Find `expenses:` block, identify Row interface, and within it add `asset_id: string | null`. Insert/Update interfaces (전체 Row 의 partial) 도 동일하게 추가.

Add 새 assets block (`expenses` 형식 모방):

```typescript
      assets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "cash" | "bank" | "debit_card" | "credit_card" | "savings_investment";
          balance: number;
          linked_asset_id: string | null;
          payment_day: number | null;
          color: string;
          sort_order: number;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: "cash" | "bank" | "debit_card" | "credit_card" | "savings_investment";
          balance?: number;
          linked_asset_id?: string | null;
          payment_day?: number | null;
          color?: string;
          sort_order?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: "cash" | "bank" | "debit_card" | "credit_card" | "savings_investment";
          balance?: number;
          linked_asset_id?: string | null;
          payment_day?: number | null;
          color?: string;
          sort_order?: number;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
```

기존 `expenses.Row` / `Insert` / `Update` 의 마지막에 `asset_id: string | null;` (Insert/Update 는 `asset_id?: string | null;`) 추가. incomes / subscriptions / recurring_incomes 도 동일하게.

### Step 4: 타입체크

Run:
```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0 (잠재적 에러: 어디선가 assets 테이블 참조 안 한 곳은 없음 — 신규 테이블이라 OK)

### Step 5: Commit

```bash
cd /c/dev/lunabear-calendar
git add supabase/migrations/20260529150000_assets.sql types/database.ts
git commit -m "$(cat <<'EOF'
feat(expense): assets 테이블 + 기존 거래에 asset_id + 기본 "현금" 자산 자동 생성

- assets 테이블 (cash/bank/debit_card/credit_card/savings_investment)
- expenses/incomes/subscriptions/recurring_incomes 에 asset_id (nullable)
- RLS: 자기 자산만 접근
- 기존 사용자에게 "현금" 자산 backfill + 신규 가입 트리거

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Asset 메타데이터 + 색 팔레트

**Files:**
- Create: `features/expense/lib/asset-types.ts`
- Create: `features/expense/lib/asset-colors.ts`

### Step 1: asset-types.ts 작성

Create `features/expense/lib/asset-types.ts`:

```typescript
// features/expense/lib/asset-types.ts
import {
  Wallet,
  Landmark,
  CreditCard,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type AssetType =
  | "cash"
  | "bank"
  | "debit_card"
  | "credit_card"
  | "savings_investment";

export const ASSET_TYPES: readonly AssetType[] = [
  "cash",
  "bank",
  "debit_card",
  "credit_card",
  "savings_investment",
] as const;

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash: "현금",
  bank: "은행",
  debit_card: "체크카드",
  credit_card: "신용카드",
  savings_investment: "저축/투자",
};

export const ASSET_TYPE_ICONS: Record<AssetType, LucideIcon> = {
  cash: Wallet,
  bank: Landmark,
  debit_card: CreditCard,
  credit_card: CreditCard,
  savings_investment: TrendingUp,
};

/** 신용카드는 누적이라 순자산 합산에서 차감. */
export const ASSET_TYPE_SIGN: Record<AssetType, 1 | -1> = {
  cash: 1,
  bank: 1,
  debit_card: 1, // balance 는 항상 0 이지만 합산에 영향 없게 +
  credit_card: -1,
  savings_investment: 1,
};

/** 수입을 받을 수 있는 자산 (체크/신용카드는 수입 불가). */
export function canReceiveIncome(type: AssetType): boolean {
  return type === "cash" || type === "bank" || type === "savings_investment";
}

/** 체크카드 사용 시 linked_asset_id 의 은행에서 차감. */
export function debitsFromLinked(type: AssetType): boolean {
  return type === "debit_card";
}

/** 신용카드 사용 시 누적 (+= 금액). */
export function accumulates(type: AssetType): boolean {
  return type === "credit_card";
}
```

### Step 2: asset-colors.ts 작성

Create `features/expense/lib/asset-colors.ts`:

```typescript
// features/expense/lib/asset-colors.ts

/**
 * 자산 카드의 색 팔레트 (6개). 다크/라이트 동일 hex.
 * 메모리의 color restraint 원칙: 새 색 발명 X, 기존 시스템 톤과 의미군 겹치지 않게.
 */
export const ASSET_COLOR_PALETTE = [
  "#5B6CFF", // primary blue — 기본
  "#9CA3AF", // gray — 현금 default
  "#16A34A", // green — 저축/투자 톤
  "#F59E0B", // amber — 은행 톤
  "#A855F7", // purple — 카드 톤
  "#EC4899", // pink — 보조
] as const;

export type AssetColor = (typeof ASSET_COLOR_PALETTE)[number];

export const ASSET_DEFAULT_COLOR_BY_TYPE: Record<
  "cash" | "bank" | "debit_card" | "credit_card" | "savings_investment",
  string
> = {
  cash: "#9CA3AF",
  bank: "#F59E0B",
  debit_card: "#A855F7",
  credit_card: "#A855F7",
  savings_investment: "#16A34A",
};

export function isValidAssetColor(c: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(c);
}
```

### Step 3: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 4: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/lib/asset-types.ts features/expense/lib/asset-colors.ts
git commit -m "$(cat <<'EOF'
feat(expense): 자산 타입 메타데이터 + 6색 팔레트

- AssetType union + 라벨/아이콘/부호 매핑
- canReceiveIncome / debitsFromLinked / accumulates 헬퍼
- 6색 팔레트 (라이트/다크 동일)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Asset Queries (server)

**Files:**
- Create: `features/expense/server/asset-queries.ts`

### Step 1: asset-queries.ts 작성

Create `features/expense/server/asset-queries.ts`:

```typescript
// features/expense/server/asset-queries.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { AssetType } from "../lib/asset-types";
import { ASSET_TYPE_SIGN } from "../lib/asset-types";
import type { ExpenseRow, IncomeRow } from "./queries";

export type AssetRow = Database["public"]["Tables"]["assets"]["Row"];

/** 활성 자산 전체. sort_order 오름차순. */
export async function getActiveAssets(): Promise<AssetRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("is_archived", false)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** 단일 자산 (보관 포함). */
export async function getAssetById(id: string): Promise<AssetRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** type 별 그룹핑된 활성 자산. */
export async function getAssetsGrouped(): Promise<Record<AssetType, AssetRow[]>> {
  const assets = await getActiveAssets();
  const grouped: Record<AssetType, AssetRow[]> = {
    cash: [],
    bank: [],
    debit_card: [],
    credit_card: [],
    savings_investment: [],
  };
  for (const a of assets) {
    grouped[a.type as AssetType].push(a);
  }
  return grouped;
}

/** 총 자산 = 모든 active 자산 balance 합 (credit_card 는 차감). */
export async function getTotalNetWorth(): Promise<number> {
  const assets = await getActiveAssets();
  let total = 0;
  for (const a of assets) {
    const sign = ASSET_TYPE_SIGN[a.type as AssetType];
    total += sign * a.balance;
  }
  return total;
}

export type AssetTransaction =
  | (ExpenseRow & { kind: "expense" })
  | (IncomeRow & { kind: "income" });

/** 자산별 거래 (expense + income 합쳐 시간 역순). */
export async function getTransactionsForAsset(
  assetId: string,
  limit = 50,
): Promise<AssetTransaction[]> {
  const supabase = createClient();
  const [expRes, incRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("asset_id", assetId)
      .order("paid_at", { ascending: false })
      .limit(limit),
    supabase
      .from("incomes")
      .select("*")
      .eq("asset_id", assetId)
      .order("received_at", { ascending: false })
      .limit(limit),
  ]);
  if (expRes.error) throw expRes.error;
  if (incRes.error) throw incRes.error;

  const items: AssetTransaction[] = [
    ...(expRes.data ?? []).map((e) => ({ ...e, kind: "expense" as const })),
    ...(incRes.data ?? []).map((i) => ({ ...i, kind: "income" as const })),
  ];

  items.sort((a, b) => {
    const aDate = a.kind === "expense" ? a.paid_at : a.received_at;
    const bDate = b.kind === "expense" ? b.paid_at : b.received_at;
    return bDate.localeCompare(aDate);
  });

  return items.slice(0, limit);
}

/** 결제일 도래한 신용카드 (balance > 0 AND today.day >= payment_day). */
export async function getCreditCardsAwaitingSettlement(): Promise<AssetRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("type", "credit_card")
    .eq("is_archived", false)
    .gt("balance", 0);
  if (error) throw error;
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return (data ?? []).filter((a) => {
    if (a.payment_day == null) return false;
    const effectivePaymentDay = Math.min(a.payment_day, lastDay);
    return today.getDate() >= effectivePaymentDay;
  });
}

/** 최근 60일 distinct memo (지출 + 수입). 자동완성 datalist 용. */
export async function getRecentMemos(): Promise<string[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceIso = since.toISOString();

  const [exp, inc] = await Promise.all([
    supabase
      .from("expenses")
      .select("memo")
      .gte("paid_at", sinceIso)
      .not("memo", "is", null),
    supabase
      .from("incomes")
      .select("memo")
      .gte("received_at", sinceIso)
      .not("memo", "is", null),
  ]);
  if (exp.error) throw exp.error;
  if (inc.error) throw inc.error;

  const set = new Set<string>();
  exp.data?.forEach((r) => r.memo && set.add(r.memo));
  inc.data?.forEach((r) => r.memo && set.add(r.memo));
  return Array.from(set).sort();
}
```

### Step 2: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 3: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/server/asset-queries.ts
git commit -m "$(cat <<'EOF'
feat(expense): asset 쿼리 — 활성 자산/그룹/총자산/거래내역/정산대기/최근메모

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Asset Balance Helpers

**Files:**
- Create: `features/expense/server/asset-balance.ts`

### Step 1: asset-balance.ts 작성

Create `features/expense/server/asset-balance.ts`:

```typescript
// features/expense/server/asset-balance.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * 자산 잔액에 delta 적용 — 자산 타입별 규칙 따름.
 *
 * @param assetId 자산 ID. null/undefined 면 no-op.
 * @param amount 거래 금액 (양수).
 * @param kind "expense" | "income".
 *
 * 규칙:
 * - cash / bank / savings_investment: expense=-amount, income=+amount
 * - debit_card: expense → linked_asset_id 의 balance -=amount (체크카드 본인 변동 X)
 * - credit_card: expense → 본인 balance += amount (누적), income 은 호출자가 차단
 */
export async function applyAssetDelta(
  assetId: string | null | undefined,
  amount: number,
  kind: "expense" | "income",
): Promise<void> {
  if (!assetId || amount === 0) return;
  const supabase = createClient();

  const { data: asset, error: fetchErr } = await supabase
    .from("assets")
    .select("id, type, balance, linked_asset_id")
    .eq("id", assetId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!asset) return; // 자산이 삭제된 경우 silent skip

  const type = asset.type;

  // 체크카드 + 지출 → 연결 은행에서 차감
  if (kind === "expense" && type === "debit_card") {
    if (!asset.linked_asset_id) return; // 연결 안 됨 → 잔액 변동 없음
    const { data: linked, error: linkedErr } = await supabase
      .from("assets")
      .select("id, balance")
      .eq("id", asset.linked_asset_id)
      .maybeSingle();
    if (linkedErr) throw linkedErr;
    if (!linked) return;
    const newBalance = linked.balance - amount;
    const { error: upErr } = await supabase
      .from("assets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", linked.id);
    if (upErr) throw upErr;
    return;
  }

  // 신용카드 + 지출 → 본인 누적 (+= amount)
  if (kind === "expense" && type === "credit_card") {
    const newBalance = asset.balance + amount;
    const { error: upErr } = await supabase
      .from("assets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", asset.id);
    if (upErr) throw upErr;
    return;
  }

  // 신용카드 + 수입 → no-op (호출자에서 막아야 함, 안전 망)
  if (kind === "income" && (type === "credit_card" || type === "debit_card")) {
    return;
  }

  // cash / bank / savings_investment
  const delta = kind === "expense" ? -amount : amount;
  const newBalance = asset.balance + delta;
  const { error: upErr } = await supabase
    .from("assets")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", asset.id);
  if (upErr) throw upErr;
}

/**
 * applyAssetDelta 의 역동작 — 거래 수정/삭제 시 기존 영향 원복.
 *
 * 단순히 applyAssetDelta(..., kind 반대) 로 처리. expense 였으면 income 으로 원복.
 */
export async function reverseAssetDelta(
  assetId: string | null | undefined,
  amount: number,
  kind: "expense" | "income",
): Promise<void> {
  if (!assetId || amount === 0) return;
  // expense 원복 = income 인 척, income 원복 = expense 인 척
  // 단 신용카드 expense 원복은 누적을 빼야 하므로 별도 처리
  const supabase = createClient();
  const { data: asset, error } = await supabase
    .from("assets")
    .select("id, type, balance, linked_asset_id")
    .eq("id", assetId)
    .maybeSingle();
  if (error) throw error;
  if (!asset) return;

  const type = asset.type;

  // 체크카드 + 지출 원복 → 연결 은행에 +=amount
  if (kind === "expense" && type === "debit_card") {
    if (!asset.linked_asset_id) return;
    const { data: linked, error: linkedErr } = await supabase
      .from("assets")
      .select("id, balance")
      .eq("id", asset.linked_asset_id)
      .maybeSingle();
    if (linkedErr) throw linkedErr;
    if (!linked) return;
    const { error: upErr } = await supabase
      .from("assets")
      .update({ balance: linked.balance + amount, updated_at: new Date().toISOString() })
      .eq("id", linked.id);
    if (upErr) throw upErr;
    return;
  }

  // 신용카드 + 지출 원복 → 본인 -=amount
  if (kind === "expense" && type === "credit_card") {
    const newBalance = Math.max(0, asset.balance - amount);
    const { error: upErr } = await supabase
      .from("assets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", asset.id);
    if (upErr) throw upErr;
    return;
  }

  // 신용/체크카드 + 수입 → no-op
  if (kind === "income" && (type === "credit_card" || type === "debit_card")) {
    return;
  }

  // cash / bank / savings_investment 원복
  const delta = kind === "expense" ? amount : -amount;
  const { error: upErr } = await supabase
    .from("assets")
    .update({ balance: asset.balance + delta, updated_at: new Date().toISOString() })
    .eq("id", asset.id);
  if (upErr) throw upErr;
}
```

### Step 2: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 3: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/server/asset-balance.ts
git commit -m "$(cat <<'EOF'
feat(expense): applyAssetDelta + reverseAssetDelta — 자산 타입별 잔액 자동 +/-

- cash/bank/savings_investment: 직접 +/-
- debit_card 지출: 연결 은행에서 차감
- credit_card 지출: 본인 누적
- card 수입은 no-op (안전 망)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Expense/Income Actions에 asset_id 통합

**Files:**
- Modify: `features/expense/server/actions.ts`

### Step 1: expenseInputSchema 에 asset_id 추가

Find `expenseInputSchema` (line ~9-15). Replace with:

```typescript
const expenseInputSchema = z.object({
  amount: z.number().int().min(0),
  category: z.string().min(1).max(50),
  paid_at: z.string(), // ISO
  memo: z.string().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  asset_id: z.string().uuid().nullable().optional(),
});
```

`subscriptionInputSchema` 에 asset_id 추가:

```typescript
const subscriptionInputSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().int().min(0),
  billing_day: z.number().int().min(1).max(31),
  category: z.string().min(1).max(50),
  is_active: z.boolean().optional().default(true),
  asset_id: z.string().uuid().nullable().optional(),
});
```

### Step 2: incomeInputSchema + recurringIncomeInputSchema 찾아서 동일하게

Open `features/expense/server/actions.ts`. After Task 1, line ~219+ 에 수입 섹션이 있을 것. 각 income 스키마에 `asset_id: z.string().uuid().nullable().optional()` 추가.

검색: `incomes`, `recurring_incomes` 가 들어간 스키마 찾기.

### Step 3: createExpense 에 applyAssetDelta 통합

Find `createExpense` function (line ~56). Replace with:

```typescript
export async function createExpense(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = expenseInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // 자산 잔액 자동 +/-
  if (parsed.data.asset_id) {
    const { applyAssetDelta } = await import("./asset-balance");
    await applyAssetDelta(parsed.data.asset_id, parsed.data.amount, "expense");
    revalidatePath("/expense");
  }

  revalidateExpensePaths();
  return { ok: true, data: { id: data.id } };
}
```

### Step 4: updateExpense 에 applyAssetDelta 통합

Find `updateExpense`. Replace with:

```typescript
export async function updateExpense(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = expenseInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();

  // 기존 행 가져와서 원복 후 새 값 적용
  const { data: prev } = await supabase
    .from("expenses")
    .select("amount, asset_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("expenses")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  // 잔액 동기화: 기존 영향 원복 + 새 영향 적용
  if (prev) {
    const { applyAssetDelta, reverseAssetDelta } = await import("./asset-balance");
    if (prev.asset_id) {
      await reverseAssetDelta(prev.asset_id, prev.amount, "expense");
    }
    const newAssetId = parsed.data.asset_id !== undefined ? parsed.data.asset_id : prev.asset_id;
    const newAmount = parsed.data.amount !== undefined ? parsed.data.amount : prev.amount;
    if (newAssetId) {
      await applyAssetDelta(newAssetId, newAmount, "expense");
    }
  }

  revalidateExpensePaths();
  return { ok: true, data: undefined };
}
```

### Step 5: deleteExpense 에 reverseAssetDelta 통합

Find `deleteExpense`. Replace with:

```typescript
export async function deleteExpense(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();

  // 삭제 전 잔액 원복용 정보 확보
  const { data: prev } = await supabase
    .from("expenses")
    .select("amount, asset_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (prev?.asset_id) {
    const { reverseAssetDelta } = await import("./asset-balance");
    await reverseAssetDelta(prev.asset_id, prev.amount, "expense");
  }

  revalidateExpensePaths();
  return { ok: true, data: undefined };
}
```

### Step 6: createIncome / updateIncome / deleteIncome 에 동일 패턴 적용

Find income actions in `features/expense/server/actions.ts` (after expense actions). 같은 패턴으로 `applyAssetDelta(asset_id, amount, "income")` 와 `reverseAssetDelta(asset_id, amount, "income")` 통합.

`createIncome`:
```typescript
export async function createIncome(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = incomeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("incomes")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  if (parsed.data.asset_id) {
    const { applyAssetDelta } = await import("./asset-balance");
    await applyAssetDelta(parsed.data.asset_id, parsed.data.amount, "income");
  }

  revalidateExpensePaths();
  return { ok: true, data: { id: data.id } };
}
```

`updateIncome` (expense 의 update 패턴 그대로, "expense" → "income" 으로 변경, expenses → incomes):
```typescript
export async function updateIncome(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = incomeInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();

  const { data: prev } = await supabase
    .from("incomes")
    .select("amount, asset_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("incomes")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  if (prev) {
    const { applyAssetDelta, reverseAssetDelta } = await import("./asset-balance");
    if (prev.asset_id) {
      await reverseAssetDelta(prev.asset_id, prev.amount, "income");
    }
    const newAssetId = parsed.data.asset_id !== undefined ? parsed.data.asset_id : prev.asset_id;
    const newAmount = parsed.data.amount !== undefined ? parsed.data.amount : prev.amount;
    if (newAssetId) {
      await applyAssetDelta(newAssetId, newAmount, "income");
    }
  }

  revalidateExpensePaths();
  return { ok: true, data: undefined };
}
```

`deleteIncome`:
```typescript
export async function deleteIncome(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();

  const { data: prev } = await supabase
    .from("incomes")
    .select("amount, asset_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("incomes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (prev?.asset_id) {
    const { reverseAssetDelta } = await import("./asset-balance");
    await reverseAssetDelta(prev.asset_id, prev.amount, "income");
  }

  revalidateExpensePaths();
  return { ok: true, data: undefined };
}
```

### Step 7: subscriptions / recurring_incomes 액션은 asset_id 컬럼만 저장 (잔액 변동은 실제 거래에서)

스키마에 asset_id 추가했으면 자동으로 저장됨. 잔액 +/- 로직은 적용 안 함 (정기 등록만으론 잔액 변동 없음).

### Step 8: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 9: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/server/actions.ts
git commit -m "$(cat <<'EOF'
feat(expense): expense/income 액션에 asset_id + applyAssetDelta 통합

- create/update/delete 시 자산 잔액 자동 +/-
- update 는 기존 영향 원복 후 새 영향 적용
- subscriptions/recurring_incomes 는 asset_id 컬럼만 저장 (잔액 변동 X)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Asset CRUD Actions + settleCreditCard

**Files:**
- Create: `features/expense/server/asset-actions.ts`

### Step 1: asset-actions.ts 작성

Create `features/expense/server/asset-actions.ts`:

```typescript
// features/expense/server/asset-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { applyAssetDelta } from "./asset-balance";
import type { ActionResult } from "./actions";

const assetTypeEnum = z.enum([
  "cash",
  "bank",
  "debit_card",
  "credit_card",
  "savings_investment",
]);

const colorRegex = /^#[0-9A-Fa-f]{6}$/;

const createAssetSchema = z.object({
  name: z.string().min(1).max(30),
  type: assetTypeEnum,
  balance: z.number().int().optional().default(0),
  linked_asset_id: z.string().uuid().nullable().optional(),
  payment_day: z.number().int().min(1).max(31).nullable().optional(),
  color: z.string().regex(colorRegex).optional(),
  sort_order: z.number().int().optional(),
});

const updateAssetSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  linked_asset_id: z.string().uuid().nullable().optional(),
  payment_day: z.number().int().min(1).max(31).nullable().optional(),
  color: z.string().regex(colorRegex).optional(),
  sort_order: z.number().int().optional(),
  is_archived: z.boolean().optional(),
});

const settleSchema = z.object({
  credit_card_asset_id: z.string().uuid(),
  from_bank_asset_id: z.string().uuid(),
  amount: z.number().int().min(1),
});

async function getUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

function revalidate() {
  revalidatePath("/expense");
  revalidatePath("/calendar");
}

// === CRUD ===

export async function createAsset(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createAssetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  // 체크카드는 linked_asset_id 필수
  if (parsed.data.type === "debit_card" && !parsed.data.linked_asset_id) {
    return { ok: false, error: "체크카드는 연결 은행이 필요합니다" };
  }
  // 신용카드는 payment_day 필수
  if (parsed.data.type === "credit_card" && parsed.data.payment_day == null) {
    return { ok: false, error: "신용카드는 결제일이 필요합니다" };
  }

  const userId = await getUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .insert({ ...parsed.data, user_id: userId })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: { id: data.id } };
}

export async function updateAsset(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateAssetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("assets")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: undefined };
}

export async function archiveAsset(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("assets")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: undefined };
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  // ON DELETE SET NULL 이므로 expenses/incomes 의 asset_id 는 자동 NULL
  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: undefined };
}

/** 자산 잔액을 newBalance 로 덮어쓰기 (실제 통장과 sync 보정). */
export async function adjustAssetBalance(
  id: string,
  newBalance: number,
): Promise<ActionResult> {
  await getUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("assets")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, data: undefined };
}

// === 신용카드 정산 ===

/**
 * 신용카드 누적액을 결제일에 연결 은행에서 차감.
 * 1) from_bank.balance -= amount
 * 2) credit_card.balance -= amount (전액이면 0)
 * 3) expenses 에 "{card} N월 정산" 한 줄 자동 생성 (가계부 흐름 추적용)
 *
 * 단, expenses 의 asset_id 는 from_bank 으로 두지만 applyAssetDelta 는 호출 안 함
 * (이미 위에서 직접 차감했으므로 이중 차감 방지).
 */
export async function settleCreditCard(input: unknown): Promise<ActionResult> {
  const parsed = settleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력입니다" };

  const userId = await getUserId();
  const supabase = createClient();

  // 두 자산 가져오기
  const { data: assets, error: fetchErr } = await supabase
    .from("assets")
    .select("id, name, type, balance")
    .in("id", [parsed.data.credit_card_asset_id, parsed.data.from_bank_asset_id]);
  if (fetchErr) return { ok: false, error: fetchErr.message };

  const card = assets?.find((a) => a.id === parsed.data.credit_card_asset_id);
  const bank = assets?.find((a) => a.id === parsed.data.from_bank_asset_id);
  if (!card || !bank) return { ok: false, error: "자산을 찾을 수 없습니다" };
  if (card.type !== "credit_card") return { ok: false, error: "신용카드 자산이 아닙니다" };
  if (bank.type !== "bank" && bank.type !== "cash") {
    return { ok: false, error: "결제 출처는 은행/현금만 가능합니다" };
  }
  if (parsed.data.amount > card.balance) {
    return { ok: false, error: "정산 금액이 누적액보다 큽니다" };
  }

  const now = new Date();
  const month = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  const memo = `${card.name} ${month} 정산`;

  // 1) 은행 차감
  const { error: bankErr } = await supabase
    .from("assets")
    .update({
      balance: bank.balance - parsed.data.amount,
      updated_at: now.toISOString(),
    })
    .eq("id", bank.id);
  if (bankErr) return { ok: false, error: bankErr.message };

  // 2) 신용카드 누적 -= amount
  const { error: cardErr } = await supabase
    .from("assets")
    .update({
      balance: card.balance - parsed.data.amount,
      updated_at: now.toISOString(),
    })
    .eq("id", card.id);
  if (cardErr) return { ok: false, error: cardErr.message };

  // 3) expenses 흔적 (asset_id = 은행, category = "카드결제")
  //    applyAssetDelta 는 호출 안 함 — 이미 위에서 직접 차감했음
  const { error: expErr } = await supabase.from("expenses").insert({
    user_id: userId,
    amount: parsed.data.amount,
    category: "카드결제",
    paid_at: now.toISOString(),
    memo,
    asset_id: bank.id,
  });
  if (expErr) return { ok: false, error: expErr.message };

  revalidate();
  return { ok: true, data: undefined };
}
```

### Step 2: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 3: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/server/asset-actions.ts
git commit -m "$(cat <<'EOF'
feat(expense): asset CRUD 액션 + settleCreditCard

- createAsset (체크카드 linked / 신용카드 payment_day validation)
- updateAsset / archiveAsset / deleteAsset / adjustAssetBalance
- settleCreditCard: 은행 차감 + 카드 누적 -= + expenses 흔적

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: AssetColorPicker + AssetModal

**Files:**
- Create: `features/expense/components/assets/AssetColorPicker.tsx`
- Create: `features/expense/components/assets/AssetModal.tsx`

### Step 1: AssetColorPicker 작성

Create `features/expense/components/assets/AssetColorPicker.tsx`:

```tsx
// features/expense/components/assets/AssetColorPicker.tsx
"use client";

import { Check } from "lucide-react";
import { ASSET_COLOR_PALETTE } from "../../lib/asset-colors";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function AssetColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {ASSET_COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`색 ${c}`}
          onClick={() => onChange(c)}
          className="relative h-8 w-8 rounded-full transition-transform active:scale-90 hover:scale-105"
          style={{ backgroundColor: c }}
        >
          {value.toLowerCase() === c.toLowerCase() && (
            <Check
              size={16}
              className="absolute inset-0 m-auto text-white drop-shadow"
              strokeWidth={3}
            />
          )}
        </button>
      ))}
    </div>
  );
}
```

### Step 2: AssetModal 작성

Create `features/expense/components/assets/AssetModal.tsx`:

```tsx
// features/expense/components/assets/AssetModal.tsx
"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  type AssetType,
} from "../../lib/asset-types";
import { ASSET_DEFAULT_COLOR_BY_TYPE } from "../../lib/asset-colors";
import { AssetColorPicker } from "./AssetColorPicker";
import {
  createAsset,
  updateAsset,
} from "../../server/asset-actions";
import type { AssetRow } from "../../server/asset-queries";

type CreateProps = {
  mode: "create";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 연결 은행 후보 (체크/신용카드용) — type=bank 만. */
  banks: AssetRow[];
};

type EditProps = {
  mode: "edit";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: AssetRow;
  banks: AssetRow[];
};

type Props = CreateProps | EditProps;

function formatThousands(n: string): string {
  if (!n) return "";
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function AssetModal(props: Props) {
  const { open, onOpenChange, banks } = props;
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.initial : null;

  const [pending, startTransition] = useTransition();

  const [type, setType] = useState<AssetType>(
    (initial?.type as AssetType) ?? "cash",
  );
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [balance, setBalance] = useState<string>(
    initial?.balance != null ? String(initial.balance) : "0",
  );
  const [linkedAssetId, setLinkedAssetId] = useState<string>(
    initial?.linked_asset_id ?? "",
  );
  const [paymentDay, setPaymentDay] = useState<string>(
    initial?.payment_day != null ? String(initial.payment_day) : "",
  );
  const [color, setColor] = useState<string>(
    initial?.color ?? ASSET_DEFAULT_COLOR_BY_TYPE[type],
  );

  // type 바뀔 때 default color 도 따라 변경 (생성 모드만)
  const handleTypeChange = (next: AssetType) => {
    setType(next);
    if (!isEdit) {
      setColor(ASSET_DEFAULT_COLOR_BY_TYPE[next]);
    }
  };

  const showBalance = useMemo(
    () => type === "cash" || type === "bank" || type === "savings_investment" || type === "credit_card",
    [type],
  );
  const balanceLabel = type === "credit_card" ? "현재 누적" : "현재 잔액";
  const showLinkedBank = type === "debit_card" || type === "credit_card";
  const linkedBankRequired = type === "debit_card";
  const showPaymentDay = type === "credit_card";

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("이름을 입력하세요");
      return;
    }
    if (linkedBankRequired && !linkedAssetId) {
      toast.error("체크카드는 연결 은행이 필요합니다");
      return;
    }
    if (showPaymentDay) {
      const day = parseInt(paymentDay, 10);
      if (!day || day < 1 || day > 31) {
        toast.error("결제일은 1-31 사이여야 합니다");
        return;
      }
    }

    const balanceNum = parseInt(balance.replace(/\D/g, ""), 10) || 0;

    startTransition(async () => {
      let result: { ok: true; data: unknown } | { ok: false; error: string };
      if (isEdit) {
        result = await updateAsset(initial!.id, {
          name: name.trim(),
          linked_asset_id: showLinkedBank ? (linkedAssetId || null) : null,
          payment_day: showPaymentDay ? parseInt(paymentDay, 10) : null,
          color,
        });
      } else {
        result = await createAsset({
          name: name.trim(),
          type,
          balance: showBalance ? balanceNum : 0,
          linked_asset_id: showLinkedBank ? (linkedAssetId || null) : null,
          payment_day: showPaymentDay ? parseInt(paymentDay, 10) : null,
          color,
        });
      }
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "수정되었습니다" : "추가되었습니다");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "자산 수정" : "자산 추가"}</DialogTitle>
          <DialogDescription className="sr-only">
            자산의 이름, 종류, 잔액, 색을 입력합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 종류 (생성 모드만 변경 가능) */}
          <div className="space-y-2">
            <Label>종류</Label>
            <div className="flex gap-2 flex-wrap">
              {ASSET_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={isEdit}
                  onClick={() => handleTypeChange(t)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    type === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/60 hover:bg-muted/40"
                  } ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {ASSET_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-name">이름</Label>
            <Input
              id="asset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 신한은행"
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label>색</Label>
            <AssetColorPicker value={color} onChange={setColor} />
          </div>

          {showBalance && (
            <div className="space-y-2">
              <Label htmlFor="asset-balance">{balanceLabel}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="asset-balance"
                  inputMode="numeric"
                  value={formatThousands(balance)}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">원</span>
              </div>
            </div>
          )}

          {showLinkedBank && (
            <div className="space-y-2">
              <Label htmlFor="asset-linked">
                연결 은행 {linkedBankRequired ? "" : "(선택 — 자동 차감용)"}
              </Label>
              <Select value={linkedAssetId} onValueChange={setLinkedAssetId}>
                <SelectTrigger id="asset-linked">
                  <SelectValue placeholder="은행 선택" />
                </SelectTrigger>
                <SelectContent>
                  {banks.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      먼저 은행 자산을 추가해주세요
                    </div>
                  ) : (
                    banks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {showPaymentDay && (
            <div className="space-y-2">
              <Label htmlFor="asset-payment-day">결제일</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="asset-payment-day"
                  inputMode="numeric"
                  value={paymentDay}
                  onChange={(e) =>
                    setPaymentDay(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="15"
                  maxLength={2}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">일</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
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
```

### Step 3: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 4: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/components/assets/AssetColorPicker.tsx features/expense/components/assets/AssetModal.tsx
git commit -m "$(cat <<'EOF'
feat(expense): AssetColorPicker + AssetModal — 자산 추가/편집 폼

- 6색 팔레트 picker (체크 마크 표시)
- type 별 조건부 필드 (잔액/연결 은행/결제일)
- 체크카드 linked 필수 / 신용카드 payment_day 필수 validation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: AssetCard

**Files:**
- Create: `features/expense/components/assets/AssetCard.tsx`

### Step 1: AssetCard 작성

Create `features/expense/components/assets/AssetCard.tsx`:

```tsx
// features/expense/components/assets/AssetCard.tsx
"use client";

import { MoreHorizontal, ArrowRight } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";
import {
  archiveAsset,
  deleteAsset,
} from "../../server/asset-actions";
import type { AssetRow } from "../../server/asset-queries";
import type { AssetType } from "../../lib/asset-types";

type Props = {
  asset: AssetRow;
  /** linked_asset_id 해석용 — 체크카드 → 은행명. */
  linkedBankName?: string;
  onClick?: () => void;
  onEdit?: () => void;
};

function formatKrw(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(n).toLocaleString("ko-KR")}`;
}

export function AssetCard({ asset, linkedBankName, onClick, onEdit }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);

  const type = asset.type as AssetType;
  const showBalance = type !== "debit_card";

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPending(true);
    const r = await archiveAsset(asset.id);
    setPending(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("보관됨");
  };

  const handleDelete = async () => {
    setPending(true);
    const r = await deleteAsset(asset.id);
    setPending(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("삭제됨");
    setConfirmDelete(false);
  };

  return (
    <>
      <div
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg border border-border/40 bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-border/80 cursor-pointer"
      >
        {/* 색 도트 */}
        <span
          className="h-3 w-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: asset.color }}
          aria-hidden
        />

        {/* 이름 + 연결 표시 */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{asset.name}</div>
          {type === "debit_card" && linkedBankName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowRight size={12} strokeWidth={1.8} />
              <span className="truncate">{linkedBankName}</span>
            </div>
          )}
          {type === "credit_card" && asset.payment_day != null && (
            <div className="text-xs text-muted-foreground">
              {asset.payment_day}일 결제
            </div>
          )}
        </div>

        {/* 잔액 */}
        {showBalance && (
          <div
            className={`text-sm font-semibold tabular-nums ${
              type === "credit_card" && asset.balance > 0
                ? "text-[#DC2626] dark:text-[#F87171]"
                : ""
            }`}
          >
            {formatKrw(asset.balance)}
          </div>
        )}

        {/* 더보기 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded hover:bg-muted/60 active:scale-95 transition-transform"
              onClick={(e) => e.stopPropagation()}
              aria-label="자산 메뉴"
            >
              <MoreHorizontal size={16} strokeWidth={1.8} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
              편집
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive} disabled={pending}>
              보관
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="text-destructive focus:text-destructive"
            >
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>자산 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{asset.name}" 을 삭제합니다. 이 자산을 사용한 거래는 "미지정" 으로 바뀝니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={pending}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### Step 2: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 3: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/components/assets/AssetCard.tsx
git commit -m "$(cat <<'EOF'
feat(expense): AssetCard — 색도트 + 이름 + 잔액 + 더보기(편집/보관/삭제)

- 체크카드 → 연결 은행 화살표 표시
- 신용카드 결제일 / 누적액 빨강 강조
- 삭제 확인 AlertDialog (cascade 안 함 안내)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: AssetGroup + AssetsSummaryHeader

**Files:**
- Create: `features/expense/components/assets/AssetGroup.tsx`
- Create: `features/expense/components/assets/AssetsSummaryHeader.tsx`

### Step 1: AssetGroup 작성

Create `features/expense/components/assets/AssetGroup.tsx`:

```tsx
// features/expense/components/assets/AssetGroup.tsx
"use client";

import { AssetCard } from "./AssetCard";
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_ICONS,
  type AssetType,
} from "../../lib/asset-types";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  type: AssetType;
  assets: AssetRow[];
  /** 전체 자산 (linked 이름 해석용). */
  allAssets: AssetRow[];
  onCardClick?: (asset: AssetRow) => void;
  onEditAsset?: (asset: AssetRow) => void;
  /** 신용카드 그룹에서 정산 가능한 카드 ID 들 — CreditCardSettleButton 표시용. */
  settlementCardIds?: Set<string>;
  renderSettleButton?: (asset: AssetRow) => React.ReactNode;
};

function formatKrw(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(n).toLocaleString("ko-KR")}`;
}

export function AssetGroup({
  type,
  assets,
  allAssets,
  onCardClick,
  onEditAsset,
  settlementCardIds,
  renderSettleButton,
}: Props) {
  if (assets.length === 0) return null;

  const Icon = ASSET_TYPE_ICONS[type];
  const groupSum = assets.reduce((s, a) => s + a.balance, 0);
  const showGroupSum = type !== "debit_card";

  const linkedNameOf = (a: AssetRow): string | undefined => {
    if (!a.linked_asset_id) return undefined;
    return allAssets.find((x) => x.id === a.linked_asset_id)?.name;
  };

  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon size={16} strokeWidth={1.8} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">{ASSET_TYPE_LABELS[type]}</h3>
        </div>
        {showGroupSum && (
          <div className="text-sm font-medium tabular-nums text-muted-foreground">
            {formatKrw(type === "credit_card" ? -groupSum : groupSum)}
          </div>
        )}
      </header>

      <div className="space-y-1.5">
        {assets.map((a) => (
          <div key={a.id} className="space-y-1.5">
            <AssetCard
              asset={a}
              linkedBankName={linkedNameOf(a)}
              onClick={() => onCardClick?.(a)}
              onEdit={() => onEditAsset?.(a)}
            />
            {type === "credit_card" &&
              settlementCardIds?.has(a.id) &&
              renderSettleButton?.(a)}
          </div>
        ))}
      </div>
    </section>
  );
}
```

### Step 2: AssetsSummaryHeader 작성

Create `features/expense/components/assets/AssetsSummaryHeader.tsx`:

```tsx
// features/expense/components/assets/AssetsSummaryHeader.tsx
"use client";

import { ASSET_TYPE_SIGN, type AssetType } from "../../lib/asset-types";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  assets: AssetRow[];
};

function formatKrw(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(n).toLocaleString("ko-KR")}`;
}

export function AssetsSummaryHeader({ assets }: Props) {
  let total = 0;
  let bankSum = 0;
  let cardDebt = 0;
  for (const a of assets) {
    const type = a.type as AssetType;
    total += ASSET_TYPE_SIGN[type] * a.balance;
    if (type === "bank" || type === "cash") bankSum += a.balance;
    if (type === "credit_card") cardDebt += a.balance;
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">총 자산 (순자산)</div>
        <div className="text-2xl font-bold tabular-nums">{formatKrw(total)}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">현금+은행</div>
          <div className="font-semibold tabular-nums">{formatKrw(bankSum)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">카드 누적</div>
          <div
            className={`font-semibold tabular-nums ${
              cardDebt > 0 ? "text-[#DC2626] dark:text-[#F87171]" : ""
            }`}
          >
            {cardDebt > 0 ? `-${formatKrw(cardDebt).replace("-", "")}` : "₩0"}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 3: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 4: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/components/assets/AssetGroup.tsx features/expense/components/assets/AssetsSummaryHeader.tsx
git commit -m "$(cat <<'EOF'
feat(expense): AssetGroup + AssetsSummaryHeader — 그룹 헤더 + 총자산 카드

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: CreditCardSettleButton

**Files:**
- Create: `features/expense/components/assets/CreditCardSettleButton.tsx`

### Step 1: CreditCardSettleButton 작성

Create `features/expense/components/assets/CreditCardSettleButton.tsx`:

```tsx
// features/expense/components/assets/CreditCardSettleButton.tsx
"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { settleCreditCard } from "../../server/asset-actions";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  card: AssetRow;
  /** 결제 가능한 은행/현금 자산. */
  bankOptions: AssetRow[];
};

function formatKrw(n: number): string {
  return `₩${n.toLocaleString("ko-KR")}`;
}

function formatThousands(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function CreditCardSettleButton({ card, bankOptions }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [fromAssetId, setFromAssetId] = useState<string>(
    card.linked_asset_id ?? bankOptions[0]?.id ?? "",
  );
  const [amountInput, setAmountInput] = useState<string>(String(card.balance));

  const handleSettle = () => {
    const amount = parseInt(amountInput.replace(/\D/g, ""), 10);
    if (!amount || amount < 1) {
      toast.error("정산 금액을 입력하세요");
      return;
    }
    if (amount > card.balance) {
      toast.error("정산 금액이 누적액보다 큽니다");
      return;
    }
    if (!fromAssetId) {
      toast.error("출처 은행/현금을 선택하세요");
      return;
    }

    startTransition(async () => {
      const r = await settleCreditCard({
        credit_card_asset_id: card.id,
        from_bank_asset_id: fromAssetId,
        amount,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("정산되었습니다");
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 active:scale-[0.98] transition-all"
      >
        <CreditCard size={14} strokeWidth={1.8} />
        {formatKrw(card.balance)} 정산하기
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{card.name} 정산</DialogTitle>
            <DialogDescription>
              누적된 카드 금액을 은행/현금에서 차감합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>정산 금액</Label>
              <div className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  value={formatThousands(amountInput)}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">원</span>
              </div>
              <p className="text-xs text-muted-foreground">
                현재 누적: {formatKrw(card.balance)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>출처 (은행/현금)</Label>
              <Select value={fromAssetId} onValueChange={setFromAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {bankOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({formatKrw(b.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button onClick={handleSettle} disabled={pending}>
              {pending ? "정산 중..." : "정산"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Step 2: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 3: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/components/assets/CreditCardSettleButton.tsx
git commit -m "$(cat <<'EOF'
feat(expense): CreditCardSettleButton — 결제일 도래 시 정산 버튼 + 다이얼로그

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: AssetsTab + ExpensePage 5탭 통합

**Files:**
- Create: `features/expense/components/assets/AssetsTab.tsx`
- Modify: `features/expense/components/ExpensePage.tsx`
- Modify: `app/(app)/expense/page.tsx`

### Step 1: AssetsTab 작성

Create `features/expense/components/assets/AssetsTab.tsx`:

```tsx
// features/expense/components/assets/AssetsTab.tsx
"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetsSummaryHeader } from "./AssetsSummaryHeader";
import { AssetGroup } from "./AssetGroup";
import { AssetModal } from "./AssetModal";
import { AssetDetailView } from "./AssetDetailView";
import { CreditCardSettleButton } from "./CreditCardSettleButton";
import { ASSET_TYPES } from "../../lib/asset-types";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  assets: AssetRow[];
  /** 결제일 도래 신용카드 ID 셋 (서버에서 계산). */
  settlementCardIds: string[];
};

export function AssetsTab({ assets, settlementCardIds }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [detailAsset, setDetailAsset] = useState<AssetRow | null>(null);

  const banks = useMemo(
    () => assets.filter((a) => a.type === "bank"),
    [assets],
  );
  const bankOptions = useMemo(
    () => assets.filter((a) => a.type === "bank" || a.type === "cash"),
    [assets],
  );
  const settlementSet = useMemo(
    () => new Set(settlementCardIds),
    [settlementCardIds],
  );

  const grouped = useMemo(() => {
    const g: Record<string, AssetRow[]> = {
      cash: [],
      bank: [],
      debit_card: [],
      credit_card: [],
      savings_investment: [],
    };
    for (const a of assets) g[a.type].push(a);
    return g;
  }, [assets]);

  if (detailAsset) {
    return (
      <AssetDetailView
        asset={detailAsset}
        allAssets={assets}
        onBack={() => setDetailAsset(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <AssetsSummaryHeader assets={assets} />

      <div className="space-y-5">
        {ASSET_TYPES.map((t) => (
          <AssetGroup
            key={t}
            type={t}
            assets={grouped[t]}
            allAssets={assets}
            onCardClick={(a) => setDetailAsset(a)}
            onEditAsset={(a) => setEditing(a)}
            settlementCardIds={settlementSet}
            renderSettleButton={(a) => (
              <CreditCardSettleButton card={a} bankOptions={bankOptions} />
            )}
          />
        ))}
      </div>

      <Button
        variant="outline"
        onClick={() => setShowAdd(true)}
        className="w-full justify-center"
      >
        <Plus size={16} strokeWidth={1.8} className="mr-2" />
        자산 추가
      </Button>

      {showAdd && (
        <AssetModal
          mode="create"
          open={showAdd}
          onOpenChange={setShowAdd}
          banks={banks}
        />
      )}
      {editing && (
        <AssetModal
          mode="edit"
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
          initial={editing}
          banks={banks}
        />
      )}
    </div>
  );
}
```

### Step 2: ExpensePage 에 "자산" 탭 추가 (2번째 위치)

Open `features/expense/components/ExpensePage.tsx`. Find Tabs structure. Add 자산 탭 to TabsList and TabsContent.

Existing tabs (예상): `월간` `정기 결제` `정기 수입` `예산`
New order: `월간` `자산` `정기 결제` `정기 수입` `예산`

Add import 상단에:
```tsx
import { AssetsTab } from "./assets/AssetsTab";
import type { AssetRow } from "../server/asset-queries";
```

Props 에 assets / settlementCardIds 추가:
```tsx
type Props = {
  // ... 기존 props
  assets: AssetRow[];
  settlementCardIds: string[];
};
```

Tabs grid-cols-4 → grid-cols-5 으로 변경. TabsTrigger 와 TabsContent 추가:

`<TabsList>` 내부에 (월간 다음):
```tsx
<TabsTrigger value="assets">자산</TabsTrigger>
```

TabsContent (월간 content 다음):
```tsx
<TabsContent value="assets" forceMount={false}>
  <motion.div {...tabContentMotion}>
    <AssetsTab assets={assets} settlementCardIds={settlementCardIds} />
  </motion.div>
</TabsContent>
```

기존 grid-cols-* 클래스 모두 5로 업데이트. 예: `className="w-full grid grid-cols-4 ..."` → `grid-cols-5`.

ExpensePage 함수 시그니처에서 `assets`, `settlementCardIds` 받기:
```tsx
export function ExpensePage({
  currentMonth,
  expenses,
  incomes,
  usedCategories,
  target,
  actual,
  totalsByCategory,
  totalsByIncomeCategory,
  subscriptions,
  recurringIncomes,
  budgets,
  assets,
  settlementCardIds,
}: Props) {
```

### Step 3: `app/(app)/expense/page.tsx` 에 새 쿼리 추가

Open `app/(app)/expense/page.tsx`. Replace imports + Promise.all:

```tsx
import { ExpensePage } from "@/features/expense/components/ExpensePage";
import {
  getBudgetsForMonth,
  getExpensesForMonth,
  getIncomesForMonth,
  getMonthlyTarget,
  getMonthlyTotalsByIncomeCategory,
  getRecurringIncomes,
  getSubscriptions,
  getUsedCategories,
} from "@/features/expense/server/queries";
import {
  getActiveAssets,
  getCreditCardsAwaitingSettlement,
} from "@/features/expense/server/asset-queries";

export const metadata = { title: "가계부" };

type Props = { searchParams: { month?: string; action?: string } };

function thisMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isValidMonth(m: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

export default async function ExpenseRoute({ searchParams }: Props) {
  const month =
    searchParams.month && isValidMonth(searchParams.month)
      ? searchParams.month
      : thisMonthIso();
  const [
    expenses,
    incomes,
    usedCategories,
    target,
    subscriptions,
    recurringIncomes,
    budgets,
    totalsByIncomeCategory,
    assets,
    settlementCards,
  ] = await Promise.all([
    getExpensesForMonth(month),
    getIncomesForMonth(month),
    getUsedCategories(),
    getMonthlyTarget(month),
    getSubscriptions(),
    getRecurringIncomes(),
    getBudgetsForMonth(month),
    getMonthlyTotalsByIncomeCategory(month),
    getActiveAssets(),
    getCreditCardsAwaitingSettlement(),
  ]);

  // 기존 actual/totalsByCategory 계산 (그대로 유지)
  const expenseSum = expenses.reduce((s, e) => s + e.amount, 0);
  const activeSubscriptionSum = subscriptions
    .filter((s) => s.is_active)
    .reduce((s, sub) => s + sub.amount, 0);
  const actual = expenseSum + activeSubscriptionSum;

  const totalsByCategory: Record<string, number> = {};
  for (const e of expenses) {
    totalsByCategory[e.category] =
      (totalsByCategory[e.category] ?? 0) + e.amount;
  }
  for (const sub of subscriptions) {
    if (!sub.is_active) continue;
    totalsByCategory[sub.category] =
      (totalsByCategory[sub.category] ?? 0) + sub.amount;
  }
  for (const ri of recurringIncomes) {
    if (!ri.is_active) continue;
    totalsByIncomeCategory[ri.category] =
      (totalsByIncomeCategory[ri.category] ?? 0) + ri.amount;
  }

  const settlementCardIds = settlementCards.map((c) => c.id);

  return (
    <ExpensePage
      currentMonth={month}
      expenses={expenses}
      incomes={incomes}
      usedCategories={usedCategories}
      target={target}
      actual={actual}
      totalsByCategory={totalsByCategory}
      totalsByIncomeCategory={totalsByIncomeCategory}
      subscriptions={subscriptions}
      recurringIncomes={recurringIncomes}
      budgets={budgets}
      assets={assets}
      settlementCardIds={settlementCardIds}
    />
  );
}
```

### Step 4: 타입체크 + 페이지 probe

```bash
cd /c/dev/lunabear-calendar
pnpm tsc --noEmit
```
Expected: tsc 0

dev 서버 띄우고:
```bash
pnpm dev
```

Wait until 시작 후:
```bash
curl -s -o /dev/null -w "/expense: %{http_code}\n" http://localhost:3000/expense
```
Expected: 307 (auth redirect) or 200

### Step 5: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/components/assets/AssetsTab.tsx features/expense/components/ExpensePage.tsx app/(app)/expense/page.tsx
git commit -m "$(cat <<'EOF'
feat(expense): AssetsTab + ExpensePage 5탭 통합 (자산 탭 2번째)

- AssetsTab: 총자산 카드 + 타입별 그룹 + 정산 버튼 + 추가 버튼
- ExpensePage: 5탭 grid-cols-5 (월간/자산/정기결제/정기수입/예산)
- 서버 쿼리에 getActiveAssets + getCreditCardsAwaitingSettlement

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: AssetBalanceAdjustDialog + AssetDetailView

**Files:**
- Create: `features/expense/components/assets/AssetBalanceAdjustDialog.tsx`
- Create: `features/expense/components/assets/AssetDetailView.tsx`

### Step 1: AssetBalanceAdjustDialog 작성

Create `features/expense/components/assets/AssetBalanceAdjustDialog.tsx`:

```tsx
// features/expense/components/assets/AssetBalanceAdjustDialog.tsx
"use client";

import { useState, useTransition } from "react";
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
import { toast } from "sonner";
import { adjustAssetBalance } from "../../server/asset-actions";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  asset: AssetRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

function formatThousands(n: string): string {
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function AssetBalanceAdjustDialog({ asset, open, onOpenChange }: Props) {
  const [pending, startTransition] = useTransition();
  const [input, setInput] = useState<string>(String(asset.balance));

  const handleSubmit = () => {
    const n = parseInt(input.replace(/\D/g, ""), 10);
    if (isNaN(n) || n < 0) {
      toast.error("0 이상의 금액을 입력하세요");
      return;
    }
    startTransition(async () => {
      const r = await adjustAssetBalance(asset.id, n);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("잔액이 보정되었습니다");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>잔액 보정</DialogTitle>
          <DialogDescription>
            실제 통장 잔액과 맞춰 직접 입력합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="adjust-balance">새 잔액</Label>
          <div className="flex items-center gap-2">
            <Input
              id="adjust-balance"
              inputMode="numeric"
              value={formatThousands(input)}
              onChange={(e) => setInput(e.target.value)}
            />
            <span className="text-sm text-muted-foreground">원</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
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
```

### Step 2: AssetDetailView 작성

Create `features/expense/components/assets/AssetDetailView.tsx`:

```tsx
// features/expense/components/assets/AssetDetailView.tsx
"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetBalanceAdjustDialog } from "./AssetBalanceAdjustDialog";
import { ASSET_TYPE_LABELS, type AssetType } from "../../lib/asset-types";
import type { AssetRow, AssetTransaction } from "../../server/asset-queries";
import { isoToLocalDateKey } from "@/lib/datetime";

type Props = {
  asset: AssetRow;
  allAssets: AssetRow[];
  onBack: () => void;
};

function formatKrw(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(n).toLocaleString("ko-KR")}`;
}

function formatMonthDay(iso: string): string {
  const k = isoToLocalDateKey(iso);
  const [, mm, dd] = k.split("-");
  return `${parseInt(mm, 10)}/${parseInt(dd, 10)}`;
}

export function AssetDetailView({ asset, allAssets, onBack }: Props) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [txns, setTxns] = useState<AssetTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const url = `/api/expense/asset-transactions?asset_id=${asset.id}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setTxns(data.items ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [asset.id]);

  const type = asset.type as AssetType;
  const linkedBank =
    type === "debit_card" && asset.linked_asset_id
      ? allAssets.find((a) => a.id === asset.linked_asset_id)
      : null;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1 -ml-1 rounded hover:bg-muted/60 active:scale-95 transition-transform"
          aria-label="뒤로"
        >
          <ArrowLeft size={20} strokeWidth={1.8} />
        </button>
        <h2 className="text-base font-semibold">자산 상세</h2>
      </header>

      <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: asset.color }}
            aria-hidden
          />
          <div className="text-base font-medium">{asset.name}</div>
        </div>
        <div className="text-2xl font-bold tabular-nums">
          {type === "debit_card"
            ? linkedBank
              ? formatKrw(linkedBank.balance)
              : "₩0"
            : formatKrw(
                type === "credit_card" ? -asset.balance : asset.balance,
              )}
        </div>
        <div className="text-xs text-muted-foreground">
          {ASSET_TYPE_LABELS[type]}
          {linkedBank ? ` · ${linkedBank.name}` : ""}
          {type === "credit_card" && asset.payment_day != null
            ? ` · ${asset.payment_day}일 결제`
            : ""}
        </div>
        {type !== "debit_card" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdjustOpen(true)}
            className="text-xs"
          >
            <Settings size={14} strokeWidth={1.8} className="mr-1" />
            잔액 보정
          </Button>
        )}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold px-1">최근 거래</h3>
        {loading ? (
          <div className="text-sm text-muted-foreground px-1">불러오는 중...</div>
        ) : txns.length === 0 ? (
          <div className="text-sm text-muted-foreground px-1">
            이 자산의 거래가 없습니다.
          </div>
        ) : (
          <ul className="space-y-1">
            {txns.map((t) => (
              <li
                key={`${t.kind}-${t.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card p-2.5"
              >
                <div className="text-xs text-muted-foreground tabular-nums w-10">
                  {formatMonthDay(
                    t.kind === "expense" ? t.paid_at : t.received_at,
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {t.memo || t.category}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.category}
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    t.kind === "income"
                      ? "text-[#16A34A] dark:text-[#4ADE80]"
                      : "text-[#DC2626] dark:text-[#F87171]"
                  }`}
                >
                  {t.kind === "income" ? "+" : "-"}
                  {formatKrw(t.amount).replace("-", "")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AssetBalanceAdjustDialog
        asset={asset}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
    </div>
  );
}
```

### Step 3: `/api/expense/asset-transactions` 라우트 작성

Create `app/api/expense/asset-transactions/route.ts`:

```typescript
// app/api/expense/asset-transactions/route.ts
import { NextResponse } from "next/server";
import { getTransactionsForAsset } from "@/features/expense/server/asset-queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("asset_id");
  if (!assetId) {
    return NextResponse.json({ items: [] }, { status: 400 });
  }
  try {
    const items = await getTransactionsForAsset(assetId, 50);
    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ items: [], error: msg }, { status: 500 });
  }
}
```

### Step 4: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 5: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/components/assets/AssetBalanceAdjustDialog.tsx features/expense/components/assets/AssetDetailView.tsx app/api/expense/asset-transactions/route.ts
git commit -m "$(cat <<'EOF'
feat(expense): AssetDetailView + 잔액 보정 다이얼로그 + asset-transactions API

- 자산 카드 클릭 시 상세 페이지
- 잔액 보정 (실제 통장과 sync)
- 그 자산의 거래만 시간 역순 표시

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: AssetChipPicker for TransactionModal

**Files:**
- Create: `features/expense/components/transaction-extras/AssetChipPicker.tsx`
- Modify: `features/expense/components/TransactionModal.tsx`

### Step 1: AssetChipPicker 작성

Create `features/expense/components/transaction-extras/AssetChipPicker.tsx`:

```tsx
// features/expense/components/transaction-extras/AssetChipPicker.tsx
"use client";

import { Check } from "lucide-react";
import { canReceiveIncome, type AssetType } from "../../lib/asset-types";
import type { AssetRow } from "../../server/asset-queries";

type Props = {
  assets: AssetRow[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** "income" 이면 카드 자산 비활성화. */
  kind: "expense" | "income";
};

export function AssetChipPicker({ assets, value, onChange, kind }: Props) {
  if (assets.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 text-xs rounded-full border transition-all ${
          value === null
            ? "bg-muted border-foreground/30"
            : "border-border/60 hover:bg-muted/40"
        }`}
      >
        미지정
      </button>
      {assets.map((a) => {
        const disabled = kind === "income" && !canReceiveIncome(a.type as AssetType);
        const selected = value === a.id;
        return (
          <button
            key={a.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(a.id)}
            className={`flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 text-xs rounded-full border transition-all ${
              selected
                ? "border-foreground/40 bg-muted"
                : "border-border/60 hover:bg-muted/40"
            } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            title={disabled ? "이 자산엔 수입을 기록할 수 없습니다" : undefined}
          >
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: a.color }}
              aria-hidden
            />
            <span className="whitespace-nowrap">{a.name}</span>
            {selected && <Check size={12} strokeWidth={2.5} />}
          </button>
        );
      })}
    </div>
  );
}
```

### Step 2: TransactionModal 에 asset_id state + AssetChipPicker 통합

Open `features/expense/components/TransactionModal.tsx`. Add to imports:
```tsx
import { AssetChipPicker } from "./transaction-extras/AssetChipPicker";
import type { AssetRow } from "../server/asset-queries";
```

Extend Props (`CreateProps` 와 `EditProps` 둘 다):
```tsx
type CreateProps = {
  // ... 기존
  assets?: AssetRow[];
};
type EditProps = {
  // ... 기존
  assets?: AssetRow[];
};
```

Inside `TransactionModal` (after `usedCategories` 분해):
```tsx
const { open, onOpenChange, usedCategories = [], assets = [] } = props;
```

Add state for `asset_id` (after `memo` state):
```tsx
const [assetId, setAssetId] = useState<string | null>(
  (initial as any)?.asset_id ?? null,
);
```

Update `handleSubmit` payload — add `asset_id: assetId`:

For income payload:
```tsx
const payload = {
  amount: amt,
  category: category.trim(),
  received_at: dateIso,
  memo: memo.trim() || null,
  asset_id: assetId,
};
```

For expense payload:
```tsx
const payload = {
  amount: amt,
  category: category.trim(),
  paid_at: dateIso,
  memo: memo.trim() || null,
  asset_id: assetId,
};
```

Add AssetChipPicker in the form body (after 카테고리 section, before submit footer):

Find category chips section ("자유 카테고리" 또는 "카테고리" label). After that section, add:

```tsx
{assets.length > 0 && (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">자산</Label>
    <AssetChipPicker
      assets={assets}
      value={assetId}
      onChange={setAssetId}
      kind={type}
    />
  </div>
)}
```

Update `handleNaturalInputChange` to also set asset_id from parser (Task 15 에서 parser 가 asset 매칭) — Task 15 끝나면 parser 가 `asset_id` 반환. 이 task 에선 단순히 채울 자리만 만들기:
```tsx
const handleNaturalInputChange = (v: string) => {
  setNaturalInput(v);
  if (!v.trim()) return;
  const parsed = type === "income" ? parseIncome(v) : parseExpense(v);
  if (parsed.amount !== null) setAmount(String(parsed.amount));
  if (parsed.category !== null) setCategory(parsed.category);
  if (parsed.memo !== null) setMemo(parsed.memo);
  // asset_id 는 Task 15 의 파서 확장 후 자동 채워짐
  if ((parsed as any).asset_id) setAssetId((parsed as any).asset_id);
};
```

### Step 3: ExpensePage 에서 TransactionModal 에 assets prop 전달

Find where TransactionModal is rendered in `features/expense/components/ExpensePage.tsx` (또는 `ExpenseMonthGrid.tsx` 등). Add `assets={assets}` prop.

Search:
```bash
cd /c/dev/lunabear-calendar && grep -rn "TransactionModal" features/expense --include="*.tsx" -l
```

각 호출 위치에 `assets` prop 추가. ExpensePage 가 자식 컴포넌트에 assets prop 전달.

가장 흔한 곳: `ExpenseMonthGrid.tsx`, `DayDetailPopup.tsx` 등. 각 컴포넌트의 Props 에 `assets: AssetRow[]` 추가하고 부모로부터 받아 그대로 전달.

### Step 4: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 5: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/components/transaction-extras/AssetChipPicker.tsx features/expense/components/TransactionModal.tsx features/expense/components/ExpensePage.tsx features/expense/components/ExpenseMonthGrid.tsx features/expense/components/DayDetailPopup.tsx
git commit -m "$(cat <<'EOF'
feat(expense): AssetChipPicker + TransactionModal asset_id 통합

- 자산 색칩 가로 스크롤 (미지정 포함)
- 수입 탭에선 체크/신용카드 비활성화
- ExpensePage → TransactionModal 까지 assets prop 전달

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: QuickAmountChips + CalculatorPopover + MemoAutocomplete

**Files:**
- Create: `features/expense/components/transaction-extras/QuickAmountChips.tsx`
- Create: `features/expense/components/transaction-extras/CalculatorPopover.tsx`
- Create: `features/expense/components/transaction-extras/MemoAutocomplete.tsx`
- Modify: `features/expense/components/TransactionModal.tsx`
- Modify: `app/(app)/expense/page.tsx` — getRecentMemos 추가

### Step 1: QuickAmountChips 작성

Create `features/expense/components/transaction-extras/QuickAmountChips.tsx`:

```tsx
// features/expense/components/transaction-extras/QuickAmountChips.tsx
"use client";

const QUICK_AMOUNTS = [1000, 5000, 10000, 30000, 50000];

type Props = {
  onPick: (amount: number) => void;
};

export function QuickAmountChips({ onPick }: Props) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {QUICK_AMOUNTS.map((amt) => (
        <button
          key={amt}
          type="button"
          onClick={() => onPick(amt)}
          className="px-2.5 py-1 text-xs rounded-full border border-border/60 hover:bg-muted/40 active:scale-95 transition-all"
        >
          ₩{amt.toLocaleString("ko-KR")}
        </button>
      ))}
    </div>
  );
}
```

### Step 2: CalculatorPopover 작성

Create `features/expense/components/transaction-extras/CalculatorPopover.tsx`:

```tsx
// features/expense/components/transaction-extras/CalculatorPopover.tsx
"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Props = {
  onResult: (n: number) => void;
};

const KEYS: Array<{ label: string; value: string; col?: number }> = [
  { label: "C", value: "C" }, { label: "÷", value: "/" }, { label: "×", value: "*" }, { label: "←", value: "BS" },
  { label: "7", value: "7" }, { label: "8", value: "8" }, { label: "9", value: "9" }, { label: "−", value: "-" },
  { label: "4", value: "4" }, { label: "5", value: "5" }, { label: "6", value: "6" }, { label: "+", value: "+" },
  { label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }, { label: "=", value: "=" },
  { label: "0", value: "0", col: 2 }, { label: "00", value: "00" }, { label: "↵", value: "OK" },
];

function evalSafe(expr: string): number | null {
  // 숫자, +-*/ 만 허용 — 그 외 문자 있으면 reject
  if (!/^[\d+\-*/.\s]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const v = new Function(`return (${expr})`)();
    if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
    return null;
  } catch {
    return null;
  }
}

export function CalculatorPopover({ onResult }: Props) {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState("");

  const handleKey = (v: string) => {
    if (v === "C") {
      setExpr("");
      return;
    }
    if (v === "BS") {
      setExpr((s) => s.slice(0, -1));
      return;
    }
    if (v === "=") {
      const result = evalSafe(expr);
      if (result !== null) setExpr(String(result));
      return;
    }
    if (v === "OK") {
      const result = evalSafe(expr) ?? parseFloat(expr);
      if (Number.isFinite(result)) {
        onResult(Math.round(result));
        setOpen(false);
        setExpr("");
      }
      return;
    }
    setExpr((s) => s + v);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-2 rounded-md border border-border/60 hover:bg-muted/40 active:scale-95 transition-transform"
          aria-label="계산기"
        >
          <Calculator size={16} strokeWidth={1.8} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="mb-2 h-10 px-3 flex items-center justify-end text-base font-medium rounded bg-muted/40 tabular-nums overflow-hidden">
          {expr || "0"}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {KEYS.map((k) => (
            <button
              key={k.label}
              type="button"
              onClick={() => handleKey(k.value)}
              className={`h-9 text-sm rounded border border-border/40 hover:bg-muted/40 active:scale-95 transition-transform ${
                k.col === 2 ? "col-span-2" : ""
              } ${
                k.value === "OK"
                  ? "bg-primary text-primary-foreground border-primary"
                  : ""
              } ${
                k.value === "C" ? "text-destructive" : ""
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Step 3: MemoAutocomplete 작성

Create `features/expense/components/transaction-extras/MemoAutocomplete.tsx`:

```tsx
// features/expense/components/transaction-extras/MemoAutocomplete.tsx
"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (v: string) => void;
  recentMemos: string[];
  placeholder?: string;
  id?: string;
};

export function MemoAutocomplete({
  value,
  onChange,
  recentMemos,
  placeholder,
  id,
}: Props) {
  const generated = useId();
  const listId = `memo-list-${id ?? generated}`;
  return (
    <>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
      />
      <datalist id={listId}>
        {recentMemos.slice(0, 30).map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </>
  );
}
```

### Step 4: TransactionModal 통합 — 금액 input 옆 계산기 + 빠른 금액 칩 + memo autocomplete

Open `features/expense/components/TransactionModal.tsx`. Add imports:
```tsx
import { QuickAmountChips } from "./transaction-extras/QuickAmountChips";
import { CalculatorPopover } from "./transaction-extras/CalculatorPopover";
import { MemoAutocomplete } from "./transaction-extras/MemoAutocomplete";
```

Add `recentMemos?: string[]` to both `CreateProps` and `EditProps`:
```tsx
type CreateProps = {
  // ...
  assets?: AssetRow[];
  recentMemos?: string[];
};
type EditProps = {
  // ...
  assets?: AssetRow[];
  recentMemos?: string[];
};
```

Destructure:
```tsx
const { open, onOpenChange, usedCategories = [], assets = [], recentMemos = [] } = props;
```

금액 Input section 찾기. 그 옆에 CalculatorPopover, 아래에 QuickAmountChips 추가:

기존:
```tsx
<Input
  id="amount"
  inputMode="numeric"
  value={formatThousands(amount)}
  onChange={(e) => setAmount(e.target.value)}
  placeholder="0"
/>
```

변경:
```tsx
<div className="space-y-1.5">
  <div className="flex items-center gap-2">
    <Input
      id="amount"
      inputMode="numeric"
      value={formatThousands(amount)}
      onChange={(e) => setAmount(e.target.value)}
      placeholder="0"
      className="flex-1"
    />
    <CalculatorPopover onResult={(n) => setAmount(String(n))} />
  </div>
  <QuickAmountChips onPick={(n) => setAmount(String(n))} />
</div>
```

(기존 amount Input wrap 구조에 맞춰 조정 — `<Label>` 은 유지)

Memo Input 을 MemoAutocomplete 로 교체. 기존:
```tsx
<Input
  id="memo"
  value={memo}
  onChange={(e) => setMemo(e.target.value)}
  placeholder="메모"
/>
```

변경:
```tsx
<MemoAutocomplete
  id="memo"
  value={memo}
  onChange={setMemo}
  recentMemos={recentMemos}
  placeholder="메모"
/>
```

### Step 5: page.tsx 에 getRecentMemos 추가

Open `app/(app)/expense/page.tsx`. Add to import:
```tsx
import {
  getActiveAssets,
  getCreditCardsAwaitingSettlement,
  getRecentMemos,
} from "@/features/expense/server/asset-queries";
```

Add to Promise.all:
```tsx
const [
  // ...
  assets,
  settlementCards,
  recentMemos,
] = await Promise.all([
  // ...
  getActiveAssets(),
  getCreditCardsAwaitingSettlement(),
  getRecentMemos(),
]);
```

Pass to ExpensePage props:
```tsx
<ExpensePage
  // ...
  assets={assets}
  settlementCardIds={settlementCardIds}
  recentMemos={recentMemos}
/>
```

ExpensePage props 에도 `recentMemos: string[]` 추가하고 자식 컴포넌트들 (특히 TransactionModal 호출 위치) 까지 prop drilling.

### Step 6: 타입체크

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

### Step 7: Commit

```bash
cd /c/dev/lunabear-calendar
git add features/expense/components/transaction-extras/ features/expense/components/TransactionModal.tsx features/expense/components/ExpensePage.tsx app/(app)/expense/page.tsx
git commit -m "$(cat <<'EOF'
feat(expense): TransactionModal 입력 ergonomics — 빠른금액 + 계산기 + 메모자동완성

- QuickAmountChips: 1k/5k/10k/30k/50k 칩
- CalculatorPopover: + - × ÷ + = (Function 평가 safe)
- MemoAutocomplete: datalist 로 최근 60일 memo

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Natural Parser 자산 키워드 확장

**Files:**
- Modify: `lib/expense-parser.ts`
- Modify: `lib/income-parser.ts`
- Modify: `lib/expense-parser.test.ts`
- Modify: `lib/income-parser.test.ts`

### Step 1: ParsedExpense 에 asset_id 추가 + parseExpense 시그니처 확장

Open `lib/expense-parser.ts`. Replace:

```typescript
// lib/expense-parser.ts
import {
  EXPENSE_CATEGORY_PRESETS,
  type ExpenseCategoryPreset,
} from "./colors";

export type ParsedExpense = {
  amount: number | null;
  category: ExpenseCategoryPreset | null;
  memo: string | null;
  asset_id: string | null;
};

/** 자산 후보 — parseExpense 가 받아서 이름 substring match. */
export type AssetCandidate = {
  id: string;
  name: string;
};

const CATEGORY_KEYWORDS: Record<ExpenseCategoryPreset, string[]> = {
  식비: [
    "식비", "밥", "점심", "저녁", "아침", "커피", "카페", "음식", "식당",
    "배달", "야식", "간식", "음료", "술", "맥주", "와인", "디저트",
    "스타벅스", "빵",
  ],
  교통: [
    "교통", "지하철", "버스", "택시", "기차", "주유", "톨게이트", "주차",
    "ktx", "srt", "고속버스", "taxi",
  ],
  쇼핑: [
    "쇼핑", "옷", "가방", "신발", "화장품", "책", "마트", "편의점",
    "아마존", "쿠팡", "이마트", "홈플", "코스트코",
  ],
  구독: [
    "구독", "넷플릭스", "유튜브", "디즈니", "스포티파이", "멜론", "왓챠",
    "티빙", "웨이브", "노션", "클로드", "챗gpt", "인스타", "프라임",
    "netflix", "spotify", "youtube",
  ],
  경조사: [
    "경조사", "결혼", "결혼식", "부조", "부조금", "축의금", "조의금",
    "부의금", "돌잔치", "환갑", "장례", "장례식", "축의", "조의",
  ],
  기타: [],
};

function tryParseAmount(token: string): number | null {
  const cleaned = token.replace(/,/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function matchCategory(token: string): ExpenseCategoryPreset | null {
  const lower = token.toLowerCase();
  for (const cat of EXPENSE_CATEGORY_PRESETS) {
    if (cat === "기타") continue;
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      if (lower.includes(kw)) return cat;
    }
  }
  return null;
}

/**
 * 입력 텍스트에서 자산 이름 substring 매칭.
 * 긴 이름 우선 (예: "신한체크" 가 "신한" 보다 먼저 매칭).
 */
function matchAsset(
  input: string,
  candidates: AssetCandidate[],
): string | null {
  if (candidates.length === 0) return null;
  const lower = input.toLowerCase();
  const sorted = [...candidates].sort((a, b) => b.name.length - a.name.length);
  for (const c of sorted) {
    if (c.name.length === 0) continue;
    if (lower.includes(c.name.toLowerCase())) return c.id;
  }
  return null;
}

export function parseExpense(
  input: string,
  assetCandidates: AssetCandidate[] = [],
): ParsedExpense {
  const trimmed = input.trim();
  if (!trimmed) {
    return { amount: null, category: null, memo: null, asset_id: null };
  }

  const tokens = trimmed.split(/\s+/);
  let amount: number | null = null;
  let category: ExpenseCategoryPreset | null = null;
  const memoTokens: string[] = [];

  for (const token of tokens) {
    const num = tryParseAmount(token);
    if (num !== null) {
      if (amount === null || num > amount) amount = num;
      continue;
    }
    if (category === null) {
      const matched = matchCategory(token);
      if (matched) category = matched;
    }
    memoTokens.push(token);
  }

  const asset_id = matchAsset(trimmed, assetCandidates);

  return {
    amount,
    category,
    memo: memoTokens.length > 0 ? memoTokens.join(" ") : null,
    asset_id,
  };
}
```

### Step 2: income-parser.ts 도 동일 패턴 적용

Open `lib/income-parser.ts`. Same approach — `ParsedIncome` 에 `asset_id` 추가, `parseIncome(input, assetCandidates = [])` 시그니처 확장, `matchAsset` 같은 헬퍼 추가 (income-parser 안에 그대로 복사 — 두 파일 별도 유지).

(또는 공통 `matchAsset` 을 별도 `lib/asset-match.ts` 로 추출. 이 plan 에선 두 파일에 각각 두는 게 간단.)

### Step 3: expense-parser.test.ts 에 asset 매칭 테스트 추가

Open `lib/expense-parser.test.ts`. Append:

```typescript
describe("자산 매칭", () => {
  const assets = [
    { id: "ast-cash", name: "현금" },
    { id: "ast-shinhan", name: "신한은행" },
    { id: "ast-shinhan-check", name: "신한체크" },
  ];

  it("이름이 입력에 포함되면 asset_id 매칭", () => {
    const r = parseExpense("스벅 5500 신한체크", assets);
    expect(r.asset_id).toBe("ast-shinhan-check");
  });

  it("긴 이름 우선 — '신한체크' 가 '신한은행' 보다 우선", () => {
    const r = parseExpense("커피 3000 신한체크", assets);
    expect(r.asset_id).toBe("ast-shinhan-check");
  });

  it("자산 후보 없으면 null", () => {
    const r = parseExpense("커피 3000", []);
    expect(r.asset_id).toBeNull();
  });

  it("매칭 안 되면 null", () => {
    const r = parseExpense("커피 3000 카카오뱅크", assets);
    expect(r.asset_id).toBeNull();
  });
});
```

### Step 4: income-parser.test.ts 에 동일 테스트 추가

```typescript
describe("자산 매칭", () => {
  const assets = [
    { id: "ast-shinhan", name: "신한은행" },
    { id: "ast-kb", name: "KB증권" },
  ];

  it("'배당 50000 KB증권' → asset_id KB증권", () => {
    const r = parseIncome("배당 50000 KB증권", assets);
    expect(r.asset_id).toBe("ast-kb");
  });

  it("자산 후보 없으면 null", () => {
    const r = parseIncome("월급 3000000", []);
    expect(r.asset_id).toBeNull();
  });
});
```

### Step 5: TransactionModal 의 handleNaturalInputChange 가 assets 를 파서에 전달

Open `features/expense/components/TransactionModal.tsx`. Update `handleNaturalInputChange`:

```tsx
const assetCandidates = assets.map((a) => ({ id: a.id, name: a.name }));

const handleNaturalInputChange = (v: string) => {
  setNaturalInput(v);
  if (!v.trim()) return;
  const parsed =
    type === "income"
      ? parseIncome(v, assetCandidates)
      : parseExpense(v, assetCandidates);
  if (parsed.amount !== null) setAmount(String(parsed.amount));
  if (parsed.category !== null) setCategory(parsed.category);
  if (parsed.memo !== null) setMemo(parsed.memo);
  if (parsed.asset_id) setAssetId(parsed.asset_id);
};
```

### Step 6: 타입체크 + 테스트 실행

```bash
cd /c/dev/lunabear-calendar
pnpm tsc --noEmit
pnpm vitest run lib/expense-parser.test.ts lib/income-parser.test.ts
```
Expected: tsc 0, all tests pass

### Step 7: Commit

```bash
cd /c/dev/lunabear-calendar
git add lib/expense-parser.ts lib/income-parser.ts lib/expense-parser.test.ts lib/income-parser.test.ts features/expense/components/TransactionModal.tsx
git commit -m "$(cat <<'EOF'
feat(parser): 자연어 파서에 자산 키워드 매칭 — substring + 긴 이름 우선

- parseExpense / parseIncome 에 assetCandidates 인자
- ParsedExpense / ParsedIncome 에 asset_id 추가
- TransactionModal 의 자연어 입력이 자산까지 자동 매칭

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: PWA Manifest + ?action= URL 핸들러

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/shortcut-expense.png` (placeholder — 추후 디자인)
- Create: `public/icons/shortcut-income.png` (placeholder)
- Modify: `app/layout.tsx` — manifest link 메타 (또는 metadata.manifest)
- Modify: `features/expense/components/ExpensePage.tsx` — `?action=` 핸들러
- Modify: `app/(app)/expense/page.tsx` — searchParams.action 받아 전달

### Step 1: manifest.json 작성

Create `public/manifest.json`:

```json
{
  "name": "루나곰 캘린더",
  "short_name": "루나곰",
  "description": "내 일정, 내 돈, 내 사람들 — 한 화면에서.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0A",
  "theme_color": "#5B6CFF",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "지출 추가",
      "short_name": "지출",
      "description": "빠르게 지출 기록",
      "url": "/expense?action=add-expense",
      "icons": [
        { "src": "/icons/shortcut-expense.png", "sizes": "96x96" }
      ]
    },
    {
      "name": "수입 추가",
      "short_name": "수입",
      "description": "빠르게 수입 기록",
      "url": "/expense?action=add-income",
      "icons": [
        { "src": "/icons/shortcut-income.png", "sizes": "96x96" }
      ]
    }
  ]
}
```

**Note**: 아이콘 파일 (`/icons/shortcut-expense.png`, `/icons/shortcut-income.png`, `/icon-192.png`, `/icon-512.png`) 은 사용자가 디자인 후 별도 추가. 이 plan 에선 manifest 만 등록 — 아이콘 누락 시 PWA 가 placeholder fallback.

### Step 2: app/layout.tsx 에 manifest 메타 추가

Open `app/layout.tsx`. Find `export const metadata: Metadata = { ... }`. Add `manifest: "/manifest.json"`:

```typescript
export const metadata: Metadata = {
  // ... 기존 필드
  manifest: "/manifest.json",
};
```

(이미 있으면 skip)

### Step 3: page.tsx 에서 searchParams.action 받아 ExpensePage 에 전달

Open `app/(app)/expense/page.tsx`. searchParams 타입 확장 (이미 Task 11 에서 `action?: string` 추가 됨).

Pass to ExpensePage:
```tsx
<ExpensePage
  // ...
  initialAction={searchParams.action}
/>
```

### Step 4: ExpensePage 에서 initialAction 처리

Open `features/expense/components/ExpensePage.tsx`. Add to Props:
```tsx
type Props = {
  // ...
  initialAction?: string;
};
```

Inside component, add `useEffect` to open TransactionModal based on action:

먼저 ExpensePage 가 TransactionModal 을 직접 열지 않을 수 있음 — `ExpenseMonthGrid` 가 가질 수 있음. 그 경우 prop drilling.

가장 간단: ExpensePage 안에 transactionModalOpen state + initialType state 추가.

Implementation:
```tsx
import { useEffect, useState } from "react";
import { TransactionModal } from "./TransactionModal";

// inside component:
const [quickModalOpen, setQuickModalOpen] = useState(false);
const [quickModalType, setQuickModalType] = useState<"expense" | "income">("expense");

useEffect(() => {
  if (initialAction === "add-expense") {
    setQuickModalType("expense");
    setQuickModalOpen(true);
  } else if (initialAction === "add-income") {
    setQuickModalType("income");
    setQuickModalOpen(true);
  }
}, [initialAction]);

// render:
<TransactionModal
  mode="create"
  open={quickModalOpen}
  onOpenChange={setQuickModalOpen}
  defaultType={quickModalType}
  usedCategories={usedCategories}
  assets={assets}
  recentMemos={recentMemos}
/>
```

### Step 5: 타입체크 + 페이지 probe

```bash
cd /c/dev/lunabear-calendar
pnpm tsc --noEmit
```
Expected: Exit 0

Probe (dev 서버 떠 있다고 가정):
```bash
curl -s -o /dev/null -w "/expense?action=add-expense: %{http_code}\n" "http://localhost:3000/expense?action=add-expense"
curl -s -o /dev/null -w "/manifest.json: %{http_code}\n" "http://localhost:3000/manifest.json"
```
Expected: 200 or 307 for expense, 200 for manifest

### Step 6: Commit

```bash
cd /c/dev/lunabear-calendar
git add public/manifest.json app/layout.tsx features/expense/components/ExpensePage.tsx app/(app)/expense/page.tsx
git commit -m "$(cat <<'EOF'
feat(pwa): manifest.json + shortcuts (지출/수입 빠른 추가) + ?action= 핸들러

- PWA 설치 시 홈 아이콘 길게 누르면 지출/수입 shortcut
- ExpensePage 가 ?action=add-expense / add-income 으로 자동 모달 오픈

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: 최종 회귀 + Push

### Step 1: 전체 타입체크 + 린트 + 테스트

```bash
cd /c/dev/lunabear-calendar
pnpm tsc --noEmit
pnpm lint
pnpm vitest run
```
Expected: 모두 0, 모든 테스트 PASS

### Step 2: 시각 회귀 (Playwright MCP 사용 또는 수동)

**기본 시나리오:**
1. `/expense` 진입 → 5탭 보이는지 (월간 / 자산 / 정기 결제 / 정기 수입 / 예산)
2. "자산" 탭 → 총자산 카드 + 그룹들 (현금 그룹에 "현금" 1개)
3. "+ 자산 추가" → 5종 모두 추가:
   - 현금 (현금 50000)
   - 은행 (신한은행 600000)
   - 체크카드 (신한체크 → 신한은행 연결)
   - 신용카드 (우리카드 결제일 15일, 현재 누적 0)
   - 저축/투자 (KOSPI ETF 2000000)
4. 자산 카드 클릭 → 상세 페이지 (잔액 보정 + 거래 내역 — 처음엔 비어 있음)
5. 월간 탭 → 지출 추가 모달:
   - 빠른 금액 칩 5개 보임
   - 계산기 버튼 → 1000+500= → 1500 input 채워짐
   - memo 타이핑 → 자동완성 datalist
   - 자산 색칩 가로 스크롤 → 신한은행 선택 → 저장
6. 자산 탭 → 신한은행 잔액 -금액 확인
7. 체크카드 지출 등록 → 신한은행에서 차감되는지 확인
8. 신용카드 지출 등록 → 우리카드 누적되는지 확인
9. 신용카드 결제일 도래 시 정산 버튼 표시 → 정산 다이얼로그 → 정산
10. 자연어 입력 "스벅 5500 신한체크" → asset_id 자동 매칭
11. PWA shortcuts: 모바일 폰에서 PWA 설치 후 아이콘 길게 누름 → "지출 추가" → 자동 모달 (또는 `?action=add-expense` URL 직접 진입)
12. 다크모드 확인 — 모든 신규 컴포넌트 다크모드 정상

### Step 3: Push

```bash
cd /c/dev/lunabear-calendar
git push origin main
```

---

## Self-Review

**1. Spec coverage:**
- ✅ `assets` 테이블 + RLS → Task 1
- ✅ 5종 자산 타입 → Task 2 (메타) + Task 7 (UI)
- ✅ 자산 CRUD UI → Task 7, 8, 9, 11
- ✅ TransactionModal asset 선택 → Task 13
- ✅ 체크카드 자동 차감 (서버 액션) → Task 4 (applyAssetDelta) + Task 5 (통합)
- ✅ 신용카드 누적 + 결제일 수동 정산 → Task 6 (settleCreditCard) + Task 10 (버튼)
- ✅ 자산별 거래 필터 → Task 3 (getTransactionsForAsset) + Task 12 (AssetDetailView)
- ✅ "현금" 자산 자동 생성 (기존 + 신규) → Task 1
- ✅ 빠른 금액 + 계산기 + memo 자동완성 → Task 14
- ✅ 자산 색칩 → Task 13
- ✅ 자연어 파서 자산 키워드 → Task 15
- ✅ PWA shortcuts → Task 16
- ✅ 회귀/배포 → Task 17

**2. Placeholder scan:** 모든 step 에 실제 코드 있음. PWA 아이콘은 placeholder — 사용자 디자인 작업으로 별도 진행.

**3. Type consistency:**
- `AssetType` union (Task 2) 이 모든 후속 task 에서 동일 (cash / bank / debit_card / credit_card / savings_investment)
- `AssetRow` type (Task 3) 이 Task 7~12 의 컴포넌트 props 에서 동일 사용
- `applyAssetDelta(assetId, amount, kind)` 시그니처 (Task 4) — Task 5 / Task 6 호출 일관
- `ParsedExpense.asset_id` (Task 15) — TransactionModal (Task 13/14) state 와 일관
- `searchParams.action` (Task 16) — Task 11 의 page.tsx 와 일관

**4. 의존성 순서:**
- Task 1 (DB/types) — 모든 후속의 기반
- Task 2 (메타) — Task 3, 7, 8, 9, 13 에서 사용
- Task 3 (queries) — Task 11 (page.tsx) 에서 사용
- Task 4 (balance helper) — Task 5, 6 에서 사용
- Task 5 (expense/income 통합) — Task 4 에 의존
- Task 6 (asset-actions) — Task 4 에 의존
- Task 7-10 (UI 컴포넌트) — Task 2, 3, 6 에 의존
- Task 11 (AssetsTab + ExpensePage) — Task 7-10 모두 통합
- Task 12 (Detail) — Task 11 에서 호출 (AssetsTab 안)
- Task 13 (ChipPicker) — Task 3 에 의존
- Task 14 (Quick + Calc + Memo) — 독립적, 단 page.tsx 수정 같이
- Task 15 (parser) — Task 13 의 modal 과 통합
- Task 16 (PWA) — Task 11 의 page.tsx 확장
- Task 17 — 최종

권장 실행 순서: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17

**5. Risk notes for implementer:**
- Task 1 의 SQL 은 사용자가 prod + dev Supabase 콘솔에 수동 적용해야 함 — code-only PR 로 끝나지 않음
- Task 5 의 update 로직: 기존 amount/asset_id 가 partial 인 경우 prev 값으로 fallback (코드에 처리됨)
- Task 6 의 settleCreditCard 는 applyAssetDelta 우회 — 이미 직접 차감했기 때문 (이중 차감 방지)
- Task 11 의 ExpensePage 수정 시 기존 Tabs grid-cols-4 → grid-cols-5 빠짐 없이 변경
- Task 13 의 prop drilling: ExpensePage → ExpenseMonthGrid → DayDetailPopup → TransactionModal 흐름 따라 assets 전달
- Task 14 의 CalculatorPopover Function 평가 — `^[\d+\-*/.\s]+$` 정규식으로 입력 sanitize 됨 (XSS 안전)

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-29-expense-phase1-assets.md`.

분량 추정: 약 17.5h. 17개 task (16 구현 + 1 회귀/push).

다음 단계: subagent-driven-development 스킬로 task 별 fresh subagent dispatch + spec compliance / code quality 2단계 리뷰 실행. 첫 task 는 사용자가 prod + dev Supabase SQL Editor 에 수동 적용 필요 — 그 후 자동 진행.

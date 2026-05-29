# 가계부 Phase 1 — 자산 관리 + 거래 연동 + 미니멈 자족 보완 설계 문서

작성일: 2026-05-29
대상 영역: `/expense` (가계부) 페이지 전반, DB 5 테이블, TransactionModal, 자연어 파서, PWA manifest

---

## 1. 목적

현재 가계부는 "지출 + 수입" 만 추적할 뿐 **어느 통장/카드에서 나갔는지** 추적 안 됨. 사용자가 다음 시나리오를 하고 싶음:

- "이번 달 신한은행 잔액은 얼마인가?"
- "신용카드 누적 사용액이 결제일 전에 얼마인가?"
- "체크카드 사용 시 연결된 은행에서 자동 차감"
- "특정 자산만 필터링해서 거래 내역 보기"

**제약**: 외부 API 연동 없음 (마이데이터 / SMS / 카드사 API 모두 X). 사용자가 직접 입력하는 방식만. 따라서 **수동 입력 부담을 최소화하는 UX 보완**도 함께 진행.

부부 가계부 공유(partnerships)와 정합 — **단, 자산 자체는 개인 영역** (각자의 통장은 각자). 거래는 기존처럼 부부 공유.

---

## 2. Phase 1 범위 (Scope)

### In Scope (이번 작업)
- `assets` 테이블 신규 + RLS
- 5종 자산 타입: 현금 / 은행 / 체크카드 / 신용카드 / 저축·투자
- 자산 CRUD UI (신규 탭 "자산")
- 기존 `expenses` / `incomes` / `subscriptions` / `recurring_incomes` 에 `asset_id` 컬럼 추가
- TransactionModal 에 "자산 선택" 필드
- 체크카드 → 연결된 은행 자동 차감 (서버 액션)
- 신용카드 누적 + 결제일 수동 정산 UI
- 자산별 거래 내역 필터
- 마이그레이션: 가입 시 "현금" 자산 자동 생성, 기존 거래는 NULL 유지

### 미니멈 자족 보완 (Phase 1 안에 묶기)
- ① **계산기 + 빠른 금액 칩 + 가게/메모 자동완성 + 자산 색칩** (TransactionModal 입력 부담 최소화)
- ② **자연어 파서에 자산 키워드 추가** (`parseExpense` / `parseIncome` 확장)
- ⑥ **PWA shortcuts** (홈 아이콘 길게 누르면 "지출 추가" 바로가기)

### Out of Scope (다음 Phase)
- 월간 통계 강화 (도넛 차트, TOP5, 일별 막대) → Phase 2
- 투자 관리 (asset_snapshots, 평가액 그래프) → Phase 3
- 캘린더 일정 ↔ 자산 연동 → Phase 4
- 영수증 사진 / CSV 가져오기 / 음성 입력 → v2 보류

---

## 3. 합의 결정 사항

| 결정 | 선택 |
|---|---|
| 자산 진입점 | **가계부 페이지 새 탭 "자산"** (현재 4탭 → 5탭) |
| 신용카드 정산 방식 | **수동** — 결제일에 사용자가 "정산" 버튼 클릭 |
| 체크카드 → 은행 자동 차감 | **서버 액션** (DB 트리거 X) |
| 자산 잔액 운영 | **하이브리드** — 초기 수동 입력 + 거래마다 자동 +/- + 언제든 수동 보정 |
| 자산 부부 공유 | **개인만** (partner_id 없음) — 거래는 기존처럼 부부 공유 |
| 기존 거래 asset_id 처리 | **"현금" 자산 자동 생성 + 기존 거래 NULL 유지** (사용자가 천천히 채움) |
| 차트 라이브러리 (Phase 2 용) | recharts (이번 Phase 에선 안 씀) |

---

## 4. 데이터 모델

### 4.1 새 마이그레이션 파일

**`supabase/migrations/20260529150000_assets.sql`**

```sql
-- ============================================================================
-- 자산 관리 — assets 테이블 + 기존 거래 테이블에 asset_id + RLS
-- ============================================================================

-- ─── assets (자산) ─────────────────────────────────────────────────────────
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 30),
  type text not null check (type in (
    'cash', 'bank', 'debit_card', 'credit_card', 'savings_investment'
  )),
  -- 현재 잔액 (체크카드는 NULL, 연결 은행에서 가져옴 / 신용카드는 이번 결제일까지 누적)
  balance integer not null default 0,
  -- 체크카드 → 연결된 은행 계좌 (bank 타입 asset 만 가리킴)
  linked_asset_id uuid references public.assets(id) on delete set null,
  -- 신용카드 결제일 (1-31)
  payment_day smallint check (payment_day between 1 and 31),
  -- 색 (시각 구분, 6자 hex)
  color text not null default '#5B6CFF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- 정렬 (사용자 임의 순서)
  sort_order integer not null default 0,
  -- 보관 (false 면 active)
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assets_user_idx on public.assets (user_id, is_archived, sort_order);

-- ─── 기존 거래 테이블에 asset_id (nullable) ───────────────────────────────
alter table public.expenses add column if not exists asset_id uuid references public.assets(id) on delete set null;
alter table public.incomes add column if not exists asset_id uuid references public.assets(id) on delete set null;
alter table public.subscriptions add column if not exists asset_id uuid references public.assets(id) on delete set null;
alter table public.recurring_incomes add column if not exists asset_id uuid references public.assets(id) on delete set null;
create index if not exists expenses_asset_idx on public.expenses (asset_id) where asset_id is not null;
create index if not exists incomes_asset_idx on public.incomes (asset_id) where asset_id is not null;

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.assets enable row level security;

-- 자기 자산만 select
create policy assets_select_own
  on public.assets for select
  using (user_id = auth.uid());

-- 자기 자산만 insert
create policy assets_insert_own
  on public.assets for insert
  with check (user_id = auth.uid());

-- 자기 자산만 update
create policy assets_update_own
  on public.assets for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 자기 자산만 delete
create policy assets_delete_own
  on public.assets for delete
  using (user_id = auth.uid());

-- ─── 마이그레이션: 기존 사용자에게 "현금" 자산 1개 자동 생성 ────────────────
insert into public.assets (user_id, name, type, balance, color, sort_order)
select id, '현금', 'cash', 0, '#9CA3AF', 0
from auth.users
on conflict do nothing;

-- ─── 신규 가입 시 "현금" 자산 자동 생성 트리거 ─────────────────────────────
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

### 4.2 자산 타입별 시맨틱

| type | name 예 | balance 의미 | linked_asset_id | payment_day |
|---|---|---|---|---|
| `cash` | 현금 | 보유 현금 | NULL | NULL |
| `bank` | 신한은행 | 통장 잔액 | NULL | NULL |
| `debit_card` | 신한체크 | NULL (조회 시 linked bank balance) | 은행 자산 id (필수) | NULL |
| `credit_card` | 신한카드 | **이번 결제일까지 누적 사용액** (+= 사용 시) | 은행 자산 id (선택 — 결제일에 자동 차감) | 1-31 (필수) |
| `savings_investment` | KOSPI ETF | 평가액 (Phase 3 에서 asset_snapshots 연동) | NULL | NULL |

### 4.3 잔액 자동 업데이트 규칙

기존 거래(expense/income) 생성/수정/삭제 시 서버 액션에서 `asset_id` 가 있으면 자동으로:

- **지출** (expense) 발생 → 자산 종류에 따라:
  - `cash` / `bank` → balance 차감
  - `debit_card` → 연결된 `bank` 의 balance 차감 (체크카드 자체 balance 는 변동 없음, NULL 유지)
  - `credit_card` → balance 누적 (+= 금액)
  - `savings_investment` → balance 차감 (출금)
- **수입** (income) 발생 → 자산 종류에 따라:
  - `cash` / `bank` / `savings_investment` → balance 증가
  - `debit_card` / `credit_card` → 수입은 카드 자산에 입력 불가능 (UI 에서 차단)
- **거래 수정**: 기존 asset_id 의 잔액 원복 + 신규 asset_id 에 적용
- **거래 삭제**: asset_id 의 잔액 원복

수동 보정: 자산 편집 모달에서 "현재 잔액" 입력 시 그대로 덮어쓰기 (실제와 sync).

### 4.4 신용카드 정산 흐름

```
[ 사용자 신용카드 사용 ]
   │
   ├─ 지출 등록 (asset_id = 신한카드)
   │   └─ 신한카드.balance += 금액 (이번 결제일까지 누적)
   │
   ▼
[ 결제일 도래 ]
   │
   ├─ 자산 탭에서 신한카드 카드 우상단 "정산" 버튼 표시
   │   (오늘 >= payment_day 이고 balance > 0 일 때)
   │
   ▼
[ 사용자 "정산" 버튼 클릭 ]
   │
   ├─ 다이얼로그: "이번 달 N원을 [연결 은행]에서 차감합니다. 확인?"
   │   └─ linked_asset_id 가 NULL 이면 → "어느 은행에서 차감?" 선택
   │
   ▼
[ 서버 액션: settleCreditCard(creditCardId, fromBankAssetId, amount) ]
   ├─ from bank.balance -= amount
   ├─ creditCard.balance = 0
   └─ expenses 테이블에 "신한카드 결제" 한 줄 자동 생성 (카테고리: "카드결제", asset_id = bank, memo: "신한카드 N월 정산")
       → 이렇게 하면 가계부 흐름 추적 가능
```

---

## 5. UI 설계

### 5.1 가계부 페이지 탭 변경

**현재**: `월간` `정기 결제` `정기 수입` `예산` (4탭)
**신규**: `월간` `자산` `정기 결제` `정기 수입` `예산` (5탭, **자산을 2번째**로 — 자주 보기 때문)

### 5.2 "자산" 탭 화면

```
┌─────────────────────────────────────────────────┐
│ 총 자산: ₩1,234,500   (순자산 — 신용카드 누적 제외) │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ 현금     │ │ 은행     │ │ 체크/신용 │  타입별 카드 │
│ │ ₩50,000  │ │ ₩900,000 │ │ -₩45,000 │         │
│ └──────────┘ └──────────┘ └──────────┘         │
│                                                 │
│ ┌─ 현금 ─────────────────── ₩50,000 ─┐         │
│ │ • 현금                      ₩50,000 │ ← 색 도트 + 클릭 → 상세 │
│ └─────────────────────────────────────┘         │
│                                                 │
│ ┌─ 은행 ─────────────────── ₩900,000 ─┐         │
│ │ • 신한은행                  ₩600,000 │         │
│ │ • 우리은행                  ₩300,000 │         │
│ └─────────────────────────────────────┘         │
│                                                 │
│ ┌─ 체크카드 ──────────────────────── ─┐         │
│ │ • 신한체크 → 신한은행                │ ← 연결 표시 │
│ └─────────────────────────────────────┘         │
│                                                 │
│ ┌─ 신용카드 ─────────────── -₩45,000 ─┐         │
│ │ • 우리카드 (15일 결제) [정산] ₩45,000│ ← 정산 버튼 │
│ └─────────────────────────────────────┘         │
│                                                 │
│ ┌─ 저축/투자 ───────────── ₩2,000,000 ─┐        │
│ │ • KOSPI ETF              ₩2,000,000 │         │
│ └─────────────────────────────────────┘         │
│                                                 │
│ [+ 자산 추가]                                    │
└─────────────────────────────────────────────────┘
```

- 헤더에 **총 자산** (= 모든 active 자산의 balance 합. 단 신용카드는 차감)
- 타입별 그룹 (cash / bank / debit_card / credit_card / savings_investment)
- 각 자산 카드 클릭 → **자산 상세 페이지** (그 자산의 거래 내역만 필터)
- 자산 카드 우측 아이콘 더보기 메뉴: 편집 / 보관 / 삭제

### 5.3 자산 추가/편집 모달 (AssetModal)

```
┌─ 자산 추가 ────────────────────┐
│                                │
│ 종류                            │
│ ◯ 현금  ◯ 은행  ◯ 체크카드     │
│ ◯ 신용카드  ◯ 저축/투자        │
│                                │
│ 이름  [____________]            │
│                                │
│ 색  [■][■][■][■][■][■]         │ ← 6 칸 색 칩 선택
│                                │
│ ─ 종류별 조건부 필드 ─          │
│                                │
│ (현금/은행/투자)                │
│ 현재 잔액  [____________원]     │
│                                │
│ (체크카드)                      │
│ 연결 은행  [신한은행 ▼]         │
│                                │
│ (신용카드)                      │
│ 결제일  [15] 일                 │
│ 자동 차감 은행 (선택)            │
│ [신한은행 ▼ / 안 함]            │
│ 현재 누적 [____________원]      │
│                                │
│              [취소]  [저장]     │
└────────────────────────────────┘
```

### 5.4 TransactionModal 에 "자산 선택" 추가

기존 모달의 카테고리 칩 아래에 자산 칩 row 추가:

```
┌─ 지출 추가 ────────────────────┐
│ [지출 ▼] [수입]                │
│ 금액  [_____] 원              │
│ 메모  [_____________________] │
│ 일자  [2026-05-29 14:30]       │
│                                │
│ 카테고리                        │
│ [식비] [교통] [생활] [기타]    │
│                                │
│ 자산                            │ ← 신규
│ ⬤현금 ⬤신한은행 ⬤신한체크    │ ← 색 도트 + 이름 칩
│ ⬤우리카드 ⬤KOSPI ETF          │
│                                │
│              [취소]  [저장]     │
└────────────────────────────────┘
```

- 수입 탭: `debit_card` / `credit_card` 자산 비활성화
- 미선택 시 (NULL) 저장 가능 → "미지정" 으로 표시

### 5.5 자산 상세 페이지

```
┌─────────────────────────────────────────────┐
│ ← 자산 목록                                  │
│                                             │
│ 신한은행                  ₩600,000          │
│ 은행 · 현재 잔액                            │
│ [잔액 보정] [편집]                          │
│                                             │
│ ─ 최근 거래 (이 자산만) ─                   │
│ 5/29  지출 -₩5,500   스벅                  │
│ 5/28  수입 +₩2,500,000  월급               │
│ 5/27  지출 -₩45,000  마트 (신한체크 → 자동) │
│ ...                                         │
└─────────────────────────────────────────────┘
```

- 거래는 expenses + incomes 합쳐서 시간 역순
- 체크카드 사용으로 인한 은행 자동 차감 거래도 "(신한체크 → 자동)" 표시

### 5.6 미니멈 자족 보완 UI

#### ① TransactionModal 입력 부담 줄이기

**(a) 빠른 금액 칩**
금액 input 아래에 자주 쓰는 금액 칩 row:
```
[₩1,000] [₩5,000] [₩10,000] [₩30,000] [₩50,000]
```
탭하면 input 에 채움. 사용자별 최근 30일 평균 금액 기반 (단, v1 은 하드코딩 5개로 시작).

**(b) 계산기 위젯**
금액 input 옆 작은 🔢 버튼. 누르면 간단 계산기 팝오버 (`+ - × ÷` 만). 결과를 input 에 반영. 영수증 합산용.

**(c) 메모 자동완성**
기존 `usedCategories` 패턴 재사용. 새로 `getRecentMemos()` 쿼리 — 최근 60일 distinct memo (지출+수입). memo input 의 datalist 로 제공.

**(d) 자산 색 칩**
위 5.4 그림처럼 자산 dropdown 대신 가로 스크롤 색 도트 + 이름 칩으로 표시.

#### ② 자연어 파서에 자산 키워드 추가

**`lib/expense-parser.ts`** 의 `parseExpense` 확장:
- 입력 예: `"스벅 5500 신한체크"` → `{ amount: 5500, category: "식비", asset_name: "신한체크" }`
- 자산 매칭: 입력 텍스트에서 사용자 자산명 substring match (긴 이름 우선)
- 키워드 사전: `현금`, `통장`, `체크`, `카드` (일반) — 사용자가 명시 안 했을 때 fallback
- 추가 반환 필드: `asset_id: string | null` (이름 매칭되면 해당 asset.id)

**`lib/income-parser.ts`** 도 같은 패턴.

#### ⑥ PWA shortcuts

**`public/manifest.json`** 에 추가:
```json
{
  "shortcuts": [
    {
      "name": "지출 추가",
      "short_name": "지출",
      "description": "빠르게 지출 기록",
      "url": "/expense?action=add-expense",
      "icons": [{ "src": "/icons/shortcut-expense.png", "sizes": "96x96" }]
    },
    {
      "name": "수입 추가",
      "short_name": "수입",
      "description": "빠르게 수입 기록",
      "url": "/expense?action=add-income",
      "icons": [{ "src": "/icons/shortcut-income.png", "sizes": "96x96" }]
    }
  ]
}
```

`/expense?action=add-expense` 진입 시 페이지 로드 후 자동으로 TransactionModal 열기 (defaultType="expense").

---

## 6. 서버 API

### 6.1 신규 쿼리 (`features/expense/server/asset-queries.ts`)

```typescript
export type AssetRow = Database["public"]["Tables"]["assets"]["Row"];

/** 활성 자산 전체. type → sort_order 순. */
export async function getActiveAssets(): Promise<AssetRow[]>;

/** 단일 자산 (보관 포함). */
export async function getAssetById(id: string): Promise<AssetRow | null>;

/** 자산 카드용 — type 별 그룹핑된 결과. */
export async function getAssetsGrouped(): Promise<{
  cash: AssetRow[];
  bank: AssetRow[];
  debit_card: AssetRow[];
  credit_card: AssetRow[];
  savings_investment: AssetRow[];
}>;

/** 자산별 거래 내역 (expense + income 합쳐 시간 역순, 페이지네이션). */
export async function getTransactionsForAsset(
  assetId: string,
  limit: number,
  offset: number,
): Promise<Array<
  | (ExpenseRow & { kind: "expense" })
  | (IncomeRow & { kind: "income" })
>>;

/** 총 자산 = 모든 active 자산 balance 합 (단 credit_card 는 차감). */
export async function getTotalNetWorth(): Promise<number>;

/** 결제일 도래한 신용카드 (balance > 0 and today day >= payment_day). */
export async function getCreditCardsAwaitingSettlement(): Promise<AssetRow[]>;

/** 최근 60일 distinct memo (지출 + 수입). */
export async function getRecentMemos(): Promise<string[]>;
```

### 6.2 신규 서버 액션 (`features/expense/server/asset-actions.ts`)

```typescript
// 자산 CRUD
export async function createAsset(input: {
  name: string;
  type: AssetType;
  balance?: number;
  linked_asset_id?: string | null;
  payment_day?: number | null;
  color?: string;
}): Promise<{ id: string }>;

export async function updateAsset(id: string, input: Partial<...>): Promise<void>;

export async function archiveAsset(id: string): Promise<void>;

export async function deleteAsset(id: string): Promise<void>;
  // 사용 중인 자산 삭제 시: 연결된 거래의 asset_id 는 SET NULL (cascade 안 함)

// 잔액 수동 보정
export async function adjustAssetBalance(id: string, newBalance: number): Promise<void>;

// 신용카드 정산
export async function settleCreditCard(input: {
  credit_card_asset_id: string;
  from_bank_asset_id: string;
  amount: number;  // 사용자가 확인한 정산 금액 (기본은 balance, 부분 정산 가능)
}): Promise<void>;
  // 1) from_bank.balance -= amount
  // 2) credit_card.balance -= amount (전액 정산이면 0, 부분이면 잔여)
  // 3) expenses 에 한 줄 자동 생성 (asset_id = from_bank, category = "카드결제", memo = "{card} N월 정산")
```

### 6.3 기존 서버 액션 수정 (`features/expense/server/actions.ts`)

- `createExpense` / `updateExpense` / `deleteExpense` — `asset_id` 처리 + 잔액 자동 +/- 로직
- `createIncome` / `updateIncome` / `deleteIncome` — 동일
- `createSubscription` / `updateSubscription` — `asset_id` 컬럼만 저장 (잔액 변동은 실제 지출 발생 시에만)
- `createRecurringIncome` / `updateRecurringIncome` — 동일

**잔액 적용 핵심 로직** (`applyAssetDelta` helper):
```typescript
async function applyAssetDelta(
  assetId: string | null,
  delta: number,  // 음수 = 차감, 양수 = 증가
  txn: "expense" | "income",
): Promise<void> {
  if (!assetId) return;
  const asset = await getAssetById(assetId);
  if (!asset) return;

  if (txn === "expense" && asset.type === "debit_card") {
    // 체크카드: 연결된 은행에서 차감
    if (asset.linked_asset_id) {
      await updateBalance(asset.linked_asset_id, delta);
    }
    return;
  }

  if (txn === "expense" && asset.type === "credit_card") {
    // 신용카드: 누적
    await updateBalance(assetId, Math.abs(delta));  // 누적은 + 로
    return;
  }

  // 기타 (cash / bank / savings_investment)
  await updateBalance(assetId, delta);
}
```

---

## 7. 컴포넌트 구조

### 신규 컴포넌트

```
features/expense/components/
  assets/
    AssetsTab.tsx           — 자산 탭 컨테이너 (총자산 헤더 + 그룹들 + 추가 버튼)
    AssetsSummaryHeader.tsx — 상단 총자산 + 타입별 요약 3카드
    AssetGroup.tsx          — 타입별 그룹 (제목 + 카드 리스트)
    AssetCard.tsx           — 자산 1개 카드 (색 도트 + 이름 + 잔액 + 메뉴)
    AssetModal.tsx          — 자산 추가/편집 다이얼로그
    AssetColorPicker.tsx    — 6칸 색 칩 선택
    CreditCardSettleButton.tsx — 정산 버튼 + 확인 다이얼로그
    AssetDetailView.tsx     — 자산 상세 (잔액 + 거래 내역)
    AssetBalanceAdjustDialog.tsx — 잔액 수동 보정 다이얼로그
  
  TransactionModal/
    QuickAmountChips.tsx    — 빠른 금액 칩 row
    CalculatorPopover.tsx   — 간단 계산기 위젯
    AssetChipPicker.tsx     — 자산 색 칩 가로 스크롤 선택기
    MemoAutocomplete.tsx    — memo input with datalist

features/expense/lib/
  asset-types.ts            — AssetType union, ASSET_TYPE_LABELS, ASSET_TYPE_ICONS
  asset-colors.ts           — 6 색 팔레트 (다크/라이트 동일 hex)
```

### 수정할 컴포넌트

| 파일 | 변경 |
|---|---|
| `features/expense/components/ExpensePage.tsx` | 5탭 구조, "자산" 탭 추가 |
| `features/expense/components/TransactionModal.tsx` | 자산 칩 + 빠른 금액 + 계산기 + memo autocomplete 추가 |
| `app/(app)/expense/page.tsx` | `getActiveAssets` 추가, `?action=add-expense` 파싱 |
| `lib/expense-parser.ts` | 자산 키워드 매칭 추가 |
| `lib/income-parser.ts` | 자산 키워드 매칭 추가 |
| `types/database.ts` | `assets` Row/Insert/Update + 기존 4 테이블에 asset_id 추가 |
| `public/manifest.json` | shortcuts 배열 추가 |

### 자산 타입 메타 (`features/expense/lib/asset-types.ts`)

```typescript
export type AssetType =
  | "cash"
  | "bank"
  | "debit_card"
  | "credit_card"
  | "savings_investment";

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

/** 자산 카드의 기본 색 팔레트 (6개) — 다크/라이트 동일. */
export const ASSET_COLOR_PALETTE = [
  "#5B6CFF",  // primary blue
  "#9CA3AF",  // gray (default for 현금)
  "#16A34A",  // green (savings/income tone)
  "#F59E0B",  // amber (bank)
  "#A855F7",  // purple (card)
  "#EC4899",  // pink
];
```

---

## 8. 검증 시나리오

### 마이그레이션
1. prod / dev SQL Editor 에서 `select count(*) from assets where name = '현금'` — 기존 모든 user 수와 같은지
2. `select * from auth.users limit 1` → 그 user_id 의 자산 1개 존재 확인
3. 트리거 동작: 새 회원가입 → 자동으로 "현금" 자산 생김

### 자산 CRUD
1. `/expense` "자산" 탭 → "+ 자산 추가" → 5종 모두 생성
2. 체크카드 생성 시 연결 은행 선택 필수 validation
3. 신용카드 생성 시 결제일 1-31 범위 validation
4. 자산 편집 → 잔액 보정 → 그대로 반영
5. 자산 보관/삭제: 보관은 목록에서 숨김, 삭제는 거래의 asset_id 만 NULL 처리

### 거래 ↔ 자산 잔액 동기화
1. TransactionModal → 지출 5,000, asset_id = 신한은행 → 신한은행 balance -5,000
2. 같은 거래 수정해서 asset_id = 우리은행 → 신한은행 +5,000 복원, 우리은행 -5,000
3. 같은 거래 삭제 → 우리은행 +5,000 복원
4. 체크카드 지출: asset = 신한체크 → 신한은행 -5,000, 신한체크 balance 변동 없음
5. 신용카드 지출: asset = 우리카드 → 우리카드 balance +5,000 (누적)
6. 신용카드에 수입 입력 시도 → UI 에서 차단

### 신용카드 정산
1. 신용카드에 누적 50,000 + 결제일 15일
2. 5월 15일 이후 → 자산 탭 카드에 "정산" 버튼 나타남
3. "정산" 클릭 → 다이얼로그 → "신한은행에서 50,000원 차감" 확인
4. 확인 후: 신한은행 -50,000, 우리카드 0, expenses 에 "우리카드 5월 정산" 한 줄 자동 생성
5. linked_asset_id 가 없으면 정산 시 은행 선택 prompt

### 미니멈 보완
1. TransactionModal 진입 → 빠른 금액 칩 5개 보임, 클릭 시 input 채워짐
2. 🔢 버튼 클릭 → 계산기 팝오버 → 1000+500= → 1500 input 반영
3. memo input 타이핑 시 최근 60일 사용한 메모 자동 완성 (`<datalist>`)
4. 자산 칩 row 가로 스크롤, 선택 시 ring 표시
5. 자연어 파서: `"스벅 5500 신한체크"` 입력 → asset_id = 신한체크.id 자동 채워짐
6. PWA 설치 후 홈 아이콘 길게 누름 → "지출 추가" / "수입 추가" shortcut 보임 → 클릭 시 `/expense?action=add-expense` 진입 → 자동으로 TransactionModal 열림

### 회귀
- 기존 지출/수입 등록 (asset 선택 안 함) → 정상 저장, balance 변동 없음
- 기존 거래의 asset_id NULL → "미지정" 으로 표시 + 필터에서 "미지정" 그룹
- 부부 가계부 공유: 자산은 partner 에게 안 보임, 거래는 기존처럼 공유
- 월간 그리드, 캘린더 셀 순수익 표시 모두 그대로

---

## 9. 위험 / 미정

### 9.1 잔액 정합성
- 자동 +/- 로직에서 race condition 가능성 (동시 두 탭에서 거래 등록)
- 완화: Supabase RPC (Postgres function) 안에서 SELECT FOR UPDATE → 잔액 갱신 atomic
- v1 에선 서버 액션 안에서 select → calc → update 3 step. 충돌 빈도 낮을 것으로 추정. 실제 운영 후 RPC 전환 검토

### 9.2 체크카드 잔액 표시
- 체크카드 카드 자체엔 balance 안 보여줌 (혼란 방지)
- "→ 신한은행" 처럼 연결 표시만, 클릭 시 신한은행 잔액 보여주는 식으로

### 9.3 신용카드 결제일 31일 처리
- 2월 등 결제일 31일이 없는 달 → 마지막 날로 fallback
- 정산 가능 판정에서 `today.getDate() >= Math.min(payment_day, lastDayOfMonth)`

### 9.4 마이그레이션 후 기존 사용자
- "현금" 1개 자동 생성됨 → 사용자가 잔액 0 이라 의아할 수 있음
- 자산 탭 첫 진입 시 onboarding hint: "초기 잔액을 입력해주세요. 거래마다 자동으로 +/- 됩니다."

### 9.5 가입 시 트리거의 SECURITY DEFINER
- `create_default_asset_for_new_user` 함수는 SECURITY DEFINER 필요 (auth.users 에서 트리거)
- RLS bypass 됨 — assets insert 가능. 검증: 함수 안에서 new.id 사용 (다른 user id 못 씀)

### 9.6 자산 색 충돌
- 시스템 색 (수입 #16A34A / 지출 #DC2626) 과 자산 색이 의미적으로 같은 톤일 때 혼동
- 자산 색 팔레트 6개는 위 5.6 의 hex 유지 → 메모리의 color restraint 원칙 준수

### 9.7 미정 (Phase 2/3 에서 결정)
- 자산 상세 페이지에서 카테고리별 사용 비중 (Phase 2 통계 강화 때)
- 저축/투자 자산의 평가액 시계열 (Phase 3 투자 관리)
- 일정 → 자산 prefill (Phase 4)

---

## 10. 분량 추정

| 단위 | 시간 |
|---|---|
| DB 마이그레이션 + types/database.ts | 1h |
| asset-queries / asset-actions 신규 | 2h |
| AssetsTab + AssetGroup + AssetCard + AssetsSummaryHeader | 2.5h |
| AssetModal (CRUD + 색 picker + 조건부 필드) | 2h |
| 신용카드 정산 (CreditCardSettleButton + 다이얼로그 + settleCreditCard) | 1.5h |
| 기존 actions 에 applyAssetDelta 통합 (expense/income 모두) | 1.5h |
| TransactionModal 자산 칩 + 빠른 금액 + 계산기 + memo autocomplete | 2h |
| 자연어 파서 자산 키워드 (expense + income) | 1h |
| PWA shortcuts + ?action= URL 처리 | 0.5h |
| AssetDetailView + AssetBalanceAdjustDialog | 1.5h |
| 검증/회귀/수정 | 2h |
| **합계** | **약 17.5h** |

저녁 시간 집중 시 약 4~5일.

---

## 11. 다음 단계

이 spec 승인 후 → `writing-plans` 스킬로 단계별 implementation plan 작성 → subagent-driven-development 로 task 별 실행.

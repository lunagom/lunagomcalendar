# 수입(Income) 기능 — 설계 문서

작성일: 2026-05-26
대상 영역: `/expense` (가계부) 페이지, 캘린더 셀, 자연어 파서, DB 4 테이블

---

## 1. 목적

현재 가계부는 **지출만** 기록 가능. 사용자가 "가계부의 절반만 있다" 고 표현. 본 작업으로:

- 월급 / 투자수익 / 부수입 등 다양한 수입을 기록
- 일회성 (보너스) + 정기 (월급) 둘 다 지원
- 월간 뷰에 **수입/지출/순수익** 표시
- 카테고리별 분석은 수입/지출 **분리**
- 캘린더 셀에 수입은 다른 색(초록)으로 표시

부부 가계부 공유(partnerships)와 정합 — 수입도 partner_id 자동 채우기 트리거로 같은 정책 적용.

---

## 2. 합의 결정 사항

| 결정 | 선택 |
|---|---|
| DB 설계 | **별도 `incomes` 테이블 신설** (기존 expenses 무영향) |
| 정기 수입 | **별도 `recurring_incomes` 테이블** (subscriptions 와 동형) |
| 수입 카테고리 기본값 | **월급 / 투자수익 / 부수입 / 기타** (4개) |
| 자연어 파서 | **`parseIncome` 분리** + 수입 키워드 사전 추가 |
| 라우트 | **`/expense` 그대로 유지** (페이지 라벨/내부 UI 만 수정) |
| 캘린더 셀 표시 | **수입/지출 두 줄** (수입 초록, 지출 기존 회색) |
| 부부 공유 | **자동 공유** (지출과 동일 정책) — partner_id 트리거 적용 |
| 정기 수입 진입점 | **"구독" 탭 → "정기" 로 개명**, 안에 정기지출/정기수입 섹션 |

용돈 카테고리는 부수입에 흡수 (사용자 결정).

---

## 3. 환경 분리 그림

```
[ user 입력 ]
   │
   ├─ (a) /expense 페이지 "월간" 탭 → 수입 추가 / 지출 추가 버튼 2개
   │       └─ 자연어 + 카테고리 칩 + 일자
   │           ├─ 수입 → incomes INSERT (parseIncome 사용)
   │           └─ 지출 → expenses INSERT (parseExpense, 기존 흐름)
   │
   ├─ (b) /expense 페이지 "정기" 탭
   │       ├─ 정기 지출 섹션 → subscriptions (기존)
   │       └─ 정기 수입 섹션 → recurring_incomes (신규)
   │
   └─ (c) 캘린더 월 그리드 셀 (DayCell)
           └─ 그날 합계 표시
              ├─ +123,400  (초록, 수입 합계)
              └─ -45,000   (회색, 지출 합계)
```

---

## 4. 데이터 모델

### 4.1 새 마이그레이션 파일

**`supabase/migrations/20260526170000_incomes.sql`**

```sql
-- ============================================================================
-- 수입(income) — incomes + recurring_incomes 테이블 + RLS + partner_id 트리거
-- ============================================================================

-- ─── incomes (일회성 수입) ───────────────────────────────────────────────────
create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid references auth.users(id),  -- 부부 공유 (자동 채우기)
  amount integer not null check (amount >= 0),
  category text not null,  -- 자유 입력 (기본 4개 + custom)
  memo text,
  received_at timestamptz not null,  -- 수입 발생/수령 일시
  created_at timestamptz not null default now()
);
create index incomes_user_received_idx on public.incomes (user_id, received_at desc);
create index incomes_partner_idx       on public.incomes (partner_id) where partner_id is not null;

alter table public.incomes enable row level security;
create policy "incomes_all_own_or_partner" on public.incomes for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

-- partner_id 자동 채우기 (기존 set_partner_id_on_insert 함수 재사용)
create trigger incomes_set_partner_id
  before insert on public.incomes
  for each row execute function public.set_partner_id_on_insert();

-- ─── recurring_incomes (정기 수입) ────────────────────────────────────────────
create table public.recurring_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid references auth.users(id),
  name text not null,             -- "회사 월급", "임대료" 등 자유 텍스트
  amount integer not null check (amount >= 0),
  receive_day smallint not null check (receive_day between 1 and 31),  -- 매월 수령일
  category text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index recurring_incomes_user_active_idx on public.recurring_incomes (user_id, is_active);
create index recurring_incomes_partner_idx     on public.recurring_incomes (partner_id) where partner_id is not null;

alter table public.recurring_incomes enable row level security;
create policy "recurring_incomes_all_own_or_partner" on public.recurring_incomes for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

create trigger recurring_incomes_set_partner_id
  before insert on public.recurring_incomes
  for each row execute function public.set_partner_id_on_insert();
```

**기존 테이블 변경 없음** — incomes 도입이 expenses/subscriptions/budgets 에 0 의존.

### 4.2 타입 재생성

마이그레이션 적용 후 `pnpm db:types` 로 `types/database.ts` 재생성. `IncomeRow`, `RecurringIncomeRow` 자동 추가.

---

## 5. 파일 구조 (features/expense → 그대로 두고 incomes 는 같은 폴더에 추가)

`/expense` 라우트가 가계부 전체를 다루므로 별도 feature 폴더 만들지 않고 `features/expense/` 안에 incomes 관련 컴포넌트/서버 코드 추가. (분리하면 cross-feature import 가 복잡해짐.)

```
features/expense/
├── server/
│   ├── queries.ts        (확장) getIncomesForMonth, getRecurringIncomes, getMonthlyIncomeTotal, getMonthlyTotalsByIncomeCategory
│   └── actions.ts        (확장) createIncome, updateIncome, deleteIncome, createRecurringIncome 등
├── components/
│   ├── ExpenseModal.tsx           (기존)
│   ├── ExpenseMonthGrid.tsx       (수정 — 일별 수입/지출 분리 표시)
│   ├── CategoryTotalsBar.tsx      (수정 — 수입/지출 props 분리, 두 줄로 표시)
│   ├── SubscriptionModal.tsx      (기존)
│   ├── SubscriptionTabContent.tsx (기존)
│   ├── BudgetTabContent.tsx       (기존)
│   ├── MonthTargetWidget.tsx      (기존)
│   ├── ExpensePage.tsx            (수정 — 헤더에 월 요약 카드, 탭 라벨/내용 변경)
│   │
│   ├── IncomeModal.tsx              ✨ 신규 — 수입 입력 모달 (ExpenseModal 의 사촌)
│   ├── RecurringIncomeModal.tsx     ✨ 신규 — 정기 수입 입력 (SubscriptionModal 의 사촌)
│   ├── RecurringIncomeList.tsx      ✨ 신규 — 정기 수입 리스트
│   ├── RecurringTabContent.tsx      ✨ 신규 — "정기" 탭 (정기지출 + 정기수입 섹션)
│   └── MonthSummaryCard.tsx         ✨ 신규 — 수입/지출/순수익 3 줄 카드 (페이지 헤더)
│
└── (server/parser는 lib/income-parser.ts 로 분리)

lib/
└── income-parser.ts                 ✨ 신규 — parseIncome + 수입 키워드 사전
```

`/expense` 라우트 (app/(app)/expense/page.tsx) 는 새 server query 들도 함께 fetch 해서 props 로 ExpensePage 에 전달.

---

## 6. 단계별 작업 (A-F)

### Stage A — DB 스키마

1. 마이그레이션 SQL `20260526170000_incomes.sql` 작성
2. dev (`supabase db reset` 또는 SQL Editor) 적용
3. prod SQL Editor 에 적용 (배포 전)
4. `pnpm db:types` 로 타입 재생성

### Stage B — Server Layer

1. `lib/income-parser.ts` — `parseIncome(input)` + 키워드 사전
2. `features/expense/server/queries.ts` 확장:
   - `getIncomesForMonth(month)`
   - `getIncomesForDay(date)`
   - `getRecurringIncomes()`
   - `getMonthlyTotalsByIncomeCategory(month)` (기존 expense 함수와 대칭)
   - `getUsedCategories()` 는 incomes 도 포함하도록 확장 (단, 수입/지출 분리 반환 형태 검토 — 별도 함수 `getUsedIncomeCategories` 가 깔끔)
3. `features/expense/server/actions.ts` 확장:
   - `createIncome`, `updateIncome`, `deleteIncome` (zod schema)
   - `createRecurringIncome`, `updateRecurringIncome`, `deleteRecurringIncome`, `toggleRecurringIncomeActive`

자연어 파서 키워드 (수입):
- 월급: `월급`, `급여`, `봉급`, `salary`
- 투자수익: `배당`, `이자`, `주식`, `코인`, `펀드`, `etf`, `수익`, `차익`, `dividend`
- 부수입: `보너스`, `상여`, `프리랜스`, `용돈`, `환급`, `세금환급`, `매출`, `bonus`
- 기타: (fallback)

### Stage C — 입력 UI

1. **IncomeModal.tsx** — ExpenseModal 패턴 복제, 카테고리 풀만 수입용, 자연어 파서 `parseIncome` 사용.
2. **RecurringIncomeModal.tsx** — SubscriptionModal 패턴 복제, "결제일" → "수령일" 로 라벨만 바뀜.
3. ExpenseDayDetailPopup 도 수입 표시 추가 (그날의 수입 리스트).

### Stage D — `/expense` 페이지 UI

1. **MonthSummaryCard.tsx** — 페이지 헤더 영역에 추가:
   ```
   ┌─────────────────────────────────────┐
   │  수입    +1,250,000 원              │
   │  지출    -450,000 원                │
   │  순수익  +800,000 원  ✓             │
   └─────────────────────────────────────┘
   ```
   순수익이 음수면 빨강, 양수면 초록.

2. **CategoryTotalsBar.tsx** — 한 줄에서 두 줄로 분리:
   - 위: 수입 카테고리 칩들 (초록 톤)
   - 아래: 지출 카테고리 칩들 (기존 카테고리 색)

3. **월간 탭 안 액션 영역** — "지출 추가" 외에 "수입 추가" 버튼 추가. 두 버튼 나란히 표시.

4. **ExpenseMonthGrid.tsx** — 일별 셀에 수입 합계 (초록) + 지출 합계 (회색/빨강) 두 줄. 0 이면 해당 라인 숨김.

5. **탭 라벨 변경**: `월간 / 구독 / 예산` → `월간 / 정기 / 예산`

6. **RecurringTabContent.tsx** — "정기" 탭 내용:
   - 섹션 1: 정기 지출 (기존 SubscriptionList 그대로)
   - 섹션 2: 정기 수입 (신규 RecurringIncomeList)

### Stage E — 캘린더 통합

`features/calendar/components/MonthGrid.tsx` + `DayCell.tsx`:

1. 월 query 에 `getIncomesForMonth` 추가, props 로 incomes 전달
2. `incomesByDate` Map 만들기 (isoToLocalDateKey 로 그룹핑)
3. DayCell 에 수입 합계 라인 추가:
   - 수입 > 0 → 초록 `+123,400`
   - 지출 > 0 → 기존 회색 `-45,000`
   - 둘 다 0 → 둘 다 숨김

색은 메모리의 색 절제 원칙대로 **초록 단일** (수입 카테고리 차이는 셀에서는 표현 안 함, /expense 의 분석 화면에서만 분리).

### Stage F — 검증

- `pnpm vitest run` — 새 `lib/income-parser.test.ts` 추가, 기존 테스트 영향 없음
- `pnpm tsc --noEmit`
- `pnpm dev` 띄우고 시나리오:
  1. 수입 추가 (자연어 "월급 3000000")  → 월 요약 +3,000,000 표시
  2. 지출 추가 (기존 흐름)  → 순수익 정상 계산
  3. 정기 수입 추가  → "정기" 탭에 표시
  4. 캘린더로 가서 같은 날 셀에 +/- 두 줄 표시
  5. 부부 공유 활성 상태에서 파트너 화면에서 수입 보임 확인 (있다면)
  6. 모바일 (좁은 화면) /expense 페이지 월 요약 카드 + 두 버튼 + 카테고리 두 줄 깨지지 않음

---

## 7. 자연어 파서 — `parseIncome` 분리

이유: 수입 모달이 따로 있으므로 호출 측 (모달) 이 어느 파서를 쓸지 안다. 자동 분류 불필요.

```ts
// lib/income-parser.ts
import { INCOME_CATEGORY_PRESETS } from "./colors";

export type ParsedIncome = {
  amount: number | null;
  category: string | null;  // INCOME_CATEGORY_PRESETS 중 하나 또는 null
  memo: string | null;
};

const INCOME_CATEGORY_KEYWORDS: Record<string, string[]> = {
  월급: ["월급", "급여", "봉급", "salary"],
  투자수익: ["배당", "이자", "주식", "코인", "펀드", "etf", "수익", "차익", "dividend"],
  부수입: ["보너스", "상여", "프리랜스", "용돈", "환급", "세금환급", "매출", "bonus"],
  기타: [],
};

// parseExpense 와 동일한 토큰 분리 + 금액 추출 로직 → 카테고리 사전만 다름
export function parseIncome(input: string): ParsedIncome { ... }
```

색 팔레트 (`lib/colors.ts`) 에 `INCOME_CATEGORY_PRESETS` 와 `INCOME_CATEGORY_COLOR` (단일 값, 예: `#3eb489`) 추가. **모든 수입 카테고리는 동일한 초록 색을 공유** — 메모리 색 절제 원칙. 카테고리 구분은 라벨 텍스트로만.

---

## 8. 위험 / 엣지케이스

| 항목 | 위험 | 대응 |
|---|---|---|
| prod 마이그레이션 | incomes 테이블 신설 — 새 테이블이라 기존 데이터 영향 없음 | dev 적용 후 prod SQL Editor 에 같은 파일 적용 |
| partner_id 트리거 | 기존 `set_partner_id_on_insert()` 함수 재사용 — incomes 테이블에도 정상 동작 | 마이그레이션 마지막에 `select * from incomes limit 0` 으로 트리거 등록 확인 |
| 수입 카테고리 자유 입력 | 사용자가 "월급" 외 임의 텍스트 입력 시 색 매핑 누락 | `getIncomeCategoryColor` 의 fallback 색 (기본 초록) |
| 부부 공유 활성 상태에서 수입 추가 | partner 가 즉시 못 볼 가능성 (Supabase Realtime 미구독) | revalidatePath("/expense") 로 SSR 캐시 무효화. Realtime 은 future work. |
| 정기 수입 자동 인스턴스 생성 | 매월 수령일이 와도 incomes 에 자동 INSERT 안 됨 | **YAGNI** — 사용자가 직접 그날 "수입 추가" 누르거나, 향후 cron 으로 추가. v1 에서는 정기 수입은 표시 + 알림만. |
| /expense 페이지 라벨 | 사이드바는 이미 "가계부" — 페이지 내부는 어느 쪽? | 사이드바 nav 그대로 ("가계부"). 페이지 내부 헤더는 라벨 없이 월 네비게이션만 (현재 그대로). |
| 모바일 헤더 | MonthSummaryCard 추가로 헤더 높이 증가 가능 | 모바일은 카드 컴팩트 (1 줄 형식 `수입 1.25M · 지출 0.45M · 순 +0.8M`) 데스크톱은 3 줄 |

---

## 9. YAGNI — 이번 작업 범위 밖

다음 항목은 v1 에 포함하지 않음:

- ❌ 정기 수입 자동 인스턴스 생성 (cron 으로 매월 incomes INSERT) — 표시만 함
- ❌ 수입 알림 (구독 due 와 유사) — 정기 수입의 수령일 알림은 future
- ❌ 수입 위젯 (메인 위젯 영역에 "이번 달 수입") — future
- ❌ 수입의 카테고리 색 다양화 — 단색 초록으로 통일
- ❌ 수입의 자동 분류 (지출/수입 자동 판별) — 사용자가 수동으로 모달 선택
- ❌ 수입의 영수증 첨부 (receipt_url 같은 컬럼) — 필요해지면 추가
- ❌ /expense 의 라우트명 변경 (/money 등)
- ❌ "용돈" 카테고리 — 부수입에 흡수

---

## 10. 영향 받는 기능 정리

| 기존 기능 | 영향 | 변경 |
|---|---|---|
| 지출 입력 (ExpenseModal) | 무영향 | 그대로 |
| 구독 트래커 (SubscriptionModal) | 무영향 | 그대로, "정기" 탭으로 위치만 이동 |
| 예산 (BudgetTabContent) | 무영향 | 지출 카테고리 한도 — 수입과 무관 |
| 자연어 파서 (parseExpense) | 무영향 | 그대로, parseIncome 은 분리 |
| 캘린더 셀 (DayCell) | 변경 | 수입 합계 라인 추가 |
| 부부 공유 (partnerships) | 확장 | partner_id 트리거가 incomes 에도 적용 |
| 위젯 (MonthTargetWidget) | 무영향 | 지출 목표 — 수입은 새 위젯 미구현 |
| 캘린더 일정의 expected_amount | 무영향 | 일정에 붙은 예상 지출, 수입은 별도 |

---

## 11. 다음 단계

이 spec 승인 후 → `writing-plans` 스킬 호출 → bite-sized task 단위 implementation plan 작성.

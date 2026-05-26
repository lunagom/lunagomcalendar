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
| 수입 카테고리 기본값 | **월급 / 투자 / 코인 / 부수입 / 기타** (5개) — 색·아이콘 12 절 참조 |
| 자연어 파서 | **`parseIncome` 분리** + 수입 키워드 사전 추가 |
| 라우트 | **`/expense` 그대로 유지** (페이지 라벨/내부 UI 만 수정) |
| 입력 모달 | **ExpenseModal → `TransactionModal` 리네임** + 상단 [지출][수입] 탭 |
| 캘린더 셀 표시 | **순수익 한 줄** (양수 초록 `+N원`, 음수 빨강 `-N원`) |
| 부부 공유 | **자동 공유** (지출과 동일 정책) — partner_id 트리거 적용 |
| 정기 수입 진입점 | **별도 "정기 수입" 탭 신설**, `월간 / 정기 결제 / 정기 수입 / 예산` 4 탭 |

용돈 카테고리는 부수입에 흡수 (사용자 결정).

---

## 3. 환경 분리 그림

```
[ user 입력 ]
   │
   ├─ (a) /expense "월간" 탭 → [+ 추가] 버튼 → TransactionModal
   │       └─ 상단 [지출][수입] 탭 → type 결정
   │           ├─ 지출 탭: parseExpense + 지출 카테고리 풀 + 빨강 강조
   │           └─ 수입 탭: parseIncome + 수입 카테고리 풀 + 초록 강조
   │
   ├─ (b) /expense "정기 결제" 탭 → SubscriptionModal (기존, 변동 없음)
   │       /expense "정기 수입" 탭 → RecurringIncomeModal (신규)
   │
   └─ (c) 캘린더 월 그리드 셀 (DayCell)
           └─ 그날 순수익 = sum(incomes) - sum(expenses)
              · 양수 → 초록 "+N원"
              · 음수 → 빨강 "-N원"
              · 0/없음 → 표시 안 함
           (수입/지출 분리 표시는 DayDetailPopup 에서)
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
│   ├── queries.ts        (확장) getIncomesForMonth, getIncomesForDay,
│   │                            getRecurringIncomes,
│   │                            getMonthlyTotalsByIncomeCategory,
│   │                            getUsedIncomeCategories
│   └── actions.ts        (확장) createIncome, updateIncome, deleteIncome,
│                                createRecurringIncome, updateRecurringIncome,
│                                deleteRecurringIncome, toggleRecurringIncomeActive
├── components/
│   ├── ExpenseModal.tsx           ⇒ TransactionModal.tsx 로 리네임
│   │                                + 상단 [지출][수입] 토글 탭
│   │                                + 탭에 따라 카테고리 풀 / 파서 / 색 변경
│   ├── ExpenseMonthGrid.tsx       (수정 — 일별 순수익 한 줄로 표시,
│   │                                상세는 ExpenseDayDetailPopup 에서)
│   ├── ExpenseDayDetailPopup.tsx  (수정 — 수입 / 지출 섹션 분리 표시)
│   ├── CategoryTotalsBar.tsx      (수정 — 수입/지출 props 분리, 두 줄 칩 영역)
│   ├── SubscriptionModal.tsx      (기존, 변동 없음)
│   ├── SubscriptionTabContent.tsx (기존, "정기 결제" 라벨로만 변경)
│   ├── SubscriptionList.tsx       (기존)
│   ├── BudgetTabContent.tsx       (기존)
│   ├── MonthTargetWidget.tsx      (기존)
│   ├── ExpensePage.tsx            (수정 — 헤더에 월 요약 위젯,
│   │                                탭 4개로 확장, 흑자 메시지 옆자리)
│   │
│   ├── RecurringIncomeModal.tsx     ✨ 신규 — SubscriptionModal 패턴 복제,
│   │                                    "결제일" → "수령일" 라벨/필드
│   ├── RecurringIncomeList.tsx      ✨ 신규 — 정기 수입 카드 리스트
│   ├── RecurringIncomeTabContent.tsx ✨ 신규 — "정기 수입" 탭 컨텐츠
│   └── MonthSummaryWidget.tsx       ✨ 신규 — 순수익 메인 + 수입/지출 보조 카드 2 개
│
lib/
├── income-parser.ts                 ✨ 신규 — parseIncome + 수입 키워드 사전
├── income-parser.test.ts            ✨ 신규 — parseIncome 테스트
└── colors.ts                        (수정) INCOME_CATEGORY_PRESETS + 색 매핑,
                                            TRANSACTION_DELTA_COLORS (수입/지출 라이트+다크)
```

`/expense` 라우트 (`app/(app)/expense/page.tsx`) 는 새 server query 들도 함께 fetch 해서 props 로 `ExpensePage` 에 전달. 캘린더 페이지 (`app/(app)/calendar/page.tsx`) 도 `incomes` 를 props 로 받아 `MonthGrid` 에 전달.

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

1. **TransactionModal.tsx** (`ExpenseModal.tsx` 리네임 + 확장):
   - 상단 [지출][수입] 탭 (shadcn `Tabs`). 탭 색이 수입/지출 시각 신호.
   - 탭에 따라 카테고리 칩 풀 / 파서 / 금액 input 글자색 변경.
   - 부호 표기: 미리보기/저장 시 amount 는 음수 아닌 정수, 표시 단에서 `+`/`-` 부호 부여.
   - 자연어 input placeholder 도 탭별로 바뀜 ("커피 3500" vs "월급 3000000").
2. **RecurringIncomeModal.tsx** — SubscriptionModal 패턴 복제, "결제일" → "수령일" 라벨만 다름.
3. **ExpenseDayDetailPopup.tsx** 수정 — 그날의 수입/지출을 두 섹션으로 분리 표시. 헤더에 그날 순수익 작게 표기.

### Stage D — `/expense` 페이지 UI

1. **MonthSummaryWidget.tsx** — 페이지 헤더 영역에 신규 위젯:
   ```
   데스크톱:
   ┌──────────────────┐  ┌──────────┐  ┌──────────┐
   │  순수익  (큰 폰트) │  │   수입    │  │   지출    │
   │  +800,000 원      │  │ +1,250,000│  │ -450,000  │
   │  (초록/빨강)      │  │  (초록 톤) │  │  (빨강 톤) │
   └──────────────────┘  └──────────┘  └──────────┘

   모바일 (한 화면 들어가야 함):
   ┌─────────────────────────────────────┐
   │  순수익  +800,000 원                │
   │  수입 +1.25M · 지출 -0.45M         │
   └─────────────────────────────────────┘
   ```
   - 순수익이 양수 → 초록, 음수 → 빨강. 0 이면 회색.
   - 흑자(순수익 > 0) 일 때 위젯 옆에 작게 "이번 달 흑자네요 ✨". 적자/0 이면 메시지 없음.

2. **CategoryTotalsBar.tsx** — 두 줄로 분리:
   - 위: 수입 카테고리 칩 (초록 톤 5색, 12 절 참조)
   - 아래: 지출 카테고리 칩 (기존 카테고리 색)

3. **월간 탭 액션 영역** — 단일 `[+ 추가]` 버튼 → TransactionModal 열림 (탭으로 지출/수입 선택). 버튼 2개로 늘리지 않음.

4. **ExpenseMonthGrid.tsx** — 일별 셀에 순수익만 한 줄 표시:
   - sum(incomes) - sum(expenses) > 0 → 초록 `+N원`
   - < 0 → 빨강 `-N원`
   - = 0 또는 둘 다 없음 → 표시 안 함
   - 셀 탭 → ExpenseDayDetailPopup 에서 수입/지출 분리 확인

5. **탭 라벨 변경**: `월간 / 구독 / 예산` → `월간 / 정기 결제 / 정기 수입 / 예산` (4개). 모바일 가로 스크롤 가능.

6. **RecurringIncomeTabContent.tsx** — 새 탭 컨텐츠. 상단 `[+ 정기 수입 추가]` 버튼 + `RecurringIncomeList`. 구조는 SubscriptionTabContent 와 동형.

### Stage E — 캘린더 통합

`features/calendar/components/MonthGrid.tsx` + `DayCell.tsx`:

1. 월 query 에 `getIncomesForMonth` 추가, props 로 incomes 전달
2. `incomesByDate` Map 만들기 (`isoToLocalDateKey` 로 그룹핑 — 어제 수정한 helper 재사용)
3. DayCell 에 **순수익 한 줄** 표시:
   - delta = sum(incomes_of_day) - sum(expenses_of_day)
   - delta > 0 → 초록 `+N원`
   - delta < 0 → 빨강 `-N원`
   - delta = 0 또는 거래 없음 → 라인 숨김
4. 수입/지출 분리 확인은 `DayDetailPopup` 에서 (셀은 정보 밀도 낮게 유지).

색은 12 절의 `TRANSACTION_DELTA_COLORS` 사용 (라이트 + 다크 모드 분기).

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

이유: 수입 모달 탭이 따로 있으므로 호출 측이 어느 파서를 쓸지 안다. 자동 분류 불필요.

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
  투자: ["배당", "이자", "주식", "펀드", "etf", "수익", "차익", "dividend"],
  코인: ["코인", "비트코인", "이더리움", "btc", "eth", "crypto", "암호화폐"],
  부수입: ["보너스", "상여", "프리랜스", "용돈", "환급", "세금환급", "매출", "bonus"],
  기타: [],
};

// parseExpense 와 동일한 토큰 분리 + 금액 추출 로직 → 카테고리 사전만 다름
export function parseIncome(input: string): ParsedIncome { ... }
```

색 / 아이콘 매핑은 12 절 (디자인 가이드라인) 참조. `lib/colors.ts` 에 `INCOME_CATEGORY_PRESETS`, `INCOME_CATEGORY_COLOR`, `TRANSACTION_DELTA_COLORS` 추가.

---

## 8. 위험 / 엣지케이스

| 항목 | 위험 | 대응 |
|---|---|---|
| prod 마이그레이션 | incomes 테이블 신설 — 새 테이블이라 기존 데이터 영향 없음 | dev 적용 후 prod SQL Editor 에 같은 파일 적용 |
| partner_id 트리거 | 기존 `set_partner_id_on_insert()` 함수 재사용 — 정상 동작 | 마이그레이션 마지막 검증 쿼리로 트리거 등록 확인 |
| 수입 카테고리 자유 입력 | 사용자가 5 개 외 임의 텍스트 입력 시 색·아이콘 매핑 누락 | `getIncomeCategoryColor` fallback 색 (`#6B7280` 회색), 아이콘 fallback `MoreHorizontal` |
| 부부 공유 활성 상태에서 수입 추가 | partner 가 즉시 못 볼 가능성 (Realtime 미구독) | `revalidatePath("/expense")` + `/calendar` 로 SSR 캐시 무효화. Realtime 은 future work. |
| 정기 수입 자동 인스턴스 생성 | 매월 수령일이 와도 incomes 에 자동 INSERT 안 됨 | **YAGNI** — 사용자가 직접 그날 추가하거나 향후 cron. v1 표시 + 알림 미포함. |
| **ExpenseModal → TransactionModal 리네임** | prod 사용 중인 모달 파일 이름 변경 → import 경로 다수 영향. 어제 timezone 픽스 직후라 충돌 위험 | 1 커밋에 rename + 모든 import 업데이트. tsc 통과로 누락 import 확인. 한 PR 로 묶음. |
| **카테고리 코인 추가** | parseIncome 키워드 사전 / 색 / 아이콘 모두 5 개 정합성 | 12 절의 단일 source 로 관리 (INCOME_CATEGORY_PRESETS 배열 + 매핑 객체) |
| **다크모드 색 대비** | `#16A34A` 가 다크모드 배경에서 너무 진해 잘 안 보임 | 다크모드는 `#4ADE80` 로 채도 낮춰서 사용 (12 절 정의) |
| 모바일 4 탭 | 작은 화면에서 탭 4개 가로로 안 들어감 | `Tabs` 컴포넌트의 `overflow-x-auto` + 탭 최소 너비. 터치 영역 ≥ 44px. |
| 모바일 월 요약 위젯 | 데스크톱 3 카드 가로 배치가 모바일에선 화면 폭 초과 | 모바일은 1 카드 2 줄 압축 형식 (Stage D 그림 참조) |

---

## 9. YAGNI — 이번 작업 범위 밖

다음 항목은 v1 에 포함하지 않음:

- ❌ 정기 수입 자동 인스턴스 생성 (cron 으로 매월 incomes INSERT) — 표시만 함
- ❌ 수입 알림 (구독 due 와 유사) — 정기 수입의 수령일 알림은 future
- ❌ 메인 홈 위젯 영역에 "이번 달 수입" 위젯 — future
- ❌ 수입의 자동 분류 (지출/수입 자동 판별) — TransactionModal 탭으로 사용자가 선택
- ❌ 수입의 영수증 첨부 (receipt_url 같은 컬럼) — 필요해지면 추가
- ❌ /expense 의 라우트명 변경 (/money 등)
- ❌ "용돈" 카테고리 — 부수입에 흡수
- ❌ 적자 시 메시지 / 잔소리 — PROJECT.md 의 "잔소리 없음" 원칙. 흑자만 작은 텍스트.
- ❌ 카테고리별 차트/그래프 — 칩 합계바 만 (Recharts 등 도입 안 함)

---

## 10. 영향 받는 기능 정리

| 기존 기능 | 영향 | 변경 |
|---|---|---|
| 지출 입력 (ExpenseModal) | **리네임** | `TransactionModal` 로 통합. 지출 흐름은 보존 (기본 탭 = 지출), 모든 import 경로 업데이트 |
| 구독 트래커 (SubscriptionModal) | 무영향 | 그대로, "정기" 탭으로 위치만 이동 |
| 예산 (BudgetTabContent) | 무영향 | 지출 카테고리 한도 — 수입과 무관 |
| 자연어 파서 (parseExpense) | 무영향 | 그대로, parseIncome 은 분리 |
| 캘린더 셀 (DayCell) | 변경 | 수입 합계 라인 추가 |
| 부부 공유 (partnerships) | 확장 | partner_id 트리거가 incomes 에도 적용 |
| 위젯 (MonthTargetWidget) | 무영향 | 지출 목표 — 수입은 새 위젯 미구현 |
| 캘린더 일정의 expected_amount | 무영향 | 일정에 붙은 예상 지출, 수입은 별도 |

---

## 11. 디자인 가이드라인

`/design-refs` 폴더의 미니멀 톤 유지. 화려한 그라데이션/네온 ❌. shadcn/ui (`Tabs`, `Card`, `Badge`, `Button`) 우선.

### 11.1 핵심 색 — 수입/지출 (한국 가계부 표준)

CSS 변수로 `lib/colors.ts` 의 `TRANSACTION_DELTA_COLORS` 에 정의:

| 의미 | 라이트 | 다크 |
|---|---|---|
| 수입 (`income`) | `#16A34A` | `#4ADE80` |
| 지출 (`expense`) | `#DC2626` | `#F87171` |
| 중립 (0/없음) | `text-muted-foreground` | (그대로) |

다크모드는 채도 낮춰 눈 피로 감소. `useTheme()` 또는 Tailwind `dark:` 분기로 자동 전환.

**부호 표기 의무화** (색맹 대응): 모든 금액 표시에 `+` / `-` 부호. `formatDelta(n)` helper 추가 (`+50,000원` / `-15,000원`).

### 11.2 수입 카테고리 — 아이콘 + 색

| 카테고리 | lucide-react 아이콘 | 색 |
|---|---|---|
| 월급 | `Briefcase` | `#16A34A` |
| 투자 | `TrendingUp` | `#10B981` |
| 코인 | `Bitcoin` | `#F59E0B` (앰버) |
| 부수입 | `PlusCircle` | `#84CC16` |
| 기타 | `MoreHorizontal` | `#6B7280` (회색) |

- 코인만 앰버 — 비트코인 상징색.
- 단일 source: `lib/colors.ts` 의 `INCOME_CATEGORY_PRESETS` (배열) + `INCOME_CATEGORY_COLOR` (Record) + `INCOME_CATEGORY_ICON` (Record).
- 자유 입력 카테고리는 fallback (`#6B7280` + `MoreHorizontal`).

### 11.3 TransactionModal 탭 디자인

```
┌─────────────────────────────────────┐
│  ╭───────╮ ╭───────╮               │
│  │ 지출  │ │ 수입  │   ← shadcn Tabs │
│  ╰───────╯ ╰───────╯                │
│                                     │
│  [ 자연어 입력 ]                    │
│  ── 금액 ────────────                │
│   30,000 (활성 탭 색)               │
│  ── 카테고리 칩 ─────                │
│   탭 색 풀만 표시                   │
│  ── 일자 ──────────                  │
└─────────────────────────────────────┘
```

- 활성 탭 = 수입 → 모달 헤더 / 금액 input 글자색 / 카테고리 칩 풀 / 저장 버튼 모두 초록.
- 활성 탭 = 지출 → 모두 빨강.
- 모달 props 형태:
  ```ts
  type Props =
    | { mode: "create"; defaultType?: "income" | "expense" }
    | { mode: "edit"; type: "income" | "expense"; initial: ExpenseRow | IncomeRow };
  ```
  생성 모드: 탭 활성, defaultType 으로 초기 탭 결정 (기본 "expense").
  수정 모드: 탭 비활성화 (다른 type 으로 못 바꿈 — DB 가 별도 테이블).

### 11.4 캘린더 셀 표시

- 그날의 순수익 한 줄. 양수 초록 `+N원`, 음수 빨강 `-N원`, 0/없음은 숨김.
- 폰트 크기는 기존 expense 합계 라인 유지 (text-[10px] 정도, 정보 밀도 보존).

### 11.5 월 요약 위젯 (`MonthSummaryWidget`)

- 데스크톱: 카드 3 개 가로 (순수익 / 수입 / 지출). 순수익 카드는 폭 더 크게.
- 모바일: 카드 1 개로 압축 (`순수익 +N원` + 아래 줄에 `수입 +N · 지출 -N`).
- 흑자(순수익 > 0)에 한해 첫 진입 시 카드 옆에 작게 "이번 달 흑자네요 ✨". 적자/0 일 땐 텍스트 없음.
- 토스트 ❌ (잔소리 없음 원칙).

### 11.6 모바일 우선

- 4 탭 (`Tabs`): `overflow-x-auto` + 탭 최소 너비, 터치 영역 ≥ 44px.
- 카테고리 칩: 한 줄에 4~5 개, 가로 스크롤 가능.
- 월 요약 위젯: 모바일은 한 화면에 들어와야 함 → 압축 형식.

### 11.7 격려 메시지 정책

- **흑자만** 표시. 적자/0 은 메시지 없음.
- 형식: 헤더 옆 작은 텍스트 (text-xs text-muted-foreground + 이모지 1개).
- 위치: 월 요약 위젯 옆자리.
- 토스트/모달 알림 ❌.

### 11.8 다크모드 체크리스트

각 신규 컴포넌트는 다크모드에서:
- 텍스트 가독성 (수입/지출 색 대비 4.5:1 이상)
- 카테고리 칩 배경 채도 낮춤
- 모달 배경 / 카드 배경은 shadcn 기본 (`bg-card`)

---

## 12. 다음 단계

이 spec 승인 후 → `writing-plans` 스킬 호출 → bite-sized task 단위 implementation plan 작성.

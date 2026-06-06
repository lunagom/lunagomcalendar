# v2 보완 — 구독 종료일 + 반복 일정 + 할 일 수정 + 모바일 캘린더 탭

**Date**: 2026-06-06
**Status**: Spec
**Owner**: 본인 (Lunabear Calendar)

## Background

캘린더 위젯 v1 출시 (2026-06-06) 후 본인 사용해보니 4가지 불편이 드러남:

1. 구독료가 종료일 없이 무한 합산되어, 끝난 구독을 매번 수동 비활성해야 함
2. 반복 일정 자체가 없음 — 매주 반복하는 일정도 매번 새로 입력
3. 한 번 적은 할 일의 제목을 못 고침 — 삭제 후 다시 추가해야 함
4. 모바일에서 캘린더로 가려면 매번 햄버거 → 메뉴 — 캘린더 앱인데 한 탭으로 못 감

작업량 작은 것 (4 → 3 → 1) 부터 큰 것 (2) 순으로 진행. 한 spec / 한 plan / 한 작업 사이클로 묶음.

## Goal

위 4가지 불편을 해결한 v2 보완 패치를 main 머지/배포. 데이터 손실 없이, 기존 사용 경험 깨지지 않고.

---

## #4 — 모바일 탭바 5탭

### 변경

- `lib/nav.ts` 의 `mobileTabItems` 배열에 캘린더 항목 추가:
  ```ts
  { kind: "link", href: "/calendar", label: "캘린더", icon: Calendar }
  ```
- 순서: **홈 / 캘린더 / 할 일 / 가계부 / 더보기**
- `components/layout/mobile-tabbar.tsx` 의 `grid-cols-4` → `grid-cols-5`
- 아이콘은 lucide `Calendar` (앱 다른 곳에서 이미 사용 중)

### 검증

- iPhone SE (360dp) ~ Z Flip6 폭에서 5칸이 들어맞는지 (각 칸 72dp+)
- 캘린더 탭 active 시 primary 색 강조 동작

---

## #3 — 할 일 제목 inline 수정

### UI

- `TodoItem.tsx` 의 제목 영역을 **더블 탭 (모바일) / 더블 클릭 (데스크탑)** → 인풋 모드 전환
- 인풋 모드: 그 자리에서 텍스트 입력, **Enter 저장** / **Esc 취소** / 포커스 잃으면 저장
- 한 탭 (단일 클릭) 은 기존 동작 그대로 = 체크 토글
- 저장 후 인풋 모드 종료, 카드 다시 렌더

### 서버

- `features/todos/server/actions.ts` 에 `updateTodo(id: string, patch: { title: string }): Promise<ActionResult>` 추가
- 빈 문자열 / 공백만 입력은 reject (기존 제목 유지)
- partner_id 검증 (자기 todo 만 수정 가능)

### 컴포넌트 변경

- `TodoItem.tsx` + `DraggableTodoItem.tsx`: 인풋 모드 state (`isEditing: boolean`, `draftTitle: string`) 추가
- `VirtualTodoItem.tsx` (반복 할 일 가상 카드) 는 수정 불가 — 원본 수정 또는 materialize 후 수정

### 검증

- 더블 탭 ⟶ 인풋 모드 진입 (모바일 + 데스크탑)
- Enter → 저장 + 토스트 "할 일이 수정됐어요"
- Esc / 빈 문자열 입력 → 원래대로 되돌아감
- DnD 와 충돌 안 함 (더블 탭 인식 우선)

---

## #1 — 구독 종료일

### DB 마이그레이션

`supabase/migrations/20260606120000_subscription_end_date.sql`:

```sql
alter table public.subscriptions
  add column if not exists end_date date;
```

기존 행은 모두 NULL = 무한 (현재와 동작 동일).

### 타입

`types/database.ts` 의 `subscriptions.Row / Insert / Update` 에 `end_date: string | null` 추가.

### UI

- `SubscriptionModal.tsx` 에 "종료일" 필드 추가 (DatePicker, optional)
- placeholder / helper: "비워두면 무한 반복돼요"
- 기존 row 편집 시 NULL 이면 빈 상태로 노출

### 합산 로직

`features/expense/server/queries.ts` 의 가계부 활성 구독료 합산 (월별):

```sql
select * from subscriptions
where user_id = $user
  and is_active = true
  and (end_date is null or end_date >= date_trunc('month', $month_date)::date)
```

- `$month_date` = "사용자가 보고 있는 그 달의 시작일", 예: 6월을 보면 2026-06-01
- 6월 보기 + end_date=2026-06-15 → 포함 ✅
- 6월 보기 + end_date=2026-06-01 → 포함 ✅ (경계, 마지막 결제월 의도와 일치)
- 7월 보기 + end_date=2026-06-15 → 제외 ✅
- 6월 보기 + end_date=null → 포함 ✅ (기존 동작 그대로)

`ExpensePage.tsx` 의 `activeSubscriptionSum` 도 이 필터 거친 결과를 받음.

### 검증

- 종료일 = 2026-06-30 설정 후 6월 가계부 → 구독료 포함됨 확인
- 같은 행으로 7월 가계부 보기 → 구독료 제외 확인
- 종료일 없는 (기존) 구독 → 변함 없이 합산됨

---

## #2 — 반복 일정

### 디자인 결정

- 반복 모델은 `tasks` 테이블의 `is_recurring` + `recurrence_rule` 패턴을 events 에도 동일 적용
- 빈도: **매일 (daily) / 매주 (weekly) / 매월 (monthly)** — 3종
- 종료: **없음 (무한) / 특정 날짜 (until) / N회 (count)** — 3종
- 전개 (unfolding): **그 달 + 다음 7일** 만 가상 인스턴스 생성. 무한 전개 안 함
- 가상 인스턴스 수정/완료 = 그 시점에 실제 row 생성 (tasks 패턴 그대로)
- 삭제 옵션: **"이 항목만" / "이후 모두" / "전체"** 다이얼로그로 선택

### DB 마이그레이션

`supabase/migrations/20260606130000_events_recurrence.sql`:

```sql
alter table public.events
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_rule jsonb,
  add column if not exists recurrence_until date,
  add column if not exists recurrence_count integer;

create index if not exists events_recurring_idx
  on public.events (user_id, is_recurring)
  where is_recurring = true;
```

### `recurrence_rule` 스키마

```ts
type RecurrenceRule =
  | { freq: "daily" }
  | { freq: "weekly"; byday: Array<"MO"|"TU"|"WE"|"TH"|"FR"|"SA"|"SU"> }
  | { freq: "monthly"; bymonthday: number /* 1-31 */ };
```

- 매주 = byday 비어있으면 시작일 요일 자동
- 매월 = bymonthday 미지정이면 시작일의 일자 자동

### UI

`EventDialog` (또는 신규 modal) 에 **"반복" 섹션** 추가:

| 필드 | 옵션 |
|---|---|
| 반복 빈도 | 없음 / 매일 / 매주 / 매월 |
| (매주만) 요일 | 월~일 칩 다중 선택 |
| (매월만) 일자 | 시작일의 일자 자동 + 변경 가능 |
| 종료 | 없음 / 특정 날짜 / N회 |
| (날짜) | DatePicker |
| (N회) | 숫자 입력 (2~365) |

### 전개 (unfolding) 유틸

`features/calendar/lib/recurrence.ts`:

```ts
function unfoldRecurringEvent(
  event: EventRow,
  rangeStart: Date,
  rangeEnd: Date
): VirtualEvent[]
```

`tasks` 의 `unfoldRecurring` 패턴을 events 에 맞게 변형. 시작일 + rule 로부터 rangeStart~rangeEnd 사이의 모든 인스턴스 계산, 단 `recurrence_until` / `recurrence_count` 초과시 중단.

### Queries

`features/calendar/server/queries.ts` 의 `getEventsForMonth(month)` 가 반환:
```ts
{
  events: EventRow[],     // 실제 row (반복 원본 포함)
  virtual: VirtualEvent[] // unfold 결과
}
```

캘린더 셀에 둘 다 그림. 가상 인스턴스는 약간 다른 스타일 (점선 테두리 또는 ⟳ 아이콘) 로 표시.

### 가상 인스턴스 수정/완료

- 가상 인스턴스 탭 → EventDetailDialog 띄움 → "이 항목만 수정" 누르면 그 시점 row 생성 + 새 row 편집
- 완료 표시는 events 에는 없음 (캘린더 일정은 완료 개념 없음)

### 삭제

`EventDetailDialog` 의 삭제 버튼이 반복 원본 또는 가상 인스턴스일 때:
- 모달 띄움: **"이 항목만 / 이후 모두 / 전체"**
- "이 항목만": 그 시점 row 생성 + soft delete flag (또는 단순히 exception 처리)
  - 단순화: exception 목록을 `recurrence_rule.exceptions: ["2026-06-15"]` 형태로 저장
- "이후 모두": 원본의 `recurrence_until` 을 그 전날로 갱신
- "전체": 원본 row 삭제 (CASCADE 로 인스턴스 row 들도 같이)

### Actions

`features/calendar/server/actions.ts` 에 추가:
- `createEvent` 시그니처 확장 (recurrence_rule, recurrence_until, recurrence_count)
- `materializeRecurringEvent(parentId, date)` — 가상 인스턴스를 실제 row 로 (tasks 패턴)
- `splitRecurringEvent(parentId, date)` — "이후 모두 삭제" 의 until 갱신
- `addRecurrenceException(parentId, date)` — "이 항목만 삭제" 의 exception 추가

### 검증

- 매주 월요일 7시 회의 추가 → 다음 4주의 월요일에 가상 카드 표시
- 그 중 하나의 시간 변경 → 그 주만 변경, 나머지는 그대로
- 그 중 하나 삭제 (이 항목만) → 그 주만 사라짐
- "이후 모두 삭제" → 그 주 이후 다 사라짐, 이전은 남음
- recurrence_until 도래하면 그 다음부터 가상 인스턴스 안 보임

---

## DB 마이그레이션 적용

두 마이그레이션 모두 **prod (rhtnszvdeqmacwawnznj)** 와 **dev (rkqtcuaifhwyyzbavhio)** Supabase SQL Editor 에 동일하게 실행.

기존 행 영향 없음 (모두 nullable 또는 default 값).

---

## 작업 순서

```
A. 모바일 탭바 5탭 (30분)
B. 할 일 제목 수정 (1시간)
C. 구독 종료일 (1.5시간) — DB 마이그레이션 포함
D. 반복 일정 (5시간) — DB 마이그레이션 + 큰 변경
E. 종합 검증 + 메모리 갱신
```

각 단계 끝에 사용자 검증 게이트. 작은 단계는 한 게이트로 묶을 수도 있음.

## 회귀 점검 (전체 끝나고)

- 캘린더 위젯 (Plan B v1) 그대로 동작 — 캐시 동기화에 영향 없음
- 부부 가계부 공유 — 구독 end_date 추가가 partner_id 와 충돌 없음
- 캘린더 멀티데이 / 공유 캘린더 — 반복 일정 추가가 영향 없음 (별개 컬럼)
- 모바일 햄버거 드로어 — 5탭 추가가 드로어 항목과 충돌 없음
- 카카오 OAuth 보류 상태 그대로

## 위험 / 미리 알기

1. **반복 일정 전개 성능**: 한 사용자가 매일 반복 일정을 1년 운영하면 365개 가상 인스턴스. 월간 뷰 한 번에 32일 전개 = 32개. 문제 없음. 단 "주간 + 다음 7일" 범위를 넘기지 말 것.
2. **타임존**: events 의 `start_at` 는 timestamptz. 반복 전개 시 사용자 로컬 (KST) 기준으로 일자 계산. 마이그레이션 후 기존 행은 영향 없음.
3. **할 일 더블 탭 vs 모바일 길게 누르기 DnD**: 기존 DnD 가 500ms long-press 로 시작. 더블 탭 인식은 200ms 이내 두 번 탭이라 충돌 없음. 단 한 번 탭 + 잠시 후 두 번째 탭 (300ms~500ms) 같은 경계 케이스는 두 번째 탭이 long-press 인식되어 DnD 시작될 수 있음 — 실용적으로 문제 안 됨.
4. **구독 종료일이 이번 달인데 아직 결제 안 한 경우**: end_date >= 그 달 1일 로직 → 포함됨. "마지막 결제월까지 포함" 의도와 일치.
5. **멀티데이 일정 + 반복**: v1 에선 단순화 — 시작일/종료일이 같은 (당일/단일 일자) 일정만 반복 옵션 활성. 멀티데이(start_at 날짜 ≠ end_at 날짜) 면 UI 에서 "반복" 섹션 비활성화하고 안내 ("멀티데이 일정은 반복 지원 안 함"). 추후 v2 에서 검토.

## Self-Review 결과

- ✅ Placeholder 없음
- ✅ 내부 모순 없음 (4번 순서, 1번 합산 로직, 2번 컬럼명 / UI 옵션 모두 일치)
- ⚠️ Scope — 항목 #2 (반복 일정) 만으로도 5시간이라 plan 단계에서 다른 작은 항목들과 자연스럽게 단계별로 분리됨. 한 spec / 한 plan 으로 묶는 건 유지
- ✅ Ambiguity 처리 — 합산 로직 `$month_date` 변수 명확화, 멀티데이+반복 경계 처리 명시

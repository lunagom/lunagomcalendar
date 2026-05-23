# 3단계 디자인 — 캘린더 코어 + 할 일 + 공유 + 실시간

작성일: 2026-05-23
상태: 브레인스토밍 완료, 사용자 리뷰 대기

## 목표

사용자가 로그인한 후 만나는 메인 화면 — 월간 캘린더를 중심으로, 일정·할 일·공유까지 한 번에 완성한다.

## 범위 (In Scope)

| 영역 | 내용 |
| --- | --- |
| 라우트 | `/calendar` 월간 · `/day` 일간 · `/todos` 오늘의 할 일 · `/social` 공유 관리 |
| 일정 CRUD | 생성·조회·수정·삭제 + 드래그앤드롭 이동 |
| 할 일 | 자동 이월(미완료 → 다음 날 표시) + "며칠 밀림" 배지 |
| 한국 특화 | 음력(매월 1일만) + 공휴일(대체공휴일 포함) + 24절기 |
| 캘린더 관리 | 다중 캘린더 + 12색 픽커 + 보이기 토글 |
| 이모지 | 일정·할 일에 자유 이모지 선택 (`emoji-mart`) |
| 공유 | 멤버 초대(이메일) · 수락/거절 · view/edit 권한 · 공유 캘린더 픽커 표시 |
| 실시간 | Supabase Realtime 구독 → 다른 사람/기기 변경 자동 반영 |
| 모바일 | 스와이프 월 이동 · 캘린더 드롭다운 · 반응형 그리드 |
| 키보드 | ← → 월 이동, T 키 "오늘" 점프 |
| 다크 모드 | 1단계 셋업 그대로 유지 |

## 범위 외 (Out of Scope — 다음 단계)

- 주간 뷰 (월간·일간만 완성)
- 자연어 일정 등록 (AI)
- 가계부 통합 (events.expected_amount 컬럼 있지만 사용 X)
- 외부 캘린더 가져오기 (Google·네이버·카카오)
- 위치 지도 연동
- 푸시 알림
- 커스텀 스티커팩 (이미지 기반)
- 날짜 셀 자체 꾸미기(이모지 데코)
- 슬라이드 애니메이션 외 추가 폴리시

## 아키텍처

### 라우트 구조

```
app/
  (app)/                       — 로그인 필수 그룹
    layout.tsx                 — 글로벌 nav (좌측 넓은 메뉴)
    calendar/page.tsx          — 월간 메인 [기본 진입점, / → /calendar 리다이렉트]
    day/page.tsx               — 일간 뷰 (시간 타임라인)
    todos/page.tsx             — 오늘의 할 일 (포커스 모드)
    social/page.tsx            — 공유 관리 (초대 + 받은 초대장)
    expense/  settings/        — 1단계 플레이스홀더 유지
  (auth)/  auth/               — 2단계 유지
```

### 글로벌 nav 메뉴 (B 레이아웃 — 넓은 좌측)

1. 📅 캘린더 (월간) → `/calendar`
2. 🗓 하루 (일간) → `/day`
3. ✅ 오늘의 할 일 → `/todos`
4. 💰 가계부 → 플레이스홀더
5. 👥 공유 → `/social`
6. ⚙ 설정 → 플레이스홀더

### 코드 구조

```
features/calendar/
  components/
    CalendarShell.tsx          — 헤더 + 그리드 레이아웃
    MonthGrid.tsx              — FullCalendar wrapper (월간)
    DayView.tsx                — 시간 타임라인 (일간)
    DayCell.tsx                — 월간 그리드의 한 칸 (커스텀 dayCellContent)
    EventBar.tsx               — 일정 막대 1개 (배경 카테고리 색 + 자동 텍스트 색)
    EventModal.tsx             — 생성/수정 공용 모달
    EventDetailDialog.tsx      — 상세 + 수정/삭제 진입
    DeleteConfirmDialog.tsx    — shadcn AlertDialog
    CalendarPickerDropdown.tsx — 상단 우측 "📋 캘린더 ▾"
    NewCalendarDialog.tsx      — 새 캘린더 (이름 + 12색)
    EmojiPicker.tsx            — emoji-mart wrapper
    MonthNavigation.tsx        — 키보드/스와이프 핸들러
  server/
    queries.ts                 — RSC용 fetch (월/일 단위)
    actions.ts                 — Server Actions (events CRUD)
  store/
    calendar-ui.ts             — Zustand (현재 월, 보이기 토글, 모달 상태)
  realtime/
    subscriptions.ts           — Supabase Realtime 구독 + router.refresh()

features/todos/
  components/
    TodosPage.tsx              — /todos 본체
    TodoSection.tsx            — "밀린 항목" / "오늘" 라벨 + 리스트
    TodoItem.tsx               — 체크박스 + 텍스트 + 밀림 배지
    QuickAddInput.tsx          — 인라인 추가 (DayCell 에도 재사용)
  server/
    queries.ts                 — 오늘 + 밀린 미완료
    actions.ts                 — 토글/추가/삭제/이동

features/social/
  components/
    SocialPage.tsx             — /social 본체 (탭: 보낸 초대 / 받은 초대 / 공유 중)
    InviteForm.tsx             — 이메일 입력 + 권한 선택 + 발송
    InvitationCard.tsx         — 받은 초대장 1개 (수락/거절)
    SharedCalendarList.tsx     — 공유받은 캘린더 목록 + 멤버
    MemberManagement.tsx       — 내가 소유한 공유 캘린더의 멤버 관리
  server/
    queries.ts                 — 초대장·공유 캘린더 fetch
    actions.ts                 — 초대 보내기/수락/거절/제거

lib/
  colors.ts                    — 12색 상수 + getTextColor(hex) 함수
  lunar.ts                     — korean-lunar-calendar wrapper
  holidays.ts                  — 2026.json/2025.json 조회 + 24절기
  fullcalendar/
    locale-ko.ts               — 한국어 로케일 설정
    theme.css                  — 캘린더 디자인 토큰 오버라이드
  supabase/                    — 2단계 유지 + realtime helper 추가
  emoji-curation.ts            — (선택) 첫 화면에 보일 자주 쓰는 이모지 12개

components/ui/                 — shadcn 추가: alert-dialog · popover · checkbox · tabs · toast
                                  · sonner (toast 알림용)
```

## 데이터베이스 변경

### 신규 마이그레이션 1: `tasks` 테이블

```sql
-- supabase/migrations/20260523_tasks_table.sql

-- tasks 는 항상 개인 데이터. 공유 캘린더에서도 각자의 할 일은 본인만 봄.
-- (이유: "장보기" 같은 개인 메모성 체크 항목은 사적인 영역. 가족과 공유해야 할 일은 events 로 등록)
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  scheduled_date date not null,
  completed_at timestamptz,
  emoji text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_date_idx on public.tasks (user_id, scheduled_date);
create index tasks_open_idx on public.tasks (user_id, scheduled_date)
  where completed_at is null;

create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- RLS
alter table public.tasks enable row level security;

create policy tasks_select_own on public.tasks
  for select using (user_id = (select auth.uid()));
create policy tasks_insert_own on public.tasks
  for insert with check (user_id = (select auth.uid()));
create policy tasks_update_own on public.tasks
  for update using (user_id = (select auth.uid()));
create policy tasks_delete_own on public.tasks
  for delete using (user_id = (select auth.uid()));
```

### 신규 마이그레이션 2: `events` 테이블에 `emoji` 컬럼 추가

```sql
-- supabase/migrations/20260523_events_emoji.sql
alter table public.events add column emoji text;
```

(`tasks.emoji` 는 위 마이그레이션 1에 포함)

### Realtime 활성화

```sql
-- 위 두 마이그레이션과 같이 또는 별도로
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.calendars;
alter publication supabase_realtime add table public.shared_calendars;
```

## 컴포넌트 동작 명세

### DayCell (월간 그리드의 한 칸) — 핵심

레이아웃 (위 → 아래):

1. **윗줄**: `[날짜 숫자] · [음 N/1 (그 양력 날짜가 음력 1일일 때만)] [공휴일 배지 / 24절기 배지]`
   - 날짜는 일요일/공휴일은 빨강, 토요일은 파랑, 평일은 검정
   - 다른 달 날짜는 회색 (#bbb)
   - 음력은 그 날짜가 음력 1일(=음력 월이 시작하는 날)일 때만 "음 5/1" 형태로 표시
   - 공휴일 배지는 빨강 알약(#fbe9e8 배경 + #d92d20 텍스트)
   - 24절기 배지는 회색 알약(#f5f5f5 배경 + #888 텍스트), 공휴일과 겹치면 공휴일 우선
2. **중간**: 일정 막대 최대 3개 + "+ N개 더"
   - 막대 배경 = 캘린더 색 (또는 일정별 오버라이드 색)
   - 막대 텍스트 = `[이모지] [제목]`, 텍스트 색은 `getTextColor()` 자동
3. **하단 (점선 구분)**: 체크박스 할 일
   - 완료된 항목은 회색 + 취소선
   - 미완료 + 미과거 항목은 검정
   - 셀 안에서는 최대 2개만, 나머지는 "+ N" 표시
4. **호버 / 클릭 동작**
   - 셀 빈 영역 클릭 → 일정 생성 모달 (해당 날짜 프리필)
   - 일정 막대 클릭 → 일정 상세 다이얼로그
   - 할 일 체크박스 클릭 → 즉시 토글 (useOptimistic)

### EventModal — 생성/수정 공용

필드 (위 → 아래):

- 제목 (필수, max 200)
- 이모지 (선택, "+ 이모지" 버튼 → EmojiPicker 팝오버 → 선택 시 제목 왼쪽에 표시)
- 시작 일시 / 종료 일시
- 종일 토글 (ON 이면 시간 입력 숨김, 자정~자정)
- 캘린더 드롭다운 (기본값: 사용자의 is_default 캘린더 또는 마지막 선택)
- 색상 (기본값: 캘린더 색, 오버라이드 가능 — 12색 픽커)
- 장소 (텍스트, 다음 단계 지도 연동 예정)
- 메모 (텍스트 영역)
- 음력 일정 토글 (is_lunar) — ON 이면 매년 같은 음력 일자에 자동 표시

저장 시 useOptimistic 로 즉시 그리드에 반영. Server Action 실패 시 자동 롤백 + toast.

### EmojiPicker

- `emoji-mart` 라이브러리 사용
- 한국어 i18n 설정
- 첫 화면에 자주 쓰는 카테고리(기념일·건강·모임·일/공부·여가·가족) 노출
- 전체 검색 가능
- 선택 시 onChange 콜백 → 부모(EventModal/QuickAddInput) 에 이모지 전달
- 비울 수도 있음(이모지 없는 일정 허용)

### MonthNavigation

입력 수단:

- 상단 `<` / `>` 버튼: FullCalendar.prev() / .next()
- "오늘" 버튼: FullCalendar.today()
- 키보드: ← / → / T (focus가 body에 있을 때만, 입력 필드 안에서는 무시)
- 모바일 스와이프: touchstart/touchmove/touchend 핸들러, 가로 50px 이상 + 세로 30px 이하 이동 시 발동
- 슬라이드 애니메이션: FullCalendar 전환 시 `transform: translateX(±100%)` + 0.25s ease-out

URL 동기화: 월 변경 시 `router.push('/calendar?month=2026-06')`. 뒤로가기·북마크 가능.

### CalendarPickerDropdown (상단 우측 "📋 캘린더 ▾")

shadcn Popover. 내용:

- "내 캘린더" 섹션: 사용자 소유 캘린더 목록 (색 점 + 이름 + 보이기 토글)
- "공유받은 캘린더" 섹션: 권한 배지(view/edit) + 소유자 닉네임
- "+ 새 캘린더" 버튼 → NewCalendarDialog
- 캘린더 항목 우측: 톱니바퀴(소유자만) → 이름/색 수정 또는 삭제

보이기 토글은 Zustand store 에 저장 (서버 저장 X — 로컬 UI 상태).

### TodosPage (`/todos`)

포커스 모드:

1. 페이지 헤더: "오늘의 할 일" + 오늘 날짜
2. "밀린 항목 · N개" 섹션 (옅은 빨강 배경 카드)
   - 각 항목에 "N일 밀림" 빨강 배지
3. "오늘 · N개" 섹션 (일반 배경)
4. "+ 할 일 추가" 인라인 인풋

빈 상태: "오늘 할 일이 없어요. 천천히 하세요." + 입력 인풋만.

체크박스 즉시 반영 (useOptimistic). 항목 우측 더보기 메뉴: 다른 날로 이동 / 삭제.

### DayView (`/day`)

시간 타임라인 (FullCalendar timeGrid 플러그인):

- 상단: "5월 23일 토요일" + 이전/다음/오늘 + 월간 뷰로 가기 버튼
- 좌측: 시간 축 (06:00 ~ 24:00 기본, 새벽 일정 있으면 자동 확장)
- 본체: 시간 블록으로 일정 표시 (드래그로 시간 조정)
- 하단 영역: 그날의 할 일 목록(체크박스)
- 종일 일정은 상단 별도 영역

### SocialPage (`/social`)

shadcn Tabs:

1. "받은 초대장" — 대기 중인 초대장 카드들 (수락/거절)
2. "보낸 초대" — 내가 보낸 초대 (대기/수락된 상태 표시, 회수 가능)
3. "공유 중인 캘린더" — 내가 소유한 공유 캘린더의 멤버 관리

InviteForm:

- 이메일 입력 + 권한 선택 (view / edit) + 캘린더 선택 + "초대 보내기"
- 이메일이 가입자면 즉시 `shared_calendars` 에 pending 행 생성
- 이메일이 미가입자면 invitation pending 행 + 가입 시 자동 연결 (다음 단계 — 우선 가입자만 초대)

## 데이터 흐름

### 시나리오 1: 페이지 첫 진입

```
브라우저 → RSC (queries.ts)
  - getCalendarsForUser(userId)
  - getEventsForMonth(userId, '2026-05')
  - getTodosForDate(userId, today)
  - getSharedCalendars(userId)
→ SSR HTML 응답
```

### 시나리오 2: 일정 저장

```
EventModal "저장" 클릭
  → useOptimistic 이 가짜 이벤트로 그리드 즉시 갱신
  → Server Action createEvent(formData)
    → INSERT into events
    → revalidatePath('/calendar')
  → 성공: 실제 데이터로 자연스럽게 교체
  → 실패: useOptimistic 자동 롤백 + toast 알림
```

### 시나리오 3: 다른 사람이 공유 캘린더에 일정 추가

```
다른 사용자가 events INSERT
  → Postgres Realtime이 채널에 push
  → 내 브라우저의 subscriptions.ts 가 수신
  → router.refresh() 호출
  → RSC 가 최신 데이터로 재페치 → 그리드 갱신
```

### 시나리오 4: 드래그앤드롭

```
사용자가 5/15 일정을 5/20으로 끌어다 놓음
  → FullCalendar eventDrop 콜백 발동
  → useOptimistic 이 5/20 위치로 즉시 이동
  → Server Action updateEventDate(id, newStart, newEnd)
    → UPDATE events SET start_at, end_at
    → revalidatePath('/calendar')
  → 실패 시 자동 롤백
```

### 시나리오 5: 월 전환

```
"다음 달" 클릭 (또는 → / 스와이프)
  → URL: /calendar?month=2026-06
  → Next.js router cache 확인
    → hit: 즉시 표시
    → miss: queries.ts 가 새 월 페치
  → 슬라이드 애니메이션으로 전환
```

## 한국 특화 기능 — 통합 명세

### 음력 (lunar)

- **표시 위치**: DayCell 윗줄, **음력으로 1일이 되는 날에만** 표시 (= 음력 월이 새로 시작하는 날). 형태는 "음 5/1" (음력 5월 1일이라는 뜻)
  - 예시 (2026년 기준 — `korean-lunar-calendar` 계산 결과 사용):
    - 양력 1/1 → 음력 11/13 → **표시 안 함**
    - 양력 2/17 (음력 1/1) → "음 1/1" **표시**
    - 양력 3/19 (음력 2/1) → "음 2/1" **표시**
    - 나머지 양력 날짜 → 음력 표시 없음
  - 즉, 한 달에 음력 표시가 보이는 칸은 정확히 1개 (음력 월 첫 날)
- **음력 일정 (is_lunar)**: 일정 모달 토글 ON 이면 입력한 양력 날짜의 음력 값을 events.lunar_month / lunar_day 에 저장. 그 후 매년 같은 음력 날짜의 양력으로 자동 재계산되어 표시 (생일/제사 용도)
- **라이브러리**: `korean-lunar-calendar` npm — MIT, 의존성 없음, 1822~2050년 지원

### 공휴일

- **데이터 소스**: 2단계에서 만든 `lib/holidays/2025.json` + `2026.json`
  - `{ date, name, isPublicHoliday, isSubstitute? }`
- **표시**: DayCell 윗줄 우측 알약 배지 (빨강)
- **연동**: 일요일·공휴일은 날짜 숫자도 빨강. 토요일은 파랑

### 24절기

- 같은 holidays JSON 에 `isPublicHoliday: false` 로 포함 (입춘·우수·경칩·춘분·청명·곡우·입하·소만·망종·하지·소서·대서·입추·처서·백로·추분·한로·상강·입동·소설·대설·동지)
- **표시**: 공휴일 배지 자리에 회색 알약
- **충돌 처리**: 공휴일과 24절기가 같은 날짜에 있으면 공휴일만 표시

## 색상 시스템

### 시스템 색 (UI 피드백)

| 토큰 | hex | 의미 |
| --- | --- | --- |
| `--primary` | `#5B6CFF` | 브랜드, 오늘 표시, 주요 액션, 토요일 텍스트 |
| `--alert` | `#D92D20` | 공휴일·일요일·"며칠 밀림"·삭제 확인 |
| `--muted` | `#888` | 24절기·"+N개 더"·완료된 할 일·보조 텍스트 |
| `--subtle` | `#BBB` | 다른 달·비활성·점선 |

새 기능이 추가돼도 위 4개 안에서 해결한다 (색 가짓수 늘리지 않음).

### 카테고리 색 (12색, 사용자 픽커)

dusty/muted 톤. 레퍼런스(`design-refs/KakaoTalk_20260523_142440216.jpg`) 에서 추출.

```
핑크 계열:  #EBD8DD · #E8D2DC · #E8B8CB · #C49AA8
베이지 계열: #F4E8D8 · #E2D5C8 · #C5B5A8 · #A8917F
블루 계열:  #DCE5EA · #BDD3E0 · #7E94A2 · #7A7A7A
```

- 기본 캘린더 "내 캘린더" 시작 색: **#BDD3E0** (소프트 스카이)
- 새 캘린더 생성 시 사용자가 12색 중 선택

### 자동 텍스트 색 (`lib/colors.ts`)

```ts
export function getTextColor(hex: string): '#fff' | '#222' {
  const [r, g, b] = parseHex(hex)
  const brightness = (0.299*r + 0.587*g + 0.114*b) / 255
  return brightness >= 0.6 ? '#222' : '#fff'
}
```

12색 중 어두운 3개(#A8917F·#7E94A2·#7A7A7A) 는 자동으로 흰색 텍스트, 나머지 9개는 검정.

## 공유 (Sharing) — 상세

### 초대 흐름

1. 소유자가 SocialPage → InviteForm 에서 이메일 + 권한(view/edit) + 캘린더 선택 후 발송
2. 시스템이 이메일로 가입자 조회
   - 가입자: `shared_calendars` 에 status=pending, permission, calendar_id, owner_id, member_id 행 생성
   - 미가입자: 우선 에러 ("가입된 사용자만 초대 가능 — 다음 단계에서 외부 초대 지원")
3. 피초대자가 `/social` "받은 초대장" 탭에서 수락/거절
   - 수락 → status='accepted'
   - 거절 → 행 삭제

### 권한 처리

- view: 일정 조회만 가능. EventDetailDialog에서 수정/삭제 버튼 숨김. DnD 비활성화.
- edit: 일정 CRUD 가능. 단, 캘린더 자체 삭제는 소유자만 가능.

### 캘린더 픽커 표시

- "내 캘린더" 섹션 vs "공유받은 캘린더" 섹션 분리
- 공유받은 캘린더에 권한 배지(view/edit) + 소유자 닉네임 노출

### RLS 보강

- 기존 RLS 정책에 `has_calendar_membership(calendar_id, auth.uid())` 헬퍼 활용 (2단계에 이미 만들어둠)
- events.select: 소유 캘린더 OR 멤버십 있는 캘린더
- events.insert/update/delete: 소유 OR edit 권한 멤버

## 실시간 동기화 (Realtime)

### 구독 설계

`features/calendar/realtime/subscriptions.ts`:

```ts
useEffect(() => {
  const channel = supabase
    .channel('user-data')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'events' },
      () => router.refresh())
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      () => router.refresh())
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'calendars' },
      () => router.refresh())
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'shared_calendars',
        filter: `member_id=eq.${userId}` },
      () => router.refresh())
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [userId])
```

- 단순 전략: 모든 변경 알림에 `router.refresh()` — RSC가 새 데이터 다시 가져옴
- 정교화 (다음 단계): 변경 payload 분석해서 캘린더 그리드만 부분 업데이트

### 충돌 / 중복 방지

- 내 변경: useOptimistic → Server Action 응답 → revalidatePath → router 캐시 무효화
- 다른 변경: Realtime push → router.refresh
- 두 경우 모두 결국 같은 RSC 재페치로 수렴. 중복 호출은 React가 디듀프함.

### 연결 관리

- 탭 비활성 → 활성 시: Supabase SDK 가 자동 reconnect
- 끊김 표시: 페이지 상단 작은 인디케이터(다음 폴리시 단계로 미룸)

## 에러 처리

| 상황 | 처리 |
| --- | --- |
| Server Action 실패 | useOptimistic 자동 롤백 + sonner toast "저장 실패. 다시 시도해주세요" |
| 일정 0개 | 그리드 정상 표시, 빈 셀만 |
| 할 일 0개 (/todos) | "오늘 할 일이 없어요. 천천히 하세요." + 입력 인풋만 |
| RLS 위반 | 발생 가능성 0 (서버 검증). fallback: "권한 없음" 토스트 + 캘린더 목록으로 리다이렉트 |
| Realtime 끊김 | 자동 재연결, 사용자에게 노출 X (다음 폴리시) |
| 미가입자 초대 시도 | "가입된 사용자만 초대 가능" 인라인 에러 |

## 새 의존성

| 패키지 | 용도 |
| --- | --- |
| `@fullcalendar/react` + `daygrid` + `timegrid` + `interaction` | 캘린더 그리드 + DnD |
| `korean-lunar-calendar` | 양력↔음력 변환 |
| `emoji-mart` + `@emoji-mart/data` + `@emoji-mart/react` | 이모지 픽커 |
| `sonner` | toast 알림 |
| shadcn 추가: `alert-dialog`, `popover`, `checkbox`, `tabs`, `sonner` | UI 컴포넌트 |

## 테스트 (수동) 체크리스트

- [ ] 로그인 → `/calendar` 진입 → 월간 그리드 표시
- [ ] 셀 빈 영역 클릭 → 일정 생성 → 그리드에 즉시 표시
- [ ] 일정 클릭 → 상세 → 수정 → 변경 반영
- [ ] 일정 삭제 → 확인 다이얼로그 → 그리드에서 제거
- [ ] 일정을 다른 날로 드래그 → 날짜 변경 + DB 반영
- [ ] 월 이동: 버튼/키보드/모바일 스와이프 3가지 모두 동작
- [ ] 새 캘린더 생성 → 12색 픽커 → 픽커 우측 드롭다운에 추가됨
- [ ] 캘린더 보이기 토글 → 해당 색 일정 숨김
- [ ] 할 일 추가 → 셀 + `/todos` 양쪽에 표시
- [ ] 할 일 체크 → 회색 취소선 + DB 반영
- [ ] 어제까지 미완료 할 일 → 오늘 `/todos` "밀린" 섹션에 N일 밀림 배지로 표시
- [ ] 5/1 (음력 3/14) 셀에 음력 표시 X
- [ ] 다음 음력 1일 셀에 "음 N/1" 표시
- [ ] 5/5 어린이날 셀: 날짜 빨강, "어린이날" 빨강 배지
- [ ] 5/21 소만 셀: "소만" 회색 배지
- [ ] 이모지 선택 → 일정 막대 앞에 표시
- [ ] 가족에게 캘린더 초대 → 수락 → 가족 화면에 캘린더 보임
- [ ] 가족이 일정 추가 → 내 화면 자동 갱신 (실시간)
- [ ] 모바일 화면 (375px 기준) 에서 그리드 + 사이드 메뉴 정상
- [ ] 다크 모드에서 가독성 유지

## 이후 단계 미리보기

- 4단계: 가계부 통합 (events.expected_amount + expenses 테이블 활용)
- 5단계: 자연어 일정 등록 (AI)
- 6단계: 외부 캘린더(Google·네이버·카카오) 가져오기
- 7단계: 위치/지도 + 푸시 알림
- 8단계: 꾸미기 (스티커팩, 셀 데코)

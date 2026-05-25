# 다음 세션 메모

> 작성일: 2026-05-25 (세 번째 세션 — 옵션 B + 옵션 C 일부)

## 현재 진행 상황 (지금까지)

### 이번 세션 (세 번째) 추가 완료

**옵션 B — 자잘한 보완**
- `theme.css` 의 dead `.fc-toolbar-*` CSS 35줄 제거
- 모달 모바일 검증 (ExpenseModal / SubscriptionModal) — 양호, fix 불필요
- leaveCalendar UX: RLS 보강 (`shared_calendars` member self-delete 정책) + 액션 실구현 + "나가기" 버튼 + 후속 UI 갱신 fix

**옵션 C — 큰 작업 진입**
- "하루" 메뉴 흡수: `lib/nav.ts` 의 navItems 에서 제거 + CalendarShell 의 월간/일간 토글 모바일에서도 노출 (라우트 `/day` 자체는 유지)
- EventModal 새 일정 기본 "종일" OFF — 시간 입력이 default, 일간 view 시간 슬롯에 자동 표시
- **위젯 메인 화면 (큰 작업)** — brainstorming → spec → plan → implementation → polish
  - 새 메인 페이지 `app/(app)/page.tsx` (root `/`). 위젯 6개 grid
  - 위젯: 오늘 일정 / 다가오는 7일 / 이번 달 지출+목표 / 카테고리별 지출 / 오늘 할 일 / 받은 초대
  - DB: `profiles.widget_visibility jsonb` 마이그레이션 (사용자가 SQL editor 로 적용 완료)
  - 보임/숨김: `/settings` 의 "메인 위젯" 섹션 (6 체크박스, DB 동기)
  - 사이드바 nav: 첫 항목 "홈" 추가
  - 모바일 탭바: **홈 / 할 일 / 가계부 / 더보기** (캘린더는 더보기 드로어에서)
  - polish: 카드 hover + 클릭 진입 + 데이터 강조 (3xl 카운트) + 빈 상태 큰 아이콘 + `오늘 일정` 만 데스크탑 2col span

### 누적 완성 영역 (전체)
- 인증 (이메일/카카오/구글 OAuth)
- **메인 화면** = 위젯 페이지 (root `/`)
- 캘린더 (월간/일간, 일정 CRUD, 공휴일, 음력, 24절기, 멀티데이)
- 할 일 (포커스 모드)
- 다중 캘린더 + 공유 캘린더 (초대/권한/Realtime/나가기)
- 가계부 풀스택 (월간/구독/예산/캘린더 통합/자연어 파서/예상 지출)
- 모바일 반응형 (드로어, 탭바 4개, 헤더, 모달 검증)
- /settings (계정·테마·캘린더·메인 위젯)
- 환경: dev `next dev --turbo` 영구화, Next 14.2.35 (보안 패치)

---

## 다음 세션 작업 후보 — 옵션 C 남은 큰 작업

| 후보 | 분량 | 비고 |
| --- | --- | --- |
| 알림 시스템 | 큼 | 일정 N분 전 / 구독 결제일 알림 + 인앱 알림 센터. PWA 푸시는 v1 제외 — 화면 내 토스트 + 알림 페이지. brainstorming 한 라운드 권장 |
| 자유 메모 / 공유 게시판 | 가장 큼 | 새 도메인 (스키마 + RLS + UI 전부 신규). brainstorming 필수 |
| 위젯 추가 발견 (옵션) | 작음 | 만약 메인 화면 쓰면서 미세 보정 원하면 (위젯 순서 변경, 추가 위젯 등). 작은 패치 |

### 추천: 알림 시스템 먼저

- 이미 만들어둔 일정·구독·할일 데이터를 한 흐름으로 연결 — 사용자 체감 큰 가치
- 자유 메모/게시판 은 새 도메인이라 더 큰 작업이라 베타 후로 미뤄도 OK

---

## 환경 메모

- dev 서버: `pnpm dev` — 자동으로 Turbopack
- 포트 3000 안되면 3001 fallback
- 좀비 dev 정리: `Get-Process node | Stop-Process -Force`
- 알약 예외 폴더 등록 + Turbopack 으로 `.next` 잠금 회피 (영구)

### Supabase 마이그레이션 적용 메모
- `supabase/migrations/` 에 파일 추가만으로는 DB 적용 안 됨
- 옵션 1 (가장 빠름): 대시보드 SQL editor 에 직접 실행
  - https://supabase.com/dashboard/project/rkqtcuaifhwyyzbavhio/sql
- 옵션 2: `pnpm exec supabase db push` (사전 link 필요)

### types/database.ts 동기화
- 마이그레이션 적용 후 `pnpm db:types` 재생성 권장
- 임시 수동 추가도 가능 (오늘 widget_visibility 처럼)

---

## 알려진 작은 결함
- 다크/라이트 양쪽 테마 점검 안 함 (지금까지 다크만 검증)
- 가로 회전 (landscape) 안 봄
- 그 외 떠오르는 결함 없음

---

## 내일 시작할 때 추천 첫 프롬프트

> "NEXT_SESSION.md 읽고 알림 시스템 brainstorming 부터 시작해줘"

또는 가벼운 작업 원하면:
> "NEXT_SESSION.md 읽고 메인 화면(홈) 위젯에 추가/수정 원하는 것 정리해줘"

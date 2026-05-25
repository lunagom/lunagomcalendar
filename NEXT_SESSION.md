# 다음 세션 메모

> 작성일: 2026-05-25 (두 번째 세션)

## 현재 진행 상황 (지금까지)

### 오늘 추가 완료 (옵션 B 자잘한 보완)
- 묶음 1 — `theme.css` 의 dead `.fc-toolbar-*` CSS 35줄 제거 (CalendarHeaderBar 도입 후 사용처 없음)
- 묶음 2 — 모달 모바일 검증 (ExpenseModal / SubscriptionModal, 375/414/768) — **양호, fix 불필요**
- 묶음 3 — leaveCalendar UX
  · DB: `shared_calendars` delete 정책에 `member self-delete` 추가 (RLS 보강)
  · 코드: `leaveCalendar` 실구현, `declineInvite` 도 member 권한으로 동작
  · UI: "함께 보는 캘린더" 행에 "나가기" 버튼 + DeleteConfirmDialog
  · 후속 fix: `revalidatePath("/", "layout")` + `router.refresh()` + `.select()` 결과 검증 (silent fail 차단)

### 누적 완성 영역 (전체)
- 인증 (이메일/카카오/구글 OAuth)
- 캘린더 (월간/일간, 일정 CRUD, 공휴일, 음력, 24절기, 멀티데이)
- 할 일 (포커스 모드)
- 다중 캘린더 + 공유 캘린더 (초대/수락/거절/권한 변경/멤버 제거/나가기, Realtime 동기화)
- 가계부 풀스택 (월간/구독/예산/캘린더 통합/자연어 파서/예상 지출)
- 모바일 반응형 (사이드바 드로어, 탭바 정리, 헤더, 모달 — ExpenseModal/Subscription 검증 완료)
- /settings 페이지

---

## 다음 세션 작업 후보 — 옵션 C (새 큰 작업)

옵션 B 가 다 끝나서 **베타 출시 가능한 코어** 도달. 다음은 부가 기능.

README "다음 단계" 후보:
- **알림 시스템** — 일정 N분 전 / 구독 결제일 알림 등. PWA 푸시는 v1 제외 결정됐으니 화면 내 토스트 + 인앱 알림 센터 정도
- **위젯 커스터마이징** — 사이드바 또는 대시보드 위젯 (오늘의 일정, 이번 주 지출 등)
- **자유 메모 / 공유 게시판** — 캘린더와 별개의 메모/게시판 기능
- **"하루" 메뉴 흡수** — 캘린더 헤더의 월간/일간 토글로 합치고 사이드바/탭바 에서 "하루" 항목 제거

### 추천 시작 순서
1. **"하루" 메뉴 흡수** (가장 작음, 정리 성격) → 메뉴 슬림화
2. **알림 시스템** (구체적, 가시 가치 큼)
3. **위젯 / 자유 메모** (가장 큰 작업, 베타 후 또는 사용자 피드백 받고)

---

## 환경 메모

- dev 서버: `pnpm dev` — 자동으로 Turbopack (`next dev --turbo`)
- 포트 3000 안되면 3001 fallback
- 좀비 dev 정리: `Get-Process node | Stop-Process -Force`
- 알약 예외 폴더 등록되어 있음 → `.next` 잠금 회피 (Turbopack 이 영구 회피책)
- webpack 메모리 캐시 모드는 `next.config.mjs` 에 남아있지만 dev 모드에선 Turbopack 가 무시 (build 모드용)

### Supabase 마이그레이션 적용 메모
- 마이그레이션 파일을 `supabase/migrations/` 에 추가만 하면 git 추적되지만 **실제 DB 에는 적용 안 됨**. 별도 액션 필요:
  - 옵션 1: 대시보드 SQL editor 에 직접 실행 (가장 빠름)
    `https://supabase.com/dashboard/project/rkqtcuaifhwyyzbavhio/sql`
  - 옵션 2: `pnpm exec supabase db push` (CLI, 사전에 `supabase link --project-ref rkqtcuaifhwyyzbavhio` 필요)

---

## 알려진 작은 결함
- 점검 못한 항목 (옵션 B 외): 다크/라이트 테마 양쪽 검증, 가로 회전 (landscape)
- 그 외 떠오르는 결함 없음 — 베타 가능 상태

---

## 내일 시작할 때 추천 첫 프롬프트

> "NEXT_SESSION.md 읽고 옵션 C 중 '하루' 메뉴 흡수부터 진행해줘"

또는 큰 작업 들어가고 싶으면:
> "NEXT_SESSION.md 읽고 옵션 C 중 알림 시스템부터 진행해줘"

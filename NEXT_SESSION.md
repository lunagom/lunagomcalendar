# 다음 세션 메모

> 작성일: 2026-05-25

## 현재 진행 상황 (지금까지)

### 오늘 추가 완료
- 멀티데이 옵션 B (주 단위 absolute 막대, GoogleCalendar 패턴)
- 예상 지출 표시 (EventDetailDialog)
- README 업데이트 (Stage 1~5 진행 현황 + 폴더 구조)
- 공유 캘린더 (/social) — 초대/권한/Realtime 동기화
- OpenTelemetry 의존성 정리 (Turbopack 호환)
- /settings 페이지 (계정·테마·연결된 캘린더)
- Next.js 14.2.35 + dev turbo 영구화

### 누적 완성 영역 (전체)
- 인증 (이메일/카카오/구글 OAuth)
- 캘린더 (월간/일간, 일정 CRUD, 공휴일, 음력, 24절기, 멀티데이)
- 할 일 (포커스 모드)
- 다중 캘린더 + 공유 캘린더 (초대/권한/Realtime)
- 가계부 풀스택 (월간/구독/예산/캘린더 통합/자연어 파서/예상 지출)
- 모바일 반응형 (사이드바 드로어, 탭바 정리, 헤더 등)
- /settings 페이지

---

## 다음 세션 작업 후보

### 옵션 B: 자잘한 보완 (분량 보통)
- leaveCalendar UX — member 가 직접 나가기 (현재는 owner 가 제거해줘야 함. RLS delete 정책 member 포함하도록 보강 필요)
- `theme.css` 안 쓰는 `fc-toolbar-*` CSS 청소 (묶음 2 이후 FC headerToolbar 비활성된 후 dead code)
- 점검 못한 모달 모바일 검증 (ExpenseModal, SubscriptionModal)
- 다크/라이트 양쪽 테마 점검 (지금까지 다크만 검증)

### 옵션 C: 새 큰 작업 (분량 큼)
README "다음 단계" 후보:
- 알림 시스템
- 위젯 커스터마이징
- 자유 메모, 공유게시판 기능 추가
- '하루' 메뉴 삭제하기 (캘린더 헤더의 월간/일간 토글로 흡수)

### 추천: B 먼저 → C 진입
- B 는 모바일 마무리 성격, 빠르게 끝남
- 진짜 베타 출시 가능한 상태 만들고 C 로 가는 게 좋음

---

## 환경 메모

- dev 서버: `pnpm dev` — 자동으로 Turbopack (`next dev --turbo`)
- 포트 3000 안되면 3001 fallback
- 좀비 dev 정리: `Get-Process node | Stop-Process -Force`
- 알약 예외 폴더 등록되어 있음 → `.next` 잠금 회피 (Turbopack 이 영구 회피책)
- webpack 메모리 캐시 모드는 `next.config.mjs` 에 남아있지만 dev 모드에선 Turbopack 가 무시 (build 모드용)

---

## 알려진 작은 결함
- 옵션 B 의 항목들 (leaveCalendar UX, theme.css dead code, 모달 모바일 검증, 라이트 테마 점검) 외 별도로 떠오르는 것 없음

---

## 내일 시작할 때 추천 첫 프롬프트

> "NEXT_SESSION.md 읽고 옵션 B 항목들부터 정리해줘"

또는 큰 작업 들어가고 싶으면:
> "NEXT_SESSION.md 읽고 옵션 C 중 알림 시스템부터 진행해줘"

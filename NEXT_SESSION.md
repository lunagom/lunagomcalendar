# 다음 세션 메모

> 작성일: 2026-05-26 (오늘 세션 — 시간 버그 픽스 + 수입 기능 풀스택)

## 현재 진행 상황 (오늘까지)

### 오늘 추가 완료

**시간 버그 픽스** (오전)
- 일정 수정 모달에서 시간이 -9시간씩 어긋나던 버그 해결
- 원인: UTC ISO 문자열을 `.slice(0,16)` 으로 단순 자르기 → datetime-local 에 그대로 주입 → KST 기준 -9h 시프트, 누적 시 "랜덤"으로 보임
- 픽스: `lib/datetime.ts` 의 `isoToLocalInput` / `isoToLocalDateKey` helper 로 통일. 부수 버그(MonthGrid 셀 그룹핑, multi-day 주별 분할, expense paid_at) 까지 같은 helper 로 정리
- 테스트: `lib/datetime.test.ts` 8 케이스 (라운드트립)

**수입(income) 기능 풀스택** (오후)
- DB: **별도 `incomes` + `recurring_incomes` 테이블 신설** (기존 expenses 무영향). RLS + partner_id 트리거 재사용
- UI: ExpenseModal → **TransactionModal 리네임 + [지출][수입] 탭 통합** (discriminated union props)
- 월 요약: `MonthSummaryWidget` — 순수익(큰 글씨) + 수입/지출 보조 카드 (데스크톱 3 카드 / 모바일 1 카드 압축)
- 캘린더 셀: 그날 순수익 한 줄 (양수 초록, 음수 빨강) — `formatDelta` 부호 표기 (색맹 대응)
- 정기 수입 탭 추가: `월간 / 정기 결제 / 정기 수입 / 예산` 4 탭
- 자연어 파서: `parseIncome` 분리 + 수입 키워드 사전 (월급/투자/코인/부수입/기타)
- 한국 가계부 표준 색: 수입 `#16A34A` (다크 `#4ADE80`) / 지출 `#DC2626` (다크 `#F87171`)
- 흑자 격려: 순수익 > 0 일 때만 헤더 옆 작게 "이번 달 흑자네요 ✨"
- **홈 위젯에 월 요약 추가** — `MonthSummaryWidget` (활성 정기 결제/수입 합산)
- 정리: 홈에서 "이번 달 지출" + "카테고리별 지출" 위젯 제거 (월 요약이 대체)
- 카테고리 풀 type 분리: 수입 모달에 지출 preset 안 보이게 (cross-contamination 방지)

### 누적 완성 영역 (MVP 거의 완성)
- 인증 (이메일/카카오/구글 OAuth)
- **메인 홈** = 위젯 페이지 (오늘 일정 / 다가오는 일정 / **이번 달 월 요약** / 오늘 할 일 / 받은 초대)
- 캘린더 (월간/일간, 일정 CRUD + DnD, 공휴일, 음력, 24절기, 멀티데이)
- 할 일 (포커스 모드, 자동 이월)
- 다중 캘린더 + 공유 캘린더 + 게시판 + 알림
- **가계부 풀스택 (지출/수입 통합 모달, 구독, 정기 수입, 예산, 캘린더 통합, 자연어 파서, 부부 공유)**
- 모바일 반응형 (사이드바 드로어, 탭바, 가로 스크롤 탭)
- `/settings` (테마 / 위젯 보임-숨김 / 부부 연결)
- 마스코트 캐릭터(루나곰) — 일부 진입점에 적용
- 배포: Vercel 자동 배포 + Sentry + Web Analytics + keepalive cron

---

## 내일 작업 계획 — 안드로이드 앱 전환 전 최종 정비

### Phase 1: 전반적 오류 점검 (오전)
- 실제 배포된 https://lunabear-calendar.vercel.app 에서 주요 시나리오 테스트
  - 회원가입 → 로그인 → 일정 등록 → 수정 → 삭제
  - 수입/지출 등록 → 카테고리별 통계
  - 구독 트래커, 정기 수입 등록 + 활성 토글
  - 공유 캘린더 초대 → 수락 → 권한 확인
  - 부부 가계부 공유 → partner 화면에서 동기 확인
  - 모바일 환경 (375 / 414) 에서 동일 시나리오
- 발견된 버그 우선순위 매기기 (🔴 블로커 / 🟡 중간 / 🟢 사소)
- 콘솔 에러/경고 0 개 목표 (Sentry 도 같이 모니터링)

### Phase 2: 기능 정리 (오후)
- 너무 복잡한 기능 검토
  - 사용자 입장에서 진입 장벽 높은 화면 있는지
  - "이 기능 정말 필요한가?" 다시 보기
- 정리/제거 후보:
  - 사이드바 "새 일정" 버튼 — 디스에이블 상태면 차라리 제거
  - 헤더 검색 박스 — 의도된 미구현이면 v2 로 이동
  - `/day` 메뉴 — 캘린더 내부 토글로 이미 흡수 됐으니 라우트 자체 제거 검토
- 추가하면 좋을 기능 검토
  - 베타 사용자 피드백 받을 채널 (예: 헤더에 "의견 보내기" 버튼)
  - 빈 상태 안내 (첫 일정/지출 등록 유도) — 루나곰 캐릭터로
  - 온보딩 흐름 (첫 가입 후 안내 3-4 step)
  - 카테고리 아이콘 적용 — spec 11.2 에 정의되어 있는데 v1 에선 색만 적용. 칩 옆에 lucide-react 아이콘 추가

### Phase 3: 안드로이드 앱 전환 준비
- 전환 방식 결정 — **추천: PWA + TWA** (아래 솔직한 의견 참조)
- 앱 전환 체크리스트
  - 앱 아이콘 (루나곰 캐릭터 활용)
  - 스플래시 화면
  - PWA manifest (`public/manifest.json` + `app/layout.tsx` 메타)
  - Service Worker (오프라인 캐싱 — Next.js 와 같이 쓰는 패턴)
  - 푸시 알림 (Firebase Cloud Messaging — 구독 알림, 일정 알림)
  - 앱 권한 (알림)
  - `assetlinks.json` (Digital Asset Links)
  - Bubblewrap 으로 APK 빌드
  - Google Play 등록 (개발자 계정 25 USD)

---

## 환경 메모

- **dev 서버**: `pnpm dev` (포트 3000 점유 중이면 3001 자동)
- **배포**: Vercel (https://lunabear-calendar.vercel.app, main 푸시 자동 배포)
- **DB (운영)**: Supabase prod `rhtnszvdeqmacwawnznj`
- **DB (로컬 dev)**: 옛 프로젝트 `rkqtcuaifhwyyzbavhio` 가리킴 (.env.local) — partnerships 등 일부 마이그레이션 누락 상태
- **알약 예외폴더** 등록되어 있음 → `.next/` 잠금 회피
- Turbopack 영구 (`next dev --turbo`)
- Sentry + Vercel Analytics + Vercel Cron (`/api/keepalive` 매일 1회)

---

## 알려진 작은 결함 (이월)

### 🟡 중간
- **supabase CLI 잘못 링크됨**: `--linked` 가 옛 dev 프로젝트 (`rkqtcuaifhwyyzbavhio`) 가리킴. `pnpm db:types` 실행 시 prod 와 정합 안 되는 타입이 생성됨 → 회귀 (partner_id 컬럼 제거 등). 현재 `types/database.ts` 는 수동 추가로 우회 중. **베타 전 정리 필요**.
- **로컬 dev 환경 분리 미완**: 옛 dev 프로젝트와 prod 프로젝트가 다른데 dev 프로젝트엔 partnerships / notifications 등 최신 마이그레이션 일부만 적용. 로컬에서 부부 공유 등 일부 기능 테스트 불가. 새 dev 프로젝트 만들거나 옛 dev sync 작업 필요.

### 🟢 사소
- **카테고리 아이콘 미구현**: spec 11.2 에서 정의 (Briefcase / TrendingUp / Bitcoin / PlusCircle / MoreHorizontal). v1 에선 색만 적용. 칩 옆에 아이콘 붙이면 더 깔끔.
- **정기 수입/결제 자동 인스턴스 미생성**: 매월 수령일이 와도 자동 INSERT 안 됨. 표시 + 합계만. v2 에서 cron 으로 처리 검토.
- **수입 알림 미구현**: 정기 수입 수령일 알림은 future (구독 due 와 유사하게).

---

## 5. 안드로이드 전환에 대한 솔직한 의견

3 옵션 비교 (시간/비용/유지보수 관점):

| 옵션 | 시간 | 비용 | 유지보수 | 적합도 |
|---|---|---|---|---|
| **PWA + TWA (Bubblewrap)** | 2-3 일 | 25 USD (Play 등록) | 동일 (웹 코드 그대로) | 🌟 **최선** |
| Capacitor | 1-2 주 | 25 USD | 두 환경 (네이티브 + 웹) | 중간 |
| React Native 재작성 | 1-2 개월 | 25 USD | 두 코드베이스 평행 유지 | ❌ |

### 🌟 **PWA + TWA 추천 이유**

1. **현재 코드 거의 그대로 사용**
   - Next.js SSR 그대로, Vercel 호스팅 그대로
   - TWA = "Chrome 이 우리 웹사이트를 fullscreen 으로 띄우는 APK"
   - 추가 작업: manifest.json + service worker + assetlinks.json + Bubblewrap CLI 로 APK 빌드

2. **Capacitor 의 함정**
   - 우리는 server actions / SSR 을 사용 중. Capacitor 는 정적 빌드 (`next export`) 필요 → server actions 를 모두 API route 로 재작성 필요. 큰 작업.
   - 두 환경(웹/네이티브) 의 차이로 작은 버그 추적이 어려워짐.

3. **React Native 의 함정**
   - 1-2 개월 재작성 시 그동안 웹 기능 추가 동결되거나 두 곳 다 작업.
   - 베타 사용자 수십~수백명 단계엔 과잉 투자.

### 솔직한 우려

PWA + TWA 도 만능 아님:
- iOS 는 푸시 알림 PWA 제약 (Apple) — 안드로이드만 우선 가는 거면 무관
- "앱 다운로드" 라기보다 "북마크된 웹사이트" 라 사용자 인지가 달라질 수 있음 (그래도 Play Store 등록되니 큰 차이 X)
- 베타 거치고 사용자 1만+ 되면 그때 RN 으로 마이그레이션 검토

**결론**: 지금 단계 (베타 출시 + 사용자 피드백) 에서는 PWA + TWA 가 가장 비용 효율적. 안드로이드 + 웹 동시 운영이 자연스러움. RN 은 사용자 검증 끝난 뒤.

---

## 다음 세션 시작 시 첫 프롬프트 안내

```
오늘은 안드로이드 앱 전환 전에 전반적으로 점검하자. 먼저 Phase 1 (오류 점검) 부터.
배포된 https://lunabear-calendar.vercel.app 에서 시나리오 돌릴 건데 — 
체크리스트 표 형식으로 정리해줘. 그리고 각각 결과를 채워나갈게.
```

또는 바로 안드로이드 전환:

```
PWA + TWA 로 안드로이드 전환 시작하자. 단계별 plan 먼저 짜줘 — manifest, service worker,
assetlinks, Bubblewrap 으로 APK 빌드, Play Store 등록까지.
```

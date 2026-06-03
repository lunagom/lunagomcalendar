# 안드로이드 홈 화면 위젯 — 캘린더 + 가계부

**작성일**: 2026-06-03
**대상**: 본인 폰 전용 (Google Play 출시 X)
**플랫폼**: 안드로이드만 (iOS 추후)

---

## 1. 배경과 목표

### 현재 상태
- 웹앱 (Next.js 14 + Supabase) 가 `lunabear-calendar.vercel.app` 에 배포 중
- 안드로이드 앱은 **TWA (Trusted Web Activity, Bubblewrap 빌드)** 로 한 번 완성된 상태 — 본질적으로 "크롬이 우리 웹사이트를 풀스크린으로 띄우는" 구조
- TWA 의 안드로이드 영역은 사실상 비어 있어서, 홈 화면 위젯 같은 네이티브 기능을 추가할 여지가 없음

### 목표
1. 안드로이드 홈 화면 위젯 2개 추가 (캘린더 + 가계부)
2. 향후 푸시 알림/카메라 등 네이티브 기능 확장 가능한 구조로 전환

### 큰 결정: TWA → Capacitor 마이그레이션
위젯/푸시/카메라 등 네이티브 기능을 자연스럽게 추가하려면 TWA 로는 한계가 명확. Capacitor 로 옮기면:
- 기존 웹 코드 (Next.js, Supabase 연동) **그대로** 사용
- 기존 키스토어 / 패키지 ID (`app.lunagom.calendar`) / Asset Links **그대로** 사용 → Play Store 출시 작업 손실 0
- 안드로이드 네이티브 영역에 위젯/푸시 등을 추가할 수 있게 됨

---

## 2. 위젯 1 — 월간 캘린더 위젯

### 사양
- **크기**: 5×6 셀 (홈 화면 거의 한 페이지)
- **야망 레벨**: 🐻🐻 미디엄 — "한 눈에 한 달 일정 분포 보기"

### 화면 구성
```
┌────────────────────────────────┐
│ 2026년 5월       🐻             │  ← 헤더 (월 + 마스코트 24×24dp)
├────────────────────────────────┤
│  일  월  화  수  목  금  토       │  ← 요일 (일/토 색상 구분)
│   1   2   3   4   5   6   7    │
│       •           •            │  ← 일정 점
│   8   9  10  11  12  13  14    │
│   •       •                    │
│  15  16  17  ▣18  19  20  21    │  ← ▣ = 오늘 (파란 배경)
│           •   ••                │  ← 점 여러 개 (최대 3개, 그 이상은 …)
│  22  23  24  25  26  27  28    │
│  29  30  31                     │
│                                 │
└────────────────────────────────┘
```

- **공휴일**: 빨간색 글자
- **토요일**: 파란색 글자
- **일요일**: 빨간색 글자
- **오늘**: 파란색 원형 배경 + 흰 글자
- **일정 점**: 일정 색상 그대로 (최대 3개, 4개 이상이면 가운데 점 + 옆에 작은 숫자)

### 인터랙션
- **위젯 어디든 탭** → 앱의 캘린더 화면 (`/calendar`) 열림
- **날짜별 탭 없음** (미디엄 레벨 결정)
- **좌우 화살표 없음** (미디엄 레벨 결정)

### 데이터
- **소스**: 앱 캐시 (Option A) — 앱이 SharedPreferences 에 저장한 이번 달 일정 데이터를 위젯이 읽음
- **갱신 트리거**:
  1. 앱에서 일정 추가/수정/삭제 시 → 즉시
  2. 안드로이드 OS 가 30분마다 자동
  3. 자정 (날짜 바뀌면 오늘 표시 이동)

---

## 3. 위젯 2 — 가계부 빠른 입력 위젯

### 사양
- **크기**: 5×2 셀 (가로로 긴 띠)
- **야망 레벨**: 🐻🐻 미디엄

### 화면 구성
```
┌────────────────────────────────────────┐
│ 5월 지출 🐻      │  +지출 │ +수입 │ +이체 │
│ 1,240,000원      │        │        │        │
└────────────────────────────────────────┘
```

- 좌측 약 50% — 합계 표시 (월 + 마스코트 20×20dp + 큰 숫자)
- 우측 약 50% — 버튼 3개 (균등 분할)

### 인터랙션
- **합계 부분 탭** → 가계부 화면 (`/expense`) 열림
- **+ 지출 탭** → 앱 열리면서 **지출 입력 모달** 자동 오픈
- **+ 수입 탭** → 앱 열리면서 **수입 입력 모달** 자동 오픈
- **+ 이체 탭** → 앱 열리면서 **이체 입력 모달** 자동 오픈

### 데이터
- **소스**: 앱 캐시
- **갱신 트리거**:
  1. 앱에서 거래 추가/수정/삭제 시 → 즉시
  2. 안드로이드 OS 가 30분마다 자동
  3. 자정 (월이 바뀌면 새 달 합계로 리셋)

---

## 4. 디자인 시스템

### 공통
- **배경**: 흰색 고정 (라이트 모드 — 시스템 다크모드여도 위젯은 흰 배경 유지)
- **투명도**: 사용자가 위젯 길게 눌러 5단계 (0% / 25% / 50% / 75% / 100%) 조절 가능
- **모서리**: 12dp 라운드
- **폰트**: Pretendard (`res/font/pretendard.ttf` 박아넣음)
- **색상**: 기존 앱 디자인 시스템 그대로
  - Primary (오늘 강조): 앱과 동일
  - 카테고리 색: 가계부 카테고리와 동일
- **마스코트 🐻**: 작게 표시 (위젯 1 = 24dp, 위젯 2 = 20dp) — 본 정보 가리지 않게 절제

### 투명도 설정 화면
- 위젯 길게 누르면 안드로이드가 "위젯 구성" 화면을 띄움
- 우리가 만든 작은 액티비티 — 슬라이더 1개 + "적용" 버튼
- 슬라이더: 5단계 (0/25/50/75/100%)
- 적용 → SharedPreferences 에 저장 → 위젯 즉시 갱신

---

## 5. 아키텍처

### 큰 그림 (변경 후)

```
┌─────────────────────────────────────────────────┐
│ Capacitor 안드로이드 앱                            │
│                                                  │
│  ┌──────────────────┐    ┌──────────────────┐  │
│  │ 웹뷰              │    │ 네이티브 영역      │  │
│  │ (Next.js 풀스택)  │    │                  │  │
│  │                  │    │  ┌────────────┐  │  │
│  │ vercel.app 그대로 │    │  │위젯 1      │  │  │
│  │                  │    │  │(Kotlin)    │  │  │
│  │ 사용자가          │    │  └────────────┘  │  │
│  │ 보는 화면          │   │  ┌────────────┐  │  │
│  │                  │ ↔  │  │위젯 2      │  │  │
│  │ ↕                │    │  │(Kotlin)    │  │  │
│  │ Capacitor 플러그인│    │  └────────────┘  │  │
│  │ (캐시 동기화)     │ ↔  │  ┌────────────┐  │  │
│  │                  │    │  │투명도 설정  │  │  │
│  │                  │    │  │(Kotlin)    │  │  │
│  │                  │    │  └────────────┘  │  │
│  └──────────────────┘    └──────────────────┘  │
│           ↓                       ↑              │
│    ┌─────────────────────────────────────┐      │
│    │ SharedPreferences (폰 내부 저장소)    │      │
│    │  - widget_calendar : 일정 JSON       │      │
│    │  - widget_expense  : 합계 + 시각      │      │
│    │  - widget_opacity  : 투명도 0~100    │      │
│    └─────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
                ↓ HTTPS
            Supabase
```

### 데이터 흐름 (옵션 A — 캐시 방식)

**사용자가 앱에서 일정 추가 시:**
1. 웹뷰에서 Next.js Server Action 호출 → Supabase 에 일정 저장 ✅ (기존 흐름 그대로)
2. 저장 성공 후 클라이언트에서 Capacitor 플러그인 호출:
   - `WidgetCache.set('widget_calendar', { events: [...] })`
3. 플러그인이 SharedPreferences 에 JSON 저장
4. 플러그인이 `AppWidgetManager.notifyAppWidgetViewDataChanged()` 호출 → 위젯 즉시 다시 그려짐

**위젯이 깨어날 때 (OS 30분 주기 또는 갱신 신호):**
1. `onUpdate()` 콜백 진입
2. SharedPreferences 에서 `widget_calendar` 읽음
3. 데이터 없으면 → "앱을 한 번 열어주세요" 안내 (작은 글씨)
4. 데이터 있으면 → RemoteViews 로 한 달 그리드 그림

### 인텐트 처리 (위젯 → 앱 모달 자동 열기)

위젯 2 의 [+ 지출] 버튼 탭 시:
1. 위젯이 만든 `PendingIntent` 가 앱을 띄움
   - 인텐트 extra: `widget_action=open_expense_modal`
2. Capacitor 메인 액티비티가 인텐트 받음 → 자바스크립트로 전달
3. 웹뷰가 URL 변경 또는 이벤트 처리:
   - `/expense?modal=expense` 같은 형태
4. 페이지가 마운트되면 쿼리스트링 보고 모달 자동 오픈

---

## 6. 컴포넌트 분해

### 추가할 안드로이드 네이티브 파일

`android/app/src/main/java/app/lunagom/calendar/` 아래:

| 파일 | 책임 |
|---|---|
| `CalendarWidgetProvider.kt` | 위젯 1 의 `AppWidgetProvider`. `onUpdate` 에서 캐시 읽고 RemoteViews 그림. |
| `ExpenseWidgetProvider.kt` | 위젯 2 의 `AppWidgetProvider`. 합계 표시 + 4개 PendingIntent 등록. |
| `WidgetConfigActivity.kt` | 투명도 설정 액티비티. 슬라이더 + 적용 버튼. |
| `WidgetCachePlugin.kt` | Capacitor 자체 플러그인. JS 에서 `WidgetCache.set/get/notify` 호출 받아 SharedPreferences 다룸. |
| `MainActivity.kt` (수정) | 인텐트 받아서 자바스크립트로 전달하는 로직 추가. |

`android/app/src/main/res/` 아래:

| 파일 | 책임 |
|---|---|
| `layout/widget_calendar.xml` | 위젯 1 의 RemoteViews 레이아웃 (헤더 + 그리드). |
| `layout/widget_expense.xml` | 위젯 2 의 RemoteViews 레이아웃 (합계 + 버튼 3개). |
| `layout/widget_config.xml` | 투명도 설정 화면. |
| `xml/widget_calendar_info.xml` | 위젯 1 메타데이터 (크기 5×6, 갱신 주기 30분 등). |
| `xml/widget_expense_info.xml` | 위젯 2 메타데이터 (크기 5×2). |
| `font/pretendard.ttf` | 한글 폰트 파일. |
| `drawable/widget_background.xml` | 라운드 + 투명도 적용 가능한 배경 셰이프. |

### 추가할 자바스크립트 파일

`plugins/widget-cache/` (Capacitor 플러그인 패키지):
- `src/definitions.ts` — `WidgetCache` 인터페이스 정의
- `src/web.ts` — 웹 환경에서는 no-op
- `src/index.ts` — registerPlugin 호출
- `android/src/main/java/.../WidgetCachePlugin.kt` — 위 파일 참조

`features/widgets/` (앱 내 신규):
- `sync.ts` — `syncCalendarCache()`, `syncExpenseCache()` 함수. Server Action 응답 후 호출.
- `WidgetSyncProvider.tsx` — 앱 마운트 시 한 번 전체 캐시 동기화. 또는 React Query/SWR mutation 성공 콜백에 끼움.

### 수정할 기존 파일

| 파일 | 변경 |
|---|---|
| `package.json` | `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` 의존성 추가 |
| `capacitor.config.ts` (신규) | Capacitor 설정. `server.url = "https://lunabear-calendar.vercel.app"` 로 원격 모드 사용 |
| `next.config.mjs` | Capacitor 환경 감지 시 Service Worker 비활성화 분기 (또는 SW 건드리지 않고 두는 방식) |
| `features/expense/server/actions.ts` | 거래 추가/수정/삭제 후 `syncExpenseCache()` 호출 |
| `features/calendar/server/actions.ts` | 일정 추가/수정/삭제 후 `syncCalendarCache()` 호출 |
| `app/(app)/expense/page.tsx` | URL `?modal=expense|income|transfer` 받아 모달 자동 오픈 |
| `app/(app)/calendar/page.tsx` | (필요 시) URL 파라미터 처리 |

---

## 7. 마이그레이션 흐름 (TWA → Capacitor)

1. **준비 — 기존 자산 백업** (안전망)
   - `C:\dev\lunabear-android\` (현 TWA 프로젝트) 디렉토리 통째로 백업
   - `android.keystore` 추가 백업 (이미 클라우드/패스워드매니저에 있음)
2. **Capacitor 설치**
   - `pnpm add @capacitor/core @capacitor/cli @capacitor/android`
   - `npx cap init "루나곰 캘린더" "app.lunagom.calendar"`
3. **원격 모드 설정**
   - `capacitor.config.ts` 의 `server.url = "https://lunabear-calendar.vercel.app"` — 웹뷰가 vercel.app 띄움
   - `cleartext: false`, `allowNavigation: ["lunabear-calendar.vercel.app"]`
4. **안드로이드 프로젝트 생성**
   - `npx cap add android`
   - 키스토어를 새 프로젝트의 `android/app/` 에 복사 + `signingConfig` 설정
5. **첫 빌드 + 폰 설치 검증**
   - USB 디버깅 ON → `npx cap run android`
   - 기존 TWA 앱과 같은 화면 뜨고, 로그인까지 동작 확인
6. **OAuth 콜백 / SW 충돌 정리**
   - 카카오/구글 로그인 → 외부 브라우저 → 다시 앱으로 돌아오기 동작 확인
   - 안 되면 deep link 처리 추가
7. **Asset Links 갱신 불필요 확인**
   - 같은 키스토어 사용 → SHA256 동일 → `/.well-known/assetlinks.json` 그대로
8. **위젯 작업 시작** (다음 섹션)

---

## 8. 작업 분량 추정

| 단계 | 시간 | 비고 |
|---|---|---|
| Capacitor 마이그레이션 + 첫 빌드 | 0.5~1일 | 키스토어 이전 포함 |
| 충돌 정리 (SW / OAuth / 빌드) | 1~2일 | 가장 막힐 만한 부분 |
| 위젯 캐시 Capacitor 플러그인 자체 제작 | 0.5일 | SharedPreferences + 갱신 신호 |
| 앱 쪽 캐시 동기화 코드 + URL 모달 라우팅 | 0.5~1일 | actions.ts 수정 + 페이지 처리 |
| 위젯 1 (캘린더, 5×6) | 2일 | RemoteViews 한 달 그리드 + 점 표시 |
| 위젯 2 (가계부, 5×2) | 1.5일 | 합계 + 4개 PendingIntent |
| 투명도 설정 화면 | 0.5일 | ConfigActivity |
| 한글 폰트 박아넣기 + 디자인 다듬기 | 0.5일 | Pretendard 적용 |
| 실기기 테스트 + 버그 잡기 | 1일 | 다양한 시나리오 검증 |
| **합계** | **약 8~10일** | 풀타임 집중 시 / 저녁 작업 시 2~3주 |

---

## 9. 안드로이드 위젯의 제약 (미리 알기)

1. **텍스트 입력 불가** — 위젯 안에 입력창 못 만듦. 그래서 가계부 위젯은 "버튼 누르면 앱 모달 열기" 방식이 최선.
2. **레이아웃 자유도 제한** — RemoteViews 는 일반 안드로이드 레이아웃의 부분집합. 복잡한 애니메이션, 일부 뷰는 못 씀.
3. **갱신 주기 하한 30분** — `updatePeriodMillis` 의 OS 정책상 30분 미만은 무시됨. 더 자주 갱신하려면 다른 방법(앱이 트리거).
4. **기억력 없음** — 위젯은 매번 새로 그려짐. 상태는 외부(SharedPreferences) 에 저장.
5. **다크/라이트 자동 전환은 별도 코드** — 안드로이드가 위젯에 자동 다크 처리를 해주지 않음. 우리는 "라이트 고정" 선택했으니 단순.

---

## 10. 검증 계획

### Capacitor 마이그레이션
- [ ] `npx cap run android` 로 앱 설치, vercel.app 뜸
- [ ] 구글 로그인 동작
- [ ] 카카오 로그인 (현재 hidden 이라 OFF — 검증 필요 없음)
- [ ] 캘린더/가계부 기존 기능 다 동작

### 위젯 캐시 플러그인
- [ ] 앱에서 일정 추가 → SharedPreferences 파일에 JSON 저장됨 (Android Studio Device File Explorer 로 확인)
- [ ] `WidgetCache.notifyWidgets()` 호출 후 위젯 다시 그려짐

### 위젯 1 (캘린더)
- [ ] 위젯 추가 → 한 달 그리드 보임
- [ ] 일정 있는 날 점 표시
- [ ] 오늘 강조 색 (파란 배경)
- [ ] 토(파랑) / 일(빨강) / 공휴일(빨강) 색
- [ ] 위젯 탭 → 앱 캘린더 화면 열림
- [ ] 앱에서 일정 추가 → 위젯 즉시 갱신
- [ ] 자정 넘기면 오늘 표시 다음 날짜로 이동

### 위젯 2 (가계부)
- [ ] 이번 달 지출 합계 표시
- [ ] 합계 탭 → 가계부 화면
- [ ] [+ 지출] → 앱 + 지출 모달 자동 오픈
- [ ] [+ 수입] → 수입 모달
- [ ] [+ 이체] → 이체 모달
- [ ] 앱에서 거래 추가 → 위젯 합계 즉시 갱신
- [ ] 월말 자정 → 새 달 합계로 리셋

### 투명도 설정
- [ ] 위젯 길게 눌러 설정 화면 진입
- [ ] 슬라이더 5단계 동작
- [ ] 적용 → 위젯 즉시 갱신
- [ ] 0% (완전 투명), 50%, 100% 다 정상

### 폰 다크모드 환경
- [ ] 폰 다크모드 켠 상태에서 위젯 흰 배경 유지
- [ ] 투명도 낮춰서 자연스러운지

### 기존 기능 회귀
- [ ] OAuth 로그인 정상
- [ ] 가계부 부부 공유 (지난 세션 작업) 영향 없음
- [ ] 알림 시스템 영향 없음
- [ ] 멀티데이 캘린더 영향 없음

---

## 11. 결정 요약

| 결정 항목 | 선택 |
|---|---|
| 안드로이드 앱 구조 | TWA → **Capacitor** 마이그레이션 |
| 위젯 1 크기 | **5×6** (홈 한 페이지 거의 차지) |
| 위젯 1 야망 | 🐻🐻 **미디엄** (한 달 그리드 + 일정 점, 탭하면 앱) |
| 위젯 2 크기 | **5×2** |
| 위젯 2 야망 | 🐻🐻 **미디엄** (합계 + 빠른 입력 버튼) |
| 위젯 2 버튼 | **3개** (지출 / 수입 / 이체) |
| 데이터 동기화 | **Option A — 앱 캐시 방식** (SharedPreferences) |
| 다크/라이트 | **라이트 고정** + 투명도로 다크 환경 보완 |
| 투명도 조절 | **위젯 자체 설정 화면** (5단계: 0/25/50/75/100%) |
| 마스코트 | 작게 활용 (위젯 1 = 24dp, 위젯 2 = 20dp) |
| 빌드/설치 | 개발 중 USB + 완성 후 APK 사이드로드 병행 |

---

## 12. 관련 자료

- 이전 안드로이드 출시 작업: [[project-lunabear-android-plan]]
- 메인 프로젝트 메모: [[project-lunabear-calendar]]
- 색상 절제 원칙: [[feedback-color-restraint]]
- 비개발자 설명 톤: [[feedback-explain-simply]]

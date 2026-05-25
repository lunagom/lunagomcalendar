# 프로덕션 배포 디자인

> 작성일: 2026-05-25 (브레인스토밍 결과 합의)

## 목적

루나곰 캘린더를 외부 사용자(소규모 베타, 수십~수백 명)가 쓸 수 있도록
**Vercel + 별도 Supabase prod 프로젝트**로 공개. 카카오·구글·이메일 로그인
모두 동작, 에러는 Sentry, 방문은 Vercel Web Analytics 로 추적.

## 합의된 결정

| 항목 | 결정 |
| --- | --- |
| 호스팅 | Vercel Hobby (무료, GitHub 연동 자동 배포) |
| 도메인 | `lunabear-calendar.vercel.app` (무료, 커스텀은 v2) |
| Supabase | **dev/prod 분리** — 현재 프로젝트는 dev 유지, prod 새로 생성 |
| 자동 배포 | `main` 푸시 → 즉시 prod, 다른 브랜치 → preview 자동 |
| OAuth provider | 카카오 + 구글 + 이메일 (Supabase prod에서 활성) |
| 에러 추적 | Sentry (무료 티어, 5k events/월) |
| 방문 분석 | Vercel Web Analytics (무료, 익명) |
| Cron | 없음 — 알림 시드는 진입 시 `seedDailyNotifications` |
| Stage 순서 | A 푸시 → B prod 생성 → C 마이그레이션 → D Vercel → E OAuth → F Sentry+Analytics |

## 환경 분리 그림

```
┌──────────────────────────┐      ┌──────────────────────────┐
│  로컬 (dev)               │      │  Vercel (prod)            │
│  ─ .env.local 의 키       │      │  ─ Vercel 환경변수 의 키  │
│  ─ Supabase dev 프로젝트  │      │  ─ Supabase prod 프로젝트 │
│  ─ Sentry DSN 비워둠      │      │  ─ Sentry DSN 채움        │
│       (no-op)             │      │       (전송 활성)         │
└──────────────────────────┘      └──────────────────────────┘
                                              ▲
                                              │ main 푸시 → 자동 빌드
                              ┌───────────────┴────────────────┐
                              │  GitHub: lunagom/lunagomcalendar │
                              └────────────────────────────────┘
```

코드는 한 벌. 환경(키·DSN)만 갈라짐. dev에는 Sentry DSN 안 넣어서 로컬에선 조용히 no-op.

## Stage A — 푸시 준비

**현재 상태**: `main` 13 커밋 ahead, 작업 디렉토리에 root 레벨 PNG 6개 untracked.

**작업**:
1. `.gitignore`에 `/*.png` 한 줄 추가 — 루트의 스크린샷·캐릭터 원본만 무시.
   `public/lunabear.png`는 `public/` 하위라 영향 없음.
2. `.gitignore` 커밋.
3. `git push origin main`.

**체크포인트**: GitHub 웹에서 최신 커밋 8e4e220 확인.

## Stage B — Supabase prod 프로젝트 생성

**작업** (사용자가 콘솔에서):
1. https://supabase.com/dashboard 에서 **New Project** — 이름: `lunabear-calendar-prod`, 리전: `ap-northeast-2 (Seoul)`, DB password 강력하게.
2. 프로젝트 생성 후 다음 값 메모 (Stage D에서 사용):
   - Settings → API → **Project URL** (`https://xxx.supabase.co`)
   - Settings → API → **anon public** 키
   - Settings → API → **service_role** 키 (절대 노출 금지)
   - URL 의 `xxx` 부분이 **Project ID**

**체크포인트**: 새 프로젝트 대시보드에 SQL Editor 접근 가능.

## Stage C — 마이그레이션 prod 적용

**현재 마이그레이션 11개** (적용 순서대로):

```
20260522103000_initial_schema.sql
20260522103100_rls_policies.sql
20260523120000_tasks_table.sql
20260523120100_events_emoji.sql
20260523130000_default_calendar_color.sql
20260523140000_drop_category_check_constraints.sql
20260523150000_monthly_targets.sql
20260525120000_shared_calendars_member_delete.sql
20260525130000_profiles_widget_visibility.sql
20260525140000_board_tables.sql
20260525150000_notifications.sql
```

**작업** (사용자가 Supabase SQL Editor에서):
- 각 파일을 위에서부터 차례로 열어 SQL Editor에 붙여넣고 Run.
- 순서 중요 — initial_schema → rls_policies → 나머지.
- 한 번에 한 파일씩, 에러 없는지 확인하면서 진행.

**대안 (CLI 익숙하면)**: 로컬에서 `supabase link --project-ref <prod-id>` 후 `supabase db push`로 일괄. 단, dev 프로젝트 link 잃으니 주의.

**체크포인트**: SQL Editor 에서 다음 모두 정상:
- `select count(*) from notifications` → 0 (가장 늦은 마이그레이션 적용 증명)
- `select tablename from pg_tables where schemaname='public' order by tablename` → calendars, events, tasks, board_posts, notifications 등 모두 보임
- `select tablename, rowsecurity from pg_tables where schemaname='public' and rowsecurity=false` → 0행 (RLS 모두 활성)

## Stage D — Vercel 프로젝트 + 환경변수

**작업** (사용자가 Vercel 콘솔에서):
1. https://vercel.com → **New Project** → GitHub `lunagom/lunagomcalendar` import.
2. Framework Preset: Next.js (자동 감지), Build Command/Output 기본값.
3. **Environment Variables** 등록 (Production 환경 체크):
   - `NEXT_PUBLIC_SUPABASE_URL` = prod URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = prod anon
   - `SUPABASE_SERVICE_ROLE_KEY` = prod service_role
   - `SUPABASE_PROJECT_ID` = prod project id
   - `NEXT_PUBLIC_SENTRY_DSN` = (Stage F 에서 받을 값, 일단 비우거나 생략)
   - `SENTRY_AUTH_TOKEN` = (Stage F)
4. **Deploy** 클릭.

**체크포인트**: Vercel 빌드 로그 성공 → `xxx.vercel.app` 접속 → 로그인 페이지 표시.
**이 시점에 OAuth는 아직 안 됨** — Stage E 까지 진행해야 카카오/구글 로그인 가능.

## Stage E — OAuth redirect URL 등록

prod URL이 확정된 다음 진행 (Stage D 직후).

### Supabase prod 콘솔
- Authentication → URL Configuration:
  - **Site URL**: `https://lunabear-calendar.vercel.app`
  - **Redirect URLs** (목록에 추가): `https://lunabear-calendar.vercel.app/auth/callback`
- Authentication → Providers:
  - **Email**: 켜기 (기본)
  - **Google**: 켜고 Google Cloud Console 의 OAuth 클라이언트 ID/시크릿 입력
  - **Kakao**: 켜고 Kakao Developers 의 REST API 키/시크릿 입력

### Google Cloud Console
- APIs & Services → Credentials → OAuth 2.0 Client → **Authorized redirect URIs** 에 추가:
  - `https://<prod-project-id>.supabase.co/auth/v1/callback`
  (Supabase 가 토큰 받는 주소, Vercel 도메인 아님 — 헷갈리기 쉬움)

### Kakao Developers
- 내 애플리케이션 → 제품 설정 → 카카오 로그인 → Redirect URI 에 추가:
  - `https://<prod-project-id>.supabase.co/auth/v1/callback`

**체크포인트**:
- 시크릿 브라우저에서 `https://lunabear-calendar.vercel.app/login` → 이메일 가입 → 메일 인증 → 로그인 성공
- 카카오 로그인 버튼 → 카카오 로그인 → prod URL 로 돌아옴 → 닉네임 표시
- 구글 로그인 동일 시나리오

## Stage F — Sentry + Vercel Analytics + 첫 검증

### Sentry 통합

**새 의존성**:
- `@sentry/nextjs`

**생성 파일**:
- `sentry.client.config.ts` — 브라우저 init
- `sentry.server.config.ts` — Node 서버 init
- `sentry.edge.config.ts` — Edge runtime init
- `instrumentation.ts` (루트) — Next 14 표준, server/edge config 라우팅

**수정 파일**:
- `next.config.mjs` — `withSentryConfig` 로 래핑
- `.env.local.example` — `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` 추가
- `app/global-error.tsx` (신규) — Sentry 에러 캡처 + UI

**Sentry 콘솔** (사용자):
- sentry.io 가입 → New Project → Next.js → 프로젝트명 `lunabear-calendar`
- DSN 복사 → Vercel 환경변수 `NEXT_PUBLIC_SENTRY_DSN`
- Settings → Auth Tokens → 새 토큰 생성 → Vercel 환경변수 `SENTRY_AUTH_TOKEN` (소스맵 업로드용)

**동작 원칙**: DSN 비어 있으면 SDK 가 no-op. 로컬 dev 에선 자연스럽게 비활성.

### Vercel Web Analytics 통합

**새 의존성**:
- `@vercel/analytics`

**수정 파일**:
- `app/layout.tsx` — `<Analytics />` 컴포넌트 1줄 마운트

**Vercel 콘솔**: 프로젝트 → Analytics 탭 → Enable.

### 검증 시나리오

배포 완료 후 시크릿 브라우저로 처음부터:
1. 이메일 회원가입 → 메일 인증 링크 → 로그인 → 일정 1개 추가 → 새로고침 시 유지
2. 카카오 로그인 (다른 시크릿 창) → 닉네임 표시 → 일정 1개 추가
3. 구글 로그인 (또 다른 시크릿 창) → 닉네임 표시
4. 첫 계정에서 두 번째 계정에 캘린더 공유 초대 → 두 번째 계정에서 수락 → 일정 보임
5. 게시판 글쓰기 → 댓글 → 좋아요 → 다른 탭에 Realtime 반영
6. 헤더 종 클릭 → 알림 항목 → 읽음 처리
7. 의도적으로 `/throw-test` 같은 임시 경로에서 에러 발생 → Sentry 대시보드에 도달
8. 24시간 후 Vercel Analytics 에 페이지뷰 카운트 확인

## 보안 점검 체크리스트

배포 전 한 번에 통과:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` 가 `lib/supabase/admin.ts` 외부에서 import 되지 않음
      검증: `grep -r "SUPABASE_SERVICE_ROLE_KEY" --include="*.ts" --include="*.tsx"`
- [ ] `lib/supabase/admin.ts` 가 클라이언트 컴포넌트(use client)에서 import 되지 않음
- [ ] 모든 public 스키마 테이블에 RLS 활성:
      `select tablename, rowsecurity from pg_tables where schemaname='public' and rowsecurity=false`
      → 결과 0행 이어야 함
- [ ] `.env.local`이 `.gitignore` 에 포함 (현 상태 OK)
- [ ] `/*.png` 가 `.gitignore` 에 추가됨 (Stage A)
- [ ] 마이그레이션 11개 prod 적용 확인 — `select count(*) from pg_tables where schemaname='public'` 가 11개 이상
- [ ] Supabase prod Auth 설정에서 **Confirm email** 켜짐 (이메일 인증 강제)
- [ ] Supabase prod RLS 가 dev 와 동일한 정책 가짐 (마이그레이션이 보장)

## 라우트 / 파일 구조 변경

```
sentry.client.config.ts      # 신규 — 브라우저 Sentry init
sentry.server.config.ts      # 신규 — Node Sentry init
sentry.edge.config.ts        # 신규 — Edge Sentry init
instrumentation.ts           # 신규 — Next 14 표준 위치
app/global-error.tsx         # 신규 — 최상위 에러 바운더리 + Sentry 캡처
app/layout.tsx               # 수정 — <Analytics /> 마운트
next.config.mjs              # 수정 — withSentryConfig 래핑
.env.local.example           # 수정 — Sentry 변수 2개 추가
.gitignore                   # 수정 — /*.png 추가
package.json                 # 수정 — @sentry/nextjs, @vercel/analytics 추가
```

## 코드 변경에 영향 받지 않는 것

이미 잘 갖춰진 부분 — 손대지 않음:
- `lib/supabase/server.ts` / `client.ts` / `admin.ts` 분리 (그대로)
- `middleware.ts` 로그인 가드 (그대로)
- 모든 server action 의 `revalidatePath` 패턴 (그대로)
- Realtime listener 컴포넌트 (그대로 — Supabase prod 도 Realtime 기본 활성)

## 위험과 대비

| 위험 | 대비 |
| --- | --- |
| 마이그레이션 누락으로 prod에서 테이블 못 찾음 | Stage C 끝에 테이블 11개 카운트 확인 |
| OAuth redirect URL 누락 — 로그인 후 404 | Stage E 끝에 시크릿 브라우저로 3개 provider 모두 검증 |
| service_role 키 실수로 클라 노출 | 배포 전 grep 검증 + Sentry 가 빌드 시 잡지 못하므로 사람이 확인 |
| Sentry DSN 잘못 입력 → 빌드 실패 | 환경변수 비워두면 SDK no-op, 비활성으로 안전 |
| Vercel 빌드 typecheck 실패 | 사전 로컬 `pnpm typecheck` 통과 후 푸시 |
| Supabase prod Confirm email 꺼져 있어 누구나 가입 | Stage F 검증 직전 Supabase prod Auth 설정 확인 |
| Supabase 무료 티어 — 7일 무활동 시 프로젝트 일시정지 | 베타 사용자 외에 본인이라도 주 1회 접속, 또는 v2 에서 Pro($25/mo) 승급 |

## YAGNI (지금은 안 함)

- 커스텀 도메인 (vercel.app 으로 시작, 베타 검증 후 v2)
- GitHub Actions CI 게이트 (Vercel 빌드가 typecheck 수행)
- 스테이징 환경 (Vercel preview 배포로 충분)
- Plausible/PostHog 등 추가 분석
- Cron 기반 알림 발송 (진입 시 시드로 충분)
- 백업 자동화 (Supabase 무료 티어 일 백업 사용)
- 부하 테스트 (소규모 베타 단계 불필요)

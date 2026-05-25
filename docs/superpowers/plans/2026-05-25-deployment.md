# 프로덕션 배포 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 루나곰 캘린더를 Vercel + 별도 Supabase prod 프로젝트로 외부 사용자 대상 공개.

**Architecture:** 코드 한 벌, 환경(Supabase 키·Sentry DSN·CRON_SECRET)만 dev/prod 분리. Vercel 자동 배포로 `main` 푸시 = prod, 다른 브랜치 = preview. Vercel Cron 일 1회 `/api/keepalive`가 Supabase 무료 일시정지 회피. 에러는 Sentry, 방문은 Vercel Web Analytics.

**Tech Stack:** Next.js 14.2.35, Supabase (Postgres + RLS + Realtime), Vercel Hobby, @sentry/nextjs ^8, @vercel/analytics ^1.

**작업 디렉토리:** `C:\dev\lunabear-calendar` (cwd 와 다름)

**Spec:** `docs/superpowers/specs/2026-05-25-deployment-design.md`

---

## 사전 안내

이 plan 의 **태스크는 두 종류**가 섞여 있어요:

1. **사용자 콘솔 액션** (Stage B/C/D/E 일부) — Supabase·Vercel·카카오·구글 콘솔에서 사용자가 직접 클릭. 코드 변경 없음. 클로드는 명령을 안내하고 사용자가 "완료" 보고 후 다음 태스크로.
2. **코드 변경** (Stage 0/A/F) — 클로드가 파일 작성·수정 + typecheck + 커밋.

각 태스크 끝에 **검증 체크포인트**가 있음. 통과 못 하면 다음 태스크로 진행 금지.

배포 plan 은 TDD 가 잘 안 맞음 — 인프라/콘솔 액션이 많고 단위 테스트로 검증할 수 없는 행위(OAuth 동작, Cron 실행)가 다수. 대신 **각 단계 끝의 실제 시나리오 검증**이 테스트 역할.

---

## 파일 변경 맵 (코드 부분 — Stage F)

```
sentry.client.config.ts             # 신규
sentry.server.config.ts             # 신규
sentry.edge.config.ts               # 신규
instrumentation.ts                  # 신규
app/global-error.tsx                # 신규
app/api/keepalive/route.ts          # 신규
vercel.json                         # 신규
app/layout.tsx                      # 수정 — <Analytics /> 추가
next.config.mjs                     # 수정 — withSentryConfig 래핑
.env.local.example                  # 수정 — Sentry 3개 + CRON_SECRET 추가
.gitignore                          # 수정 — /*.png 추가 (Stage A)
package.json                        # 수정 — @sentry/nextjs, @vercel/analytics 추가
```

---

## Task 1: Stage 0 — service_role 키 누출 검증

**목적:** 코드 어디서도 `SUPABASE_SERVICE_ROLE_KEY` 가 클라이언트 번들에 들어가지 않는지 확인. 단 한 번이라도 누출되면 prod 가 즉시 위험.

**Files:** 없음 — 검증만.

**의존성:** 없음 (가장 먼저).

- [ ] **Step 1: `SUPABASE_SERVICE_ROLE_KEY` 사용처 모두 grep**

```bash
cd /c/dev/lunabear-calendar && grep -rn "SUPABASE_SERVICE_ROLE_KEY" --include="*.ts" --include="*.tsx" .
```

**기대 결과:** `lib/supabase/admin.ts` 단 한 줄만 보임:
```
lib/supabase/admin.ts:15:    process.env.SUPABASE_SERVICE_ROLE_KEY!,
```
다른 결과 있으면 즉시 중단 → 사용자에게 보고.

- [ ] **Step 2: admin.ts 가 "server-only" 표시 가지고 있는지 확인**

```bash
head -3 /c/dev/lunabear-calendar/lib/supabase/admin.ts
```

**기대 결과:** 첫 줄 `import "server-only";` 보임. 없으면 추가 필요.

- [ ] **Step 3: admin.ts import 사용처가 모두 server 컨텍스트인지 확인**

```bash
grep -rn "from \"@/lib/supabase/admin\"" --include="*.ts" --include="*.tsx" /c/dev/lunabear-calendar
```

각 import 파일 상단 5줄을 `head` 로 확인. `"use client";` 가 보이면 즉시 중단 — 그 파일은 클라이언트라 admin import 가 빌드 에러를 일으킴.

```bash
# 예시 (실제 import 경로마다 반복)
head -5 /c/dev/lunabear-calendar/features/social/server/actions.ts
```

**기대:** 모든 import 파일이 `"use server"` 또는 `import "server-only"` 또는 server component (지시문 없음 + app/ 또는 server/ 경로).

검증 통과 → 사용자에게 "service_role 안전 ✓" 한 줄 보고.

---

## Task 2: Stage 0 — RLS 활성 사전 점검 (dev 프로젝트)

**목적:** dev 와 prod 는 동일 마이그레이션 → dev 에서 RLS 활성 확인하면 prod 도 동일하게 됨.

**Files:** 없음 — 검증만.

**의존성:** Task 1 완료.

- [ ] **Step 1: 사용자에게 안내**

> "Supabase dev 프로젝트 대시보드 → SQL Editor 에서 아래 쿼리 실행하고 결과 알려주세요.
>
> ```sql
> select tablename, rowsecurity
> from pg_tables
> where schemaname='public' and rowsecurity=false;
> ```"

- [ ] **Step 2: 결과 확인**

**기대:** 0 행. 행이 있으면 그 테이블의 마이그레이션이 RLS 설정 누락 — 해당 마이그레이션 보강 후 dev 와 prod 모두 적용 필요.

검증 통과 → "RLS 모두 활성 ✓" 보고.

---

## Task 3: Stage A — .gitignore /*.png + 푸시 준비 커밋 + main 푸시

**Files:**
- Modify: `C:\dev\lunabear-calendar\.gitignore`

**의존성:** Task 1, 2 완료.

- [ ] **Step 1: .gitignore 수정**

기존 마지막 줄 `.superpowers/` 다음에 한 블록 추가:

```
# 루트 작업물 (스크린샷·캐릭터 원본 PNG). public/ 안의 이미지는 영향 없음.
/*.png
```

- [ ] **Step 2: 변경 확인**

```bash
cd /c/dev/lunabear-calendar && git status -s
```

**기대:** `M .gitignore` 만 보임 (스크린샷·PNG 들은 더 이상 `??` 안 보여야 함).

- [ ] **Step 3: 커밋**

```bash
cd /c/dev/lunabear-calendar && git add .gitignore && git commit -m "$(cat <<'EOF'
chore: 루트 PNG 무시 — 스크린샷·캐릭터 원본 ignore

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: 푸시 전 로컬 빌드 통과 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

**기대:** 에러 0. 실패 시 즉시 중단 — Vercel 에서도 실패함.

- [ ] **Step 5: main 푸시**

```bash
cd /c/dev/lunabear-calendar && git push origin main
```

**기대 결과:** "X commits pushed" 메시지.

- [ ] **Step 6: GitHub 웹에서 확인**

사용자에게: "https://github.com/lunagom/lunagomcalendar 에서 가장 최근 커밋이 방금 만든 chore 커밋인지 확인 부탁."

---

## Task 4: Stage B — Supabase prod 프로젝트 생성 (사용자 콘솔)

**Files:** 없음 — 사용자 콘솔 액션.

**의존성:** Task 3 완료.

- [ ] **Step 1: 사용자에게 안내**

> 다음 순서로 Supabase 콘솔에서 진행 부탁드려요:
>
> 1. https://supabase.com/dashboard 접속 → 우상단 **New Project**
> 2. **Organization:** 기존 사용중인 것 또는 새로 만들기
> 3. **Project name:** `lunabear-calendar-prod`
> 4. **Database Password:** 강력한 비밀번호 (1Password 등에 저장) — 분실 시 재설정 가능하나 번거로움
> 5. **Region:** `Northeast Asia (Seoul) — ap-northeast-2`
> 6. **Pricing Plan:** Free
> 7. **Create new project** → 2~3분 대기

- [ ] **Step 2: 생성 후 필요한 값 5개 메모**

> 프로젝트 대시보드에서 다음 값 4개 알려주세요 (제가 Stage D 환경변수 등록에 사용):
>
> - **Project URL** (Settings → API → Project URL 박스의 `https://xxx.supabase.co`)
> - **anon public 키** (Settings → API → Project API keys → `anon` 의 `public`)
> - **service_role 키** (Settings → API → Project API keys → `service_role` — 절대 채팅 등에 노출 금지, Vercel 콘솔에만 직접 붙여넣기)
> - **Project ID** (URL의 `xxx` 부분, 예: `abcdefghijklmnop`)
>
> 그리고:
> - SQL Editor 탭 접근 가능한지만 확인

- [ ] **Step 3: 검증**

사용자가 "완료" 보고 → 다음 태스크.

---

## Task 5: Stage C — 마이그레이션 11개 prod 적용 (사용자 콘솔)

**Files:** 없음 — 사용자 콘솔 액션 (SQL Editor).

**의존성:** Task 4 완료.

- [ ] **Step 1: 사용자에게 안내**

> Supabase prod 의 SQL Editor 에서 다음 11개 파일을 **위에서부터 한 개씩** 실행해주세요. 순서 매우 중요:
>
> 1. `supabase/migrations/20260522103000_initial_schema.sql`
> 2. `supabase/migrations/20260522103100_rls_policies.sql`
> 3. `supabase/migrations/20260523120000_tasks_table.sql`
> 4. `supabase/migrations/20260523120100_events_emoji.sql`
> 5. `supabase/migrations/20260523130000_default_calendar_color.sql`
> 6. `supabase/migrations/20260523140000_drop_category_check_constraints.sql`
> 7. `supabase/migrations/20260523150000_monthly_targets.sql`
> 8. `supabase/migrations/20260525120000_shared_calendars_member_delete.sql`
> 9. `supabase/migrations/20260525130000_profiles_widget_visibility.sql`
> 10. `supabase/migrations/20260525140000_board_tables.sql`
> 11. `supabase/migrations/20260525150000_notifications.sql`
>
> 각 파일을 메모장이나 VS Code 로 열어 전체 복사 → SQL Editor 에 붙여넣기 → **Run**.
> 에러 나면 즉시 멈추고 알려주세요.

- [ ] **Step 2: 적용 후 3가지 검증 쿼리 실행**

> 다 끝나면 SQL Editor 에서 다음 3개 쿼리 실행하고 결과 알려주세요:
>
> ```sql
> -- (1) 가장 늦은 마이그레이션 적용 증명
> select count(*) from notifications;
>
> -- (2) 만들어진 public 테이블 모두 보기 (10개 이상 보여야 함)
> select tablename from pg_tables where schemaname='public' order by tablename;
>
> -- (3) RLS 비활성 테이블 — 0 행 이어야 함
> select tablename from pg_tables
> where schemaname='public' and rowsecurity=false;
> ```
>
> **기대:**
> - (1) `0`
> - (2) calendars, events, tasks, board_posts, notifications, profiles 등 다 보임
> - (3) 0 행

- [ ] **Step 3: Auth 설정 사전 확인**

> Authentication → Providers → **Email** → "Confirm email" 켜져 있는지 확인 (기본 켜짐).
> 꺼져 있으면 켜기.

검증 통과 → 다음 태스크.

---

## Task 6: Stage D — Vercel 프로젝트 생성 + 환경변수 + 첫 배포 (사용자 콘솔)

**Files:** 없음 — 사용자 콘솔 액션.

**의존성:** Task 5 완료. Task 4 에서 받은 Supabase prod 키 4개 필요.

- [ ] **Step 1: Vercel 프로젝트 생성**

> 1. https://vercel.com 로그인 (GitHub 계정으로)
> 2. **Add New → Project**
> 3. GitHub 저장소 목록에서 `lunagom/lunagomcalendar` → **Import**
> 4. **Framework Preset:** Next.js (자동 감지됨)
> 5. **Root Directory:** `./` (기본)
> 6. **Build Command:** 비워둠 (Next.js 기본 `next build`)
> 7. **Output Directory:** 비워둠
> 8. **Install Command:** 비워둠 (Vercel 이 pnpm-lock.yaml 감지 → 자동 pnpm install)

- [ ] **Step 2: 환경 변수 등록 (Production 환경 체크)**

> 같은 화면 **Environment Variables** 섹션에서 4개 추가 (Production, Preview, Development **모두 체크**):
>
> | Name | Value |
> | --- | --- |
> | `NEXT_PUBLIC_SUPABASE_URL` | (Task 4 의 Project URL) |
> | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Task 4 의 anon public) |
> | `SUPABASE_SERVICE_ROLE_KEY` | (Task 4 의 service_role) |
> | `SUPABASE_PROJECT_ID` | (Task 4 의 Project ID) |
>
> Sentry/CRON_SECRET 은 Stage F 에서 추가.

- [ ] **Step 3: Deploy**

> **Deploy** 버튼 → 2~4분 빌드 대기.

- [ ] **Step 4: 빌드 결과 확인**

> 빌드 성공하면 화면에 prod URL 표시 (예: `lunabear-calendar-xxx.vercel.app`).
> 빌드 실패 시 로그 끝부분 알려주세요.

- [ ] **Step 5: prod URL 메모 + 도메인 별칭 확정**

> 1. 프로젝트 → **Settings → Domains** 확인. `lunabear-calendar.vercel.app` 이 사용 가능하면 **Add** (점유되어 있으면 가장 깔끔한 대안 선택, 예: `lunabearcalendar.vercel.app`).
> 2. 최종 prod URL 알려주세요 — Stage E 의 OAuth 등록에 사용.

- [ ] **Step 6: 빌드 완료 검증**

> 브라우저로 prod URL 열어보세요.
> **기대:** 로그인 페이지가 보임. (OAuth 는 아직 안 됨 — Stage E 까지 진행 필요.)
> 이메일 가입 시도해도 OK 지만 로그인은 Confirm email 후 가능.

---

## Task 7: Stage E — OAuth provider redirect URL 등록 (사용자 콘솔)

**Files:** 없음 — 사용자 콘솔 액션 (Supabase + Google Cloud + Kakao Developers).

**의존성:** Task 6 완료. Stage D 의 prod URL + Supabase prod Project ID 필요.

- [ ] **Step 1: Supabase prod Authentication 설정**

> Supabase prod → **Authentication → URL Configuration**:
> - **Site URL:** `https://<prod-도메인>` (예: `https://lunabear-calendar.vercel.app`)
> - **Redirect URLs** 에 추가: `https://<prod-도메인>/auth/callback`
>
> **Save** 클릭.

- [ ] **Step 2: Supabase prod Providers 활성화**

> Authentication → Providers:
> - **Email:** 켜짐 확인 (기본)
> - **Google:** 토글 켜고 Client ID, Client Secret 입력 (다음 Step 에서 얻음). 이미 dev 에서 동일 OAuth 앱을 쓰고 있다면 같은 값 사용 가능 — 단 Step 3 의 Authorized redirect URI 만 prod 것 추가하면 됨.
> - **Kakao:** 토글 켜고 REST API 키, Client Secret 입력 (Step 4).

- [ ] **Step 3: Google Cloud Console — Authorized redirect URIs 추가**

> 1. https://console.cloud.google.com → APIs & Services → **Credentials**
> 2. dev 에서 쓰던 **OAuth 2.0 Client** 선택 → 편집
> 3. **Authorized redirect URIs** 에 한 줄 추가:
>    ```
>    https://<prod-project-id>.supabase.co/auth/v1/callback
>    ```
>    (Vercel 도메인 아님 — Supabase 의 callback 임. 헷갈리기 쉬움)
> 4. **Save**
>
> 이 OAuth Client 의 ID/Secret 을 Step 2 의 Supabase Google provider 에 입력.

- [ ] **Step 4: Kakao Developers — Redirect URI 추가**

> 1. https://developers.kakao.com → 내 애플리케이션 → 기존 앱 선택
> 2. **제품 설정 → 카카오 로그인** 활성 확인
> 3. **Redirect URI** 에 추가:
>    ```
>    https://<prod-project-id>.supabase.co/auth/v1/callback
>    ```
> 4. **저장**
>
> 앱 기본 정보의 **REST API 키** 와 보안 → **Client Secret** 을 Step 2 의 Supabase Kakao provider 에 입력.

- [ ] **Step 5: 검증 — 시크릿 브라우저 3종 로그인**

> prod URL 의 `/login` 을 **시크릿 브라우저** 에서 열어 세 가지 모두 시도:
>
> 1. **이메일 가입** → 받은 메일의 인증 링크 클릭 → prod 로 돌아옴 → 로그인 → 닉네임/캘린더 보임
> 2. **카카오로 로그인** → 카카오 동의 → prod 로 돌아옴 → 닉네임 보임
> 3. **구글로 로그인** → 구글 동의 → prod 로 돌아옴 → 닉네임 보임
>
> 어느 하나라도 실패 시 즉시 보고 — 가장 흔한 원인은 redirect URI 오타 (호스트명 한 글자 차이).

검증 통과 → 다음 태스크.

---

## Task 8: Stage F1 — @sentry/nextjs 설치

**Files:**
- Modify: `C:\dev\lunabear-calendar\package.json`

**의존성:** Task 7 완료.

- [ ] **Step 1: 패키지 설치 (pnpm)**

```bash
cd /c/dev/lunabear-calendar && pnpm add @sentry/nextjs@^8
```

**기대 결과:** `package.json` 에 `"@sentry/nextjs": "^8.x.x"` 추가, `pnpm-lock.yaml` 업데이트.

- [ ] **Step 2: 설치 확인**

```bash
cd /c/dev/lunabear-calendar && cat package.json | grep "@sentry/nextjs"
```

**기대:** 한 줄 표시.

(커밋은 Task 9 끝 — Sentry 코드 파일과 함께 한 번에)

---

## Task 9: Stage F1 — Sentry init 파일 4개 + global-error

**Files:**
- Create: `C:\dev\lunabear-calendar\sentry.client.config.ts`
- Create: `C:\dev\lunabear-calendar\sentry.server.config.ts`
- Create: `C:\dev\lunabear-calendar\sentry.edge.config.ts`
- Create: `C:\dev\lunabear-calendar\instrumentation.ts`
- Create: `C:\dev\lunabear-calendar\app\global-error.tsx`

**의존성:** Task 8 완료.

- [ ] **Step 1: sentry.client.config.ts 작성**

```ts
import * as Sentry from "@sentry/nextjs";

// 브라우저 측 Sentry init. DSN 없으면 자동 no-op — 로컬 dev 안전.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
});
```

- [ ] **Step 2: sentry.server.config.ts 작성**

```ts
import * as Sentry from "@sentry/nextjs";

// 서버(Node) 측 Sentry init.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

- [ ] **Step 3: sentry.edge.config.ts 작성**

```ts
import * as Sentry from "@sentry/nextjs";

// Edge runtime (middleware 등) 측 Sentry init.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

- [ ] **Step 4: instrumentation.ts 작성 (프로젝트 루트)**

```ts
// Next 14 표준 — server/edge 의 register 훅.
// 빌드 시점에 runtime 별로 알맞은 Sentry config 가 로드됨.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
```

- [ ] **Step 5: app/global-error.tsx 작성**

```tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: 24,
          backgroundColor: "#0A0A0A",
          color: "#FAFAFA",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>
          죄송합니다. 문제가 발생했어요.
        </h1>
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          잠시 후 다시 시도해주세요. 문제가 계속되면 새로고침을 눌러주세요.
        </p>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: typecheck 통과 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

**기대:** 에러 0.

(커밋은 Task 10 끝 — next.config 래핑과 함께)

---

## Task 10: Stage F1 — next.config.mjs Sentry 래핑 + 빌드 확인 + 커밋

**Files:**
- Modify: `C:\dev\lunabear-calendar\next.config.mjs`

**의존성:** Task 9 완료.

- [ ] **Step 1: next.config.mjs 전체 교체**

```js
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    // Windows + Next.js dev 의 .next/cache/webpack 파일 잠금 충돌을 회피.
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

// Sentry 래핑 — DSN 없으면 소스맵 업로드 등 모두 no-op.
// SENTRY_AUTH_TOKEN 이 있을 때만 빌드 시 소스맵 업로드.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  disableLogger: true,
  hideSourceMaps: true,
  widenClientFileUpload: true,
});
```

- [ ] **Step 2: 로컬 build 시도 (Sentry 환경변수 없는 상태 — no-op 확인)**

```bash
cd /c/dev/lunabear-calendar && pnpm build
```

**기대:** 빌드 성공. Sentry 가 "DSN missing, disabled" 같은 메시지를 silent (또는 한두 줄 경고) 로 처리. 에러로 죽지 않음.

빌드 결과 끝부분에 routes 목록 표시되어야 함.

- [ ] **Step 3: 커밋 (Task 8/9/10 한 번에)**

```bash
cd /c/dev/lunabear-calendar && git add package.json pnpm-lock.yaml sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts instrumentation.ts app/global-error.tsx next.config.mjs && git commit -m "$(cat <<'EOF'
feat(observability): Sentry 통합 — DSN 없으면 no-op

@sentry/nextjs ^8 추가. 4개 init 파일 + instrumentation +
global-error. DSN 환경변수 없을 때 자동 비활성, 로컬 dev 안전.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Stage F2 — Vercel Analytics 설치 + layout 마운트

**Files:**
- Modify: `C:\dev\lunabear-calendar\package.json`
- Modify: `C:\dev\lunabear-calendar\app\layout.tsx`

**의존성:** Task 10 완료.

- [ ] **Step 1: 패키지 설치**

```bash
cd /c/dev/lunabear-calendar && pnpm add @vercel/analytics@^1
```

- [ ] **Step 2: app/layout.tsx 수정 — 두 군데**

기존 import 블록 끝에 한 줄 추가:

```tsx
import { Analytics } from "@vercel/analytics/react";
```

기존 `<Toaster richColors position="top-center" />` 다음 줄에 `<Analytics />` 추가. 최종 body 안:

```tsx
<body className="min-h-dvh bg-background text-foreground">
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem
    disableTransitionOnChange
  >
    {children}
  </ThemeProvider>
  <Toaster richColors position="top-center" />
  <Analytics />
</body>
```

- [ ] **Step 3: typecheck**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

**기대:** 에러 0.

- [ ] **Step 4: 커밋**

```bash
cd /c/dev/lunabear-calendar && git add package.json pnpm-lock.yaml app/layout.tsx && git commit -m "$(cat <<'EOF'
feat(observability): Vercel Web Analytics 마운트

@vercel/analytics ^1 추가, root layout 에 <Analytics /> 한 줄.
Vercel 외부에서는 자동 no-op.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Stage F3 — keepalive 라우트 + vercel.json

**Files:**
- Create: `C:\dev\lunabear-calendar\app\api\keepalive\route.ts`
- Create: `C:\dev\lunabear-calendar\vercel.json`

**의존성:** Task 11 완료.

- [ ] **Step 1: keepalive route 작성**

```ts
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron 이 매일 1회 호출 → Supabase 무료 일시정지 회피.
// 7일 무활동 시 일시정지 → 매일 가벼운 쿼리로 카운터 리셋.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const got = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || got !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").select("id").limit(1);
  if (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, at: new Date().toISOString() });
}
```

- [ ] **Step 2: vercel.json 작성 (프로젝트 루트)**

```json
{
  "crons": [
    {
      "path": "/api/keepalive",
      "schedule": "0 19 * * *"
    }
  ]
}
```

**참고:** `0 19 * * *` = UTC 19:00 = 한국 새벽 4:00. Vercel cron 표현은 UTC 만 사용.

- [ ] **Step 3: typecheck**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

**기대:** 에러 0.

- [ ] **Step 4: 커밋**

```bash
cd /c/dev/lunabear-calendar && git add app/api/keepalive/route.ts vercel.json && git commit -m "$(cat <<'EOF'
feat(ops): keepalive 라우트 + Vercel Cron — Supabase 일시정지 회피

매일 한국 새벽 4시(UTC 19시) /api/keepalive 호출.
CRON_SECRET Bearer 토큰 검증으로 외부 호출 차단.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Stage F4 — .env.local.example 업데이트

**Files:**
- Modify: `C:\dev\lunabear-calendar\.env.local.example`

**의존성:** Task 12 완료.

- [ ] **Step 1: 파일 끝에 블록 추가**

```
# Sentry — sentry.io 프로젝트 생성 후 채움 (prod 만 채우면 됨, dev 는 비워둬도 no-op)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# Vercel Cron 보호용 (Vercel 콘솔에서 무작위 32자 생성 → 등록)
# 로컬에서는 비워둠 — keepalive 라우트 자체가 비어있으면 401 반환하므로 안전
CRON_SECRET=
```

- [ ] **Step 2: 커밋**

```bash
cd /c/dev/lunabear-calendar && git add .env.local.example && git commit -m "$(cat <<'EOF'
chore: .env.local.example — Sentry 4개 + CRON_SECRET 추가

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Stage F5 — Sentry 콘솔 + Vercel 환경변수 + 푸시 (사용자 콘솔 + 푸시)

**Files:** 없음 — 사용자 콘솔 액션 + 푸시.

**의존성:** Task 13 완료.

- [ ] **Step 1: Sentry 프로젝트 생성 + DSN 발급**

> 1. https://sentry.io 가입/로그인
> 2. **Create Project** → Platform: **Next.js** → Project name: `lunabear-calendar`
> 3. 생성 완료 화면에 DSN 표시 → 메모 (`https://xxx@xxx.ingest.us.sentry.io/xxx` 형태)
> 4. 메뉴에서 **Settings → Auth Tokens** → **Create New Token**
>    - Scopes: `project:releases` + `project:read` 최소
>    - Token 한 번만 보임 — 메모
> 5. **Settings → Projects → lunabear-calendar → General Settings** 의 **Organization Slug** 와 **Project Slug** 메모 (예: `myorg`, `lunabear-calendar`)
>
> 알려주실 값 4개:
> - DSN
> - Auth Token
> - Org slug
> - Project slug

- [ ] **Step 2: CRON_SECRET 생성**

> 다음 중 하나로 무작위 32자 문자열 생성:
>
> - PowerShell: `-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})`
> - 또는 https://passwordsgenerator.net 에서 32자, alphanumeric
>
> 한 번만 만들고 Vercel 콘솔에만 붙여넣기 (다른 곳 노출 금지).

- [ ] **Step 3: Vercel 환경변수 5개 추가**

> Vercel 프로젝트 → **Settings → Environment Variables** → 각각 Production, Preview, Development 모두 체크하며 추가:
>
> | Name | Value |
> | --- | --- |
> | `NEXT_PUBLIC_SENTRY_DSN` | (Sentry DSN) |
> | `SENTRY_ORG` | (Org slug) |
> | `SENTRY_PROJECT` | (Project slug) |
> | `SENTRY_AUTH_TOKEN` | (Auth Token — Sensitive 체크) |
> | `CRON_SECRET` | (Step 2 의 32자 — Sensitive 체크) |

- [ ] **Step 4: 푸시 (자동 재배포 트리거)**

```bash
cd /c/dev/lunabear-calendar && git push origin main
```

**기대:** Task 10, 11, 12, 13 의 4개 커밋이 push 됨. Vercel 이 자동으로 새 빌드 시작.

- [ ] **Step 5: Vercel 빌드 결과 확인**

> Vercel 대시보드 → Deployments 탭 → 최신 빌드 클릭 → Build Logs 확인.
>
> **기대:**
> - 빌드 성공
> - 로그 어디선가 "Creating Sentry release ..." + "Uploading source maps ..." 같은 메시지 (SENTRY_AUTH_TOKEN 동작 증명)
> - 배포 완료 후 prod URL 정상 응답
>
> 실패 시 로그 끝 30줄 알려주세요.

- [ ] **Step 6: Cron 등록 확인**

> Vercel 프로젝트 → **Settings → Cron Jobs**
>
> **기대:** `/api/keepalive` schedule `0 19 * * *` 항목 1개 자동 등록 (vercel.json 에서 감지).
>
> 안 보이면 `vercel.json` 푸시 확인 + 프로젝트 재배포.

---

## Task 15: Stage G — 종합 검증 시나리오 (8가지)

**Files:** 없음 — 시크릿 브라우저로 prod 시나리오 검증.

**의존성:** Task 14 완료. 모든 환경변수 + Cron 등록 + 빌드 성공.

- [ ] **Step 1: 새 계정 (이메일) — 끝까지**

> 시크릿 브라우저에서:
> 1. prod URL 로 이동 → 로그인 페이지
> 2. 이메일 회원가입 (사용해본 적 없는 주소)
> 3. 메일함의 인증 링크 클릭 → prod 로 돌아옴
> 4. 로그인 → 홈 위젯 페이지 보임
> 5. 캘린더 페이지 진입 → 일정 1개 추가 (오늘, 종일)
> 6. 새로고침 → 일정 유지

- [ ] **Step 2: 카카오 로그인**

> 다른 시크릿 창에서:
> 1. prod URL → "카카오로 시작하기"
> 2. 카카오 동의 → prod 로 돌아옴
> 3. 닉네임 (헤더 우측 메뉴) 가 카카오 이름으로 표시

- [ ] **Step 3: 구글 로그인**

> 또 다른 시크릿 창에서 구글로 동일.

- [ ] **Step 4: 캘린더 공유 초대 (실시간)**

> 첫 계정 (이메일) → 캘린더 설정 → 공유 → 두 번째 계정 이메일로 초대
> → 두 번째 계정 브라우저 → 받은 초대 보임 → 수락 → 사이드바에 공유 캘린더 추가
> → 첫 계정에서 일정 추가 → 두 번째 계정 화면에 즉시 반영 (Realtime)

- [ ] **Step 5: 게시판 + 알림**

> 한 계정 → /board → 글 작성 → 다른 계정 헤더 종 → 1개 알림 추가됨
> → 다른 계정 글에 댓글 → 작성자 헤더 종 → 알림
> → 좋아요 → 알림

- [ ] **Step 6: Sentry 에러 도달 검증**

> 두 가지 중 편한 방법:
>
> A. **테스트 에러 강제 발생** (가장 빠름):
> 브라우저 콘솔에서:
> ```js
> throw new Error("Sentry test from prod " + Date.now());
> ```
> → Sentry 대시보드 → Issues 에 1분 내 표시.
>
> B. **자연스러운 에러 대기** — 실 사용 중 첫 에러를 기다림 (느림, 검증 미루기 가능).

- [ ] **Step 7: Vercel Analytics 페이지뷰**

> Vercel 프로젝트 → Analytics 탭 → 24시간 후 (실시간이 아님) 페이지뷰 카운트 확인.
> 처음에는 0 → 다음 날 보임.

- [ ] **Step 8: Keepalive 실행 확인 (다음 날)**

> Vercel → Settings → Cron Jobs → `/api/keepalive` → Logs:
> 한국 새벽 4시 (UTC 19시) 에 200 응답 1건 보임.
>
> 실패(401, 500) 시:
> - 401 → `CRON_SECRET` 환경변수 누락 또는 오타
> - 500 → Supabase 연결 문제 (URL/anon/service_role 키 확인)

검증 8개 모두 통과 → **외부 사용자에게 prod URL 공유 가능.** 🎉

---

## 보안 점검 (배포 후 1회)

- [ ] **A. 빌드된 JS 에 service_role 키 없는지 확인**

```bash
# Vercel 빌드 결과는 손에 안 들어옴. 대신 prod URL 의 _next 정적 JS 를 다운로드 후 grep.
# 빠른 대체: 로컬 build 의 .next/static 검사
cd /c/dev/lunabear-calendar && pnpm build && grep -r "service_role" .next/static 2>/dev/null && echo "FOUND" || echo "CLEAN"
```

**기대:** `CLEAN` (service_role 문자열도, 키 값도 클라이언트 번들에 없음).

- [ ] **B. /api/keepalive 외부 호출 차단 확인**

```bash
curl -i https://<prod-도메인>/api/keepalive
```

**기대:** `HTTP/2 401` + `Unauthorized` 본문 (CRON_SECRET 헤더 없으니 거부).

- [ ] **C. middleware 가 미인증 사용자 차단 확인**

브라우저 시크릿에서 직접 `https://<prod-도메인>/board` 입력 → `/login` 으로 리다이렉트.

---

## 트러블슈팅 빠른 색인

| 증상 | 원인 후보 | 조치 |
| --- | --- | --- |
| Vercel 빌드 typecheck 실패 | 로컬에서 typecheck 안 돌리고 푸시 | 로컬 `pnpm typecheck` 후 재푸시 |
| 로그인 후 빈 화면 | Supabase URL/anon 키 prod 와 dev 혼동 | Vercel 환경변수 4개 prod 값으로 정확히 |
| 카카오/구글 로그인 후 404 | OAuth provider redirect URI 오타 | Google/Kakao 콘솔에서 `https://<id>.supabase.co/auth/v1/callback` 정확히 |
| Sentry 에 에러 안 도착 | DSN 환경변수 누락/오타 | Vercel 환경변수 확인 → 재배포 |
| Cron 401 | CRON_SECRET 환경변수 누락 | Vercel Settings → Environment Variables 확인 |
| Cron 500 | service_role 키 또는 URL 잘못 | Vercel 환경변수 prod Supabase 값으로 |
| 7일 후 첫 접속 매우 느림 | Cron 미동작 → 일시정지됨 | Vercel Cron Jobs Logs 확인, 실패 시 수동 호출로 깨움 |

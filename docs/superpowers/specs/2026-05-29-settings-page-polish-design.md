# 설정 페이지 폴리시 + 신규 기능 — Spec

**작성일**: 2026-05-29
**주제**: 설정 페이지 폴리시 강화 (헤더/섹션/stagger/마이크로) + 신규 섹션 3개 (알림 설정 · 데이터 내보내기 · 계정 삭제)

## Context

홈 → 캘린더 → 가계부 → 할 일 → 게시판 폴리시 prod 반영 완료. 설정 페이지 차례.

현재 설정 (5개 섹션):
1. 계정 (이메일/닉네임/로그아웃)
2. 부부 연결 (server slot)
3. 테마 (라이트/다크/시스템)
4. 메인 위젯 (5개 토글)
5. 연결된 캘린더 (목록 + 새 캘린더)

약점:
- ❌ 페이지 헤더 없음 (h1 "설정" 부재)
- ❌ 섹션 헤더 작음 (text-base — 다른 페이지는 더 큼)
- ❌ 진입 애니메이션 없음
- ⚠️ 테마/위젯/캘린더 마이크로 인터랙션 약함

사용자가 4가지 옵션 중 **🅒 최대치 (폴리시 + 신규 기능)** 선택.

## Scope (in)

### 폴리시 (🅑 베이스)
- 페이지 헤더 (h1 "설정")
- 섹션 헤더 통일 (text-lg font-semibold)
- Stagger 진입 (각 섹션 60ms 간격)
- 테마 카드 active scale + hover lift
- 위젯 체크박스 부드러운 토글
- 캘린더 항목 hover lift

### 신규 섹션: 알림 설정
- 카드형 섹션 — "알림 받기" 토글 모음:
  - 부부 연결 초대 받음 / 수락 / 해지
  - 일일 알림 (오늘 일정, 정기 결제 등)
- 추후 push 알림 등 확장 가능
- DB: `profiles.notification_prefs` jsonb 컬럼 추가
- 마이그레이션 + 타입 갱신
- updateNotificationPrefs server action
- 토글 변경 시 즉시 저장

### 신규 섹션: 데이터 내보내기
- "내 데이터 내보내기" 버튼
- 클릭 시 server action 으로 사용자의 모든 데이터(events, expenses, incomes, tasks, subscriptions, budgets, monthly_targets, calendars, profile) JSON 으로 fetch → 다운로드
- 파일명: `lunabear-export-{userId}-{date}.json`
- 데이터 크기 작음 (개인 사용) → 메모리에 직렬화 후 blob 다운로드

### 신규 섹션: 계정 삭제
- "계정 삭제" 빨간 버튼 (위험 영역으로 구분)
- 클릭 시 multi-step 확인 모달:
  - 1단계: 이메일 입력 (정확히 일치해야 진행)
  - 2단계: 최종 확인
- server action: supabase admin client 로 사용자 삭제 (auth.users 삭제 → cascade)
- 성공 시 로그아웃 + /login 리디렉션

## Scope (out)

- 실제 push 알림 (브라우저 Notification API) — 별도 작업
- 데이터 가져오기 (import) — 별도
- 비밀번호 변경 UI (Supabase 자체 magic link 라 N/A)
- 2FA 등 보안 강화 — 별도

## 디자인

### 1. 페이지 헤더 (SettingsPageHeader)

신규 `features/settings/components/SettingsPageHeader.tsx`:

```tsx
export function SettingsPageHeader() {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold">설정</h1>
      <p className="text-sm text-muted-foreground">
        계정과 환경설정을 관리해요
      </p>
    </header>
  );
}
```

### 2. 섹션 헤더 통일

모든 섹션의 `<h2 className="text-base font-semibold">` 를 `text-lg font-semibold` 로 변경.

### 3. Stagger 진입

SettingsClient 의 각 섹션을 motion.div 로 감쌈:
```tsx
const stagger = (idx: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: idx * 0.06, ease: "easeOut" as const },
});
```

순서: header(0) → 계정(1) → 부부(2) → 테마(3) → 위젯(4) → 캘린더(5) → 알림(6) → 데이터(7) → 계정삭제(8)

### 4. 마이크로 인터랙션
- 테마 카드: `transition-all active:scale-[0.97] hover:bg-muted/40` (이미 일부 있음 — 강화)
- 위젯 라벨 hover: `hover:bg-accent/30 -mx-2 px-2 rounded transition-colors`
- 캘린더 항목 hover: `transition-all hover:bg-muted/30`

### 5. 알림 설정 섹션

#### DB 마이그레이션
`supabase/migrations/20260529120000_profiles_notification_prefs.sql`:
```sql
alter table public.profiles
  add column if not exists notification_prefs jsonb;
```

기본값 없음 — null = 모두 ON (legacy 호환).

#### Type 갱신
`types/database.ts` 의 `profiles.Row/Insert/Update` 에 `notification_prefs: Json | null` 추가.

#### Server action
`features/settings/server/actions.ts` 에 `updateNotificationPrefs` 추가.

#### UI 컴포넌트
신규 `features/settings/components/NotificationPrefsSection.tsx`:
- 4개 토글 (Switch 컴포넌트 또는 Checkbox):
  - 부부 초대 받음
  - 부부 초대 수락
  - 부부 해지
  - 일일 요약 알림
- 변경 시 즉시 저장 (debounce 없이 — 사용자가 토글마다 명확)

#### Notification dispatch 갱신
`features/notifications/server/actions.ts` 의 알림 생성 부분 — 수신자의 prefs 확인 후 skip (legacy/null 은 ON 으로 간주).

### 6. 데이터 내보내기 섹션

#### Server action
`features/settings/server/actions.ts` 에 `exportMyData()`:
```ts
"use server";
export async function exportMyData(): Promise<ActionResult<{ json: string; filename: string }>> {
  const userId = await getUserId();
  const supabase = createClient();
  
  const [profile, calendars, events, expenses, incomes, tasks, subscriptions, recurringIncomes, budgets, monthlyTargets] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("calendars").select("*").eq("user_id", userId),
    supabase.from("events").select("*").eq("user_id", userId),
    supabase.from("expenses").select("*").eq("user_id", userId),
    supabase.from("incomes").select("*").eq("user_id", userId),
    supabase.from("tasks").select("*").eq("user_id", userId),
    supabase.from("subscriptions").select("*").eq("user_id", userId),
    supabase.from("recurring_incomes").select("*").eq("user_id", userId),
    supabase.from("budgets").select("*").eq("user_id", userId),
    supabase.from("monthly_targets").select("*").eq("user_id", userId),
  ]);
  
  const payload = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profile.data,
    calendars: calendars.data,
    events: events.data,
    expenses: expenses.data,
    incomes: incomes.data,
    tasks: tasks.data,
    subscriptions: subscriptions.data,
    recurring_incomes: recurringIncomes.data,
    budgets: budgets.data,
    monthly_targets: monthlyTargets.data,
  };
  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  return { ok: true, data: { json, filename: `lunabear-export-${date}.json` } };
}
```

#### UI 컴포넌트
신규 `features/settings/components/DataExportSection.tsx`:
- "내 데이터 내보내기 (JSON)" 버튼
- 클릭 시 server action 호출 → blob 생성 → a 태그 download

### 7. 계정 삭제 섹션

#### Server action
`features/settings/server/actions.ts` 에 `deleteMyAccount(confirmationEmail: string)`:
- 사용자 이메일과 confirmationEmail 일치 확인
- supabase admin client 로 `auth.users` 에서 user 삭제 (cascade 로 모든 user_id 참조 데이터 삭제)
- 성공 시 sign out + redirect 는 client 에서 처리

```ts
export async function deleteMyAccount(confirmationEmail: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };
  if (user.email?.toLowerCase() !== confirmationEmail.trim().toLowerCase()) {
    return { ok: false, error: "이메일이 일치하지 않아요" };
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: error.message };
  await supabase.auth.signOut();
  return { ok: true, data: undefined };
}
```

#### UI 컴포넌트
신규 `features/settings/components/AccountDeleteSection.tsx`:
- "위험 영역" 빨간 헤딩 + 작은 안내
- "계정 삭제" 빨간 버튼
- 클릭 → AlertDialog
  - 입력 필드: "정확히 이메일을 입력하세요"
  - 확인 버튼 disabled until exact match
  - "삭제" 빨간 버튼 → server action 호출
- 성공 시 toast + router.push("/login")

## 구현 전략

### 파일 구조

#### Create
- `features/settings/components/SettingsPageHeader.tsx`
- `features/settings/components/NotificationPrefsSection.tsx`
- `features/settings/components/DataExportSection.tsx`
- `features/settings/components/AccountDeleteSection.tsx`
- `supabase/migrations/20260529120000_profiles_notification_prefs.sql`
- `notification-prefs-bootstrap.sql` (gitignored, 사용자 콘솔 적용용)

#### Modify
- `features/settings/components/SettingsClient.tsx` — 헤더, 섹션 헤더 크기, stagger, 신규 섹션들 마운트
- `features/settings/server/actions.ts` — updateNotificationPrefs, exportMyData, deleteMyAccount 추가
- `types/database.ts` — profiles.notification_prefs 추가
- `app/(app)/settings/page.tsx` — notification_prefs 도 fetch + prop drilling
- `features/notifications/server/actions.ts` — prefs 체크 후 skip 로직 추가 (선택 — 빈 prefs 면 default on)

### 작업 순서

1. DB 마이그레이션 (notification_prefs) + types 갱신
2. SettingsPageHeader
3. SettingsClient 폴리시 (h1 + 섹션 헤더 + stagger + 마이크로)
4. updateNotificationPrefs action + NotificationPrefsSection 컴포넌트
5. exportMyData action + DataExportSection 컴포넌트
6. deleteMyAccount action + AccountDeleteSection 컴포넌트
7. SettingsClient 에 신규 3개 섹션 마운트
8. page.tsx 에서 notification_prefs fetch + prop drilling
9. Supabase 콘솔 (사용자 수동): 마이그레이션 적용
10. 최종 회귀 + push

### 작업 분량

| 단계 | 시간 |
|---|---|
| 1. 마이그레이션 + types | 30분 |
| 2. SettingsPageHeader | 20분 |
| 3. 폴리시 (h1 + headers + stagger + 마이크로) | 1시간 |
| 4. NotificationPrefsSection | 1.5시간 |
| 5. DataExportSection | 1시간 |
| 6. AccountDeleteSection | 1.5시간 |
| 7. SettingsClient 통합 | 30분 |
| 8. page.tsx 갱신 | 20분 |
| 9. Supabase 콘솔 (사용자) | 10분 |
| 10. 최종 회귀 + push | 1시간 |
| **합계** | **7~9시간** |

## 검증

### 단계마다
- `pnpm tsc --noEmit` 통과
- `pnpm lint` 통과
- `/settings` 200 응답

### 최종 체크리스트
- [ ] 페이지 헤더 "설정" h1 + 부제
- [ ] 모든 섹션 헤더 text-lg font-semibold
- [ ] 진입 시 섹션 stagger fade-in
- [ ] 테마 카드 active 시 scale 미세
- [ ] 위젯 토글 부드러움
- [ ] 알림 설정 4개 토글 동작 + 저장
- [ ] 데이터 내보내기 → JSON 다운로드
- [ ] 계정 삭제: 이메일 일치 확인 + 다이얼로그 → 삭제 → /login
- [ ] 다크모드 정상

### 회귀
- 닉네임 저장 정상
- 로그아웃 정상
- 부부 연결 정상
- 테마 토글 정상
- 위젯 visibility 정상
- 새 캘린더 / 캘린더 설정 정상

## 위험 (Known unknowns)

- 계정 삭제 — 부부 연결 상대방 데이터가 어떻게 되는지 확인 필요 (cascade 정책 따라가지만, 상대방 가계부에 영향 가능)
- 알림 prefs 미설정 (null) 시 default 동작 — 본 spec 에서는 "모두 ON" 으로 처리
- export JSON 크기 — 데이터 많은 사용자는 메가급 가능. 본 spec 에서는 메모리 fit (작은 개인 사용 가정)
- DB 마이그레이션 적용 안 하면 update action 실패 → 사용자 안내 필수

## 미정 (별도 결정 필요)

- 실제 push 알림 — 별도
- 데이터 가져오기 (import) — 별도
- 2FA / 비밀번호 변경 — 별도
- 부부 연결과 계정 삭제의 상호작용 정책 — 별도 결정 필요

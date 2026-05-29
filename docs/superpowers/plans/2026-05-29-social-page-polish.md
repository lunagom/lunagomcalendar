# 공유 페이지 폴리시 강화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** 공유 페이지에 페이지 헤더, 섹션 통일, stagger 진입, EmptyState 통일, 항목 hover lift, 버튼 active scale 추가.

**Architecture:** 1개 신규 (SocialPageHeader) + SocialClient 종합 수정.

**Tech Stack:** Next.js 14, React 18, framer-motion, shadcn/ui.

**Spec 출처:** `docs/superpowers/specs/2026-05-29-social-page-polish-design.md`

---

## File Structure

### Create
- `features/social/components/SocialPageHeader.tsx`

### Modify
- `features/social/components/SocialClient.tsx`

---

## Task 1: SocialPageHeader

**Files:**
- Create: `features/social/components/SocialPageHeader.tsx`

- [ ] **Step 1: 작성**

```tsx
type Props = {
  inviteCount: number;
  acceptedCount: number;
  ownedCount: number;
};

/**
 * 공유 페이지 헤더 — h1 + 부제 (받은 초대 / 함께 보는 / 내가 공유한 카운트).
 */
export function SocialPageHeader({
  inviteCount,
  acceptedCount,
  ownedCount,
}: Props) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold">공유</h1>
      <p className="text-sm text-muted-foreground">
        받은 초대 {inviteCount} · 함께 보는 {acceptedCount} · 내가 공유한{" "}
        {ownedCount}
      </p>
    </header>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
cd /c/dev/lunabear-calendar && pnpm tsc --noEmit
```
Expected: Exit 0

- [ ] **Step 3: Commit**

```bash
git add features/social/components/SocialPageHeader.tsx
git commit -m "$(cat <<'EOF'
feat(social): SocialPageHeader — h1 + 카운트 부제

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: SocialClient 통합

**Files:**
- Modify: `features/social/components/SocialClient.tsx`

- [ ] **Step 1: 모든 변경사항 적용**

다음 변경:

**1. Imports 추가**:
```tsx
import { motion } from "framer-motion";
import { EmptyState } from "@/components/ui/empty-state";
import { SocialPageHeader } from "./SocialPageHeader";
```

**2. stagger 헬퍼 추가** (function 안):
```tsx
const stagger = (idx: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: idx * 0.06, ease: "easeOut" as const },
});
```

**3. 모든 섹션 헤더 크기 변경**:
- `<h2 className="mb-3 text-base font-semibold">` → `<h2 className="mb-3 text-lg font-semibold">` (3곳)

**4. 받은 초대 빈 상태 EmptyState 적용**:

기존:
```tsx
<p className="text-sm text-muted-foreground">받은 초대가 없어요.</p>
```

신규:
```tsx
<EmptyState message="받은 초대가 없어요." />
```

**5. 함께 보는 캘린더 빈 상태**:
```tsx
<EmptyState message="공유받은 캘린더가 없어요." />
```

**6. 내가 공유한 캘린더 빈 상태** (액션 포함):
```tsx
<EmptyState
  message="아직 공유한 캘린더가 없어요"
  action={{
    label: "캘린더 설정 가기",
    onClick: () => router.push("/settings"),
  }}
/>
```

**7. 받은 초대 / 함께 보는 캘린더 li hover 효과**:

기존:
```tsx
className="flex items-center gap-3 rounded-lg border border-border/40 p-3"
```

신규:
```tsx
className="flex items-center gap-3 rounded-lg border border-border/40 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-border/80"
```

(2개 li 모두)

**8. 내가 공유한 캘린더의 그룹 div hover**:

기존:
```tsx
className="rounded-lg border p-3"
```

신규:
```tsx
className="rounded-lg border p-3 transition-all duration-200 hover:shadow-sm"
```

**9. 멤버 li hover**:

기존:
```tsx
className="flex items-center gap-2 text-sm"
```

신규:
```tsx
className="flex items-center gap-2 text-sm py-1 -mx-2 px-2 rounded transition-colors hover:bg-muted/30"
```

**10. 버튼 active scale** — 다음 버튼들에 className 추가:

- 수락 버튼: `active:scale-[0.97] transition-transform`
- 거절 버튼: `active:scale-[0.97] transition-transform`
- 나가기 버튼: `active:scale-[0.97] transition-transform`
- 제거 버튼 (Trash2 icon button): `active:scale-[0.95] transition-transform`

각 버튼의 기존 className 에 추가. ghost variant 버튼은 transition 가 충돌하지 않게 transition-transform 만 적용.

**11. 페이지 전체 구조 motion.div 로 stagger 감쌈**:

return 영역 구조:
```tsx
return (
  <div className="container mx-auto max-w-3xl space-y-8 px-4 py-6 md:px-6 md:py-8">
    <motion.div {...stagger(0)}>
      <SocialPageHeader
        inviteCount={invites.length}
        acceptedCount={accepted.length}
        ownedCount={owned.length}
      />
    </motion.div>

    <motion.div {...stagger(1)}>
      <section>
        <h2 className="mb-3 text-lg font-semibold">받은 초대</h2>
        {/* 기존 받은 초대 내용 (EmptyState 적용된) */}
      </section>
    </motion.div>

    <motion.div {...stagger(2)}>
      <section>
        <h2 className="mb-3 text-lg font-semibold">함께 보는 캘린더</h2>
        {/* 기존 함께 보는 내용 (EmptyState 적용된) */}
      </section>
    </motion.div>

    <motion.div {...stagger(3)}>
      <section>
        <h2 className="mb-3 text-lg font-semibold">내가 공유한 캘린더</h2>
        {/* 기존 내가 공유한 내용 (EmptyState + action 적용된) */}
      </section>
    </motion.div>

    <DeleteConfirmDialog ... />
  </div>
);
```

기존 container className 에서 `space-y-8 px-4 py-6` 를 `space-y-8 px-4 py-6 md:px-6 md:py-8` 로 (데스크탑 패딩 통일).

- [ ] **Step 2: 타입체크 + /social 200**

```bash
pnpm tsc --noEmit
curl -s -o /dev/null -w "/social: %{http_code}\n" http://localhost:3000/social
```
Expected: tsc 0, curl 307

- [ ] **Step 3: Commit**

```bash
git add features/social/components/SocialClient.tsx
git commit -m "$(cat <<'EOF'
feat(social): SocialClient 통합 — 헤더+섹션통일+stagger+EmptyState+hover+active

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 최종 회귀 + push

- [ ] **Step 1: 전체 검증**

```bash
cd /c/dev/lunabear-calendar
pnpm tsc --noEmit
pnpm lint
curl -s -o /dev/null -w "/social: %{http_code}\n" http://localhost:3000/social
```
Expected: tsc 0, lint clean, curl 307

- [ ] **Step 2: 시각 회귀 (playwright)**

`/social` 진입:
- 헤더 "공유" h1 + 카운트 부제
- 모든 섹션 헤더 text-lg
- 진입 시 stagger fade-in
- 빈 상태 EmptyState 보임
- "내가 공유한 캘린더" 빈 상태에 "캘린더 설정 가기" 버튼
- 항목 hover 시 살짝 들림 + shadow
- 다크모드 정상

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 페이지 헤더 → Task 1
- ✅ 섹션 헤더 통일 → Task 2
- ✅ Stagger 진입 → Task 2
- ✅ EmptyState 3곳 → Task 2
- ✅ 항목 hover lift → Task 2
- ✅ 버튼 active scale → Task 2
- ✅ 회귀 → Task 3

**2. Placeholder scan:** Task 2 의 11개 변경 항목 — 상세 코드 제공.

**3. Type consistency:** SocialPageHeader props 가 SocialClient 에서 invites/accepted/owned 의 length 와 매칭.

**4. 의존성 순서:**
- Task 1 (Header) — 독립
- Task 2 (SocialClient) — Task 1 후 (import)
- Task 3 — 마지막

권장 순서: 1 → 2 → 3

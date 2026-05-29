# 공유 페이지 폴리시 강화 — Spec

**작성일**: 2026-05-29
**주제**: 공유 페이지 (`app/(app)/social/page.tsx`) UX 향상 — 헤더 + 섹션 통일 + stagger + EmptyState + 인터랙션 폴리시

## Context

홈 → 캘린더 → 가계부 → 할 일 → 게시판 → 설정 폴리시 prod 반영 완료. **공유 페이지** 가 마지막.

현재 공유 (3 섹션):
1. 받은 초대 (incoming invites)
2. 함께 보는 캘린더 (calendars shared with me)
3. 내가 공유한 캘린더 (calendars I shared)

약점:
- ❌ 페이지 헤더 없음 (h1 "공유" 부재)
- ❌ 섹션 헤더 작음 (text-base — 다른 페이지는 text-lg)
- ❌ 진입 애니메이션 없음
- ❌ 빈 상태가 단순 `<p>` 텍스트 (EmptyState 미사용)
- ⚠️ 목록 항목 hover 약함
- ⚠️ 수락/거절 버튼 마이크로 부족

사용자가 4가지 옵션 중 **🅑 폴리시 + 인터랙션** 선택.

## Scope (in)

- 페이지 헤더 (h1 "공유" + 부제)
- 섹션 헤더 통일 (text-lg font-semibold)
- Stagger 진입 (3 섹션 + 헤더)
- 빈 상태 3곳 EmptyState 통일
- 목록 항목 hover lift (-translate-y-0.5 + shadow + bg)
- 수락/거절 버튼 active scale
- 내가 공유한 캘린더의 멤버 항목 hover 강조

## Scope (out)

- Realtime 구독 (🅒 옵션, 별도)
- 새 기능 추가
- 데이터 모델 변경

## 디자인

### 1. 페이지 헤더 (SocialPageHeader 신규)

신규 `features/social/components/SocialPageHeader.tsx`:

```tsx
type Props = {
  inviteCount: number;
  acceptedCount: number;
  ownedCount: number;
};

/**
 * 공유 페이지 헤더 — h1 + 부제 (받은 초대 N · 함께 보는 N · 내가 공유 N).
 */
export function SocialPageHeader({ inviteCount, acceptedCount, ownedCount }: Props) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold">공유</h1>
      <p className="text-sm text-muted-foreground">
        받은 초대 {inviteCount} · 함께 보는 {acceptedCount} · 내가 공유한 {ownedCount}
      </p>
    </header>
  );
}
```

### 2. 섹션 헤더 통일

모든 `<h2 className="mb-3 text-base font-semibold">` → `<h2 className="mb-3 text-lg font-semibold">`

### 3. Stagger 진입

`SocialClient.tsx` 의 섹션을 motion.div 로 감쌈:
```tsx
const stagger = (idx: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: idx * 0.06, ease: "easeOut" as const },
});
```

순서: header(0) → 받은 초대(1) → 함께 보는(2) → 내가 공유한(3)

### 4. EmptyState 적용

기존:
```tsx
<p className="text-sm text-muted-foreground">받은 초대가 없어요.</p>
```

신규:
```tsx
<EmptyState message="받은 초대가 없어요." />
```

3곳 (받은 초대 / 함께 보는 / 내가 공유한) 모두 동일 패턴.

`내가 공유한 캘린더` 의 빈 상태는 액션 포함:
```tsx
<EmptyState
  message="아직 공유한 캘린더가 없어요"
  action={{
    label: "캘린더 설정 가기",
    onClick: () => router.push("/settings"),
  }}
/>
```

### 5. 목록 항목 인터랙션

기존 li:
```tsx
className="flex items-center gap-3 rounded-lg border border-border/40 p-3"
```

신규:
```tsx
className="flex items-center gap-3 rounded-lg border border-border/40 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-border/80"
```

`내가 공유한 캘린더` 의 그룹 div 도 동일하게 hover.

멤버 li (그룹 안):
```tsx
className="flex items-center gap-2 text-sm py-1 -mx-2 px-2 rounded transition-colors hover:bg-muted/30"
```

### 6. 버튼 active 마이크로

수락/거절/나가기/제거 버튼들에 `active:scale-[0.97] transition-transform` 추가.

## 구현 전략

### 파일 구조

#### Create
- `features/social/components/SocialPageHeader.tsx`

#### Modify
- `features/social/components/SocialClient.tsx` (메인 통합 — 헤더 + 섹션 통일 + stagger + EmptyState + 인터랙션)

### 작업 순서

1. SocialPageHeader 신규
2. SocialClient 통합 (모든 변경 한 번에)
3. 최종 회귀 + push

### 작업 분량

| 단계 | 시간 |
|---|---|
| 1. SocialPageHeader | 20분 |
| 2. SocialClient 통합 (헤더 + 섹션 + stagger + EmptyState + hover) | 1.5시간 |
| 3. 최종 회귀 + push | 30분 |
| **합계** | **2~2.5시간** |

(스펙은 작업이 적어 간단함 — 한 컴포넌트 위주)

## 검증

### 단계마다
- `pnpm tsc --noEmit` 통과
- `pnpm lint` 통과
- `/social` 200 응답

### 최종 체크리스트
- [ ] 페이지 헤더 "공유" h1 + 부제 (카운트)
- [ ] 모든 섹션 헤더 text-lg font-semibold
- [ ] 진입 시 stagger fade-in (header → 3 섹션)
- [ ] 빈 상태 3곳 모두 EmptyState 사용
- [ ] "내가 공유한 캘린더" 빈 상태에 "캘린더 설정 가기" 버튼
- [ ] 목록 항목 hover 시 살짝 들림 + shadow
- [ ] 수락/거절 등 버튼 active scale 동작
- [ ] 멤버 li hover 시 배경 강조
- [ ] 다크모드 정상

### 회귀
- 초대 수락 / 거절 정상
- 나가기 다이얼로그 정상
- 권한 변경 (select) 정상
- 멤버 제거 정상

## 위험

- 없음. 단순 UI 폴리시. 데이터/로직 변경 없음.

# 루나곰 캘린더

> 내 일정, 내 돈, 내 사람들 — **한 화면에서.**

한국인의 일정·돈·관계를 한 화면에서 관리하는 통합 캘린더 + 라이트 가계부.

## 기술 스택

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + **shadcn/ui** (New York · CSS variables)
- 상태관리: **Zustand**
- 폼: **react-hook-form** + **zod**
- 아이콘: **lucide-react**
- 폰트: **Pretendard Variable** (한글 가독성)
- 테마: **next-themes** (다크 우선)
- 패키지 매니저: **pnpm**

## 개발

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint
pnpm build
```

## 폴더 구조

```
app/                  # App Router 라우트
  calendar/           # 캘린더 (1단계: 플레이스홀더)
  expense/            # 가계부
  social/             # 공유
  settings/           # 설정
  layout.tsx          # 루트 레이아웃 (ThemeProvider + AppShell)
  globals.css         # 디자인 토큰 (Primary #5B6CFF, light/dark)
components/
  ui/                 # shadcn/ui 컴포넌트
  layout/             # Sidebar, Header, MobileTabbar, ThemeToggle, UserMenu
  placeholder-page.tsx
  theme-provider.tsx
features/             # 도메인별 기능 모듈 (다음 단계부터 채움)
  calendar/  expense/  social/  decoration/
lib/                  # 공용 유틸 / 상수
  utils.ts  nav.ts
types/                # 전역 타입
PROJECT.md/           # 기획안 (docx)
design-refs/          # 디자인 레퍼런스 이미지
```

## 디자인 토큰

| 토큰 | Light | Dark |
| --- | --- | --- |
| `--primary` | `#5B6CFF` (231 100% 68%) | `#5B6CFF` (231 100% 70%) |
| `--background` | `#FAFAFA` | `#0A0A0A` |
| `--card` | `#FFFFFF` | `#171717` |
| `--radius` | 8px (`rounded-lg`) · 12px (`rounded-xl` 카드) | 동일 |

## 1단계 (현재) 완료 범위

- [x] Next.js 14 + TS + App Router + Tailwind 셋업
- [x] shadcn/ui (New York) init · `button` `input` `dialog` `dropdown-menu` `card`
- [x] Pretendard Variable 적용 (CDN 동적 서브셋)
- [x] 폴더 구조 (`app` `components` `features` `lib` `types`)
- [x] 좌측 사이드바 · 상단 헤더 · 우측 토글(테마/유저)
- [x] 모바일 하단 탭바 반응형
- [x] next-themes 다크/라이트/시스템 토글
- [x] 4개 라우트(`/calendar`, `/expense`, `/social`, `/settings`) 플레이스홀더
- [x] 메인 텍스트 한국어

## 다음 단계 (예정)

DB 연동, 캘린더 그리드, 자연어 일정 등록, 가계부 입력 흐름.

# 모바일 반응형 점검 — 2026-05-24

테스트 환경: Playwright Chromium · Next.js dev 서버 :3000 · 계정 pw-test@lunabear.dev
뷰포트: **375 × 812** · **414 × 896** · **768 × 1024**

---

## 진행 상황

- ✅ **묶음 1** — C3 사이드바 모바일 드로어 + C5 하단 탭바 4개
- ✅ **묶음 2** — C1 + C2 캘린더 헤더 (CalendarHeaderBar 신규, FC 자체 toolbar 비활성)
- ✅ **묶음 3** — E1-E3 가계부 헤더 모바일 2행 분할
- ✅ **묶음 4** — D1/D2 DayDetail 모바일 bottom sheet (sm 분기, Sheet cva 일반화)
- ✅ **묶음 5** — C4 셀 min-height 모바일 5rem + C6 EventBar 모바일 컴팩트 (px-1.5, text-[10px])

## 묶음 외 발견 (별도 작업)

- **멀티데이 이벤트 연속 막대 미표시** — `MonthGrid` 가 `start_at` 단일 키로 이벤트 매핑, FC 자체 이벤트 렌더 `display:"none"` 으로 끔. 시작일 셀에만 작게 표시. 연속 막대로 표시하려면 (A) FC 멀티데이 자체 렌더 복원 또는 (B) 주 단위 absolute 막대 직접 그림. 모바일 점검 외 별도 묶음으로 진행.

---

## 점검 못한 것 (후속)

- ExpenseModal 자체 모바일 — 클릭 안 잡혀 직접 못 봄
- SubscriptionModal — 구독 데이터 없어서 추가 모달 못 봄
- 다크/라이트 테마 양쪽 — 다크만 봄
- 가로 회전 (landscape) — 안 봄

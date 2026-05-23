// lib/colors.ts

/**
 * 캘린더 카테고리 색 12개 — design-refs/KakaoTalk_20260523_142440216.jpg 에서 추출.
 * dusty / muted 톤. 사용자가 새 캘린더 만들 때 이 중에서 선택.
 */
export const PRESETS = [
  // 핑크 계열
  "#EBD8DD",
  "#E8D2DC",
  "#E8B8CB",
  "#C49AA8",
  // 베이지 계열
  "#F4E8D8",
  "#E2D5C8",
  "#C5B5A8",
  "#A8917F",
  // 블루 계열
  "#DCE5EA",
  "#BDD3E0",
  "#7E94A2",
  "#7A7A7A",
] as const;

export type CalendarColor = (typeof PRESETS)[number];

/** 회원가입 시 자동 생성되는 기본 캘린더 색. */
export const DEFAULT_CALENDAR_COLOR: CalendarColor = "#BDD3E0";

/**
 * 가계부 기본 카테고리 6종. 사용자가 자유롭게 추가도 가능하지만
 * 이 6개는 항상 추천 칩으로 노출됨.
 */
export const EXPENSE_CATEGORY_PRESETS = [
  "식비",
  "교통",
  "쇼핑",
  "구독",
  "경조사",
  "기타",
] as const;

export type ExpenseCategoryPreset = (typeof EXPENSE_CATEGORY_PRESETS)[number];

/**
 * 기본 카테고리 ↔ 색 매핑 (12색 팔레트 중 6개).
 * 식비=베이지, 교통=밝은 블루, 쇼핑=핑크, 구독=짙은 블루,
 * 경조사=짙은 핑크, 기타=회색.
 */
export const CATEGORY_COLORS: Record<ExpenseCategoryPreset, CalendarColor> = {
  식비: "#F4E8D8",
  교통: "#DCE5EA",
  쇼핑: "#E8B8CB",
  구독: "#7E94A2",
  경조사: "#C49AA8",
  기타: "#7A7A7A",
};

/** 사용자 정의 카테고리에 적용할 fallback 색. */
export const CUSTOM_CATEGORY_COLOR: CalendarColor = "#C5B5A8";

/** 카테고리(프리셋 또는 사용자 정의)에서 색을 가져옴. */
export function getCategoryColor(category: string): string {
  if (category in CATEGORY_COLORS) {
    return CATEGORY_COLORS[category as ExpenseCategoryPreset];
  }
  return CUSTOM_CATEGORY_COLOR;
}

/**
 * 배경 hex 색이 주어지면 검정/흰색 텍스트 중 가독성 좋은 쪽 반환.
 * YIQ 공식 (0.299·R + 0.587·G + 0.114·B) 사용, 임계값 0.6.
 */
export function getTextColor(hex: string): "#fff" | "#222" {
  const [r, g, b] = parseHex(hex);
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return brightness >= 0.6 ? "#222" : "#fff";
}

function parseHex(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

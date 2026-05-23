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

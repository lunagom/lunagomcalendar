// features/expense/lib/asset-colors.ts

/**
 * 자산 카드의 색 팔레트 (6개). 다크/라이트 동일 hex.
 * 메모리의 color restraint 원칙: 새 색 발명 X, 기존 시스템 톤과 의미군 겹치지 않게.
 */
export const ASSET_COLOR_PALETTE = [
  "#5B6CFF", // primary blue — 기본
  "#9CA3AF", // gray — 현금 default
  "#16A34A", // green — 저축/투자 톤
  "#F59E0B", // amber — 은행 톤
  "#A855F7", // purple — 카드 톤
  "#EC4899", // pink — 보조
] as const;

export type AssetColor = (typeof ASSET_COLOR_PALETTE)[number];

export const ASSET_DEFAULT_COLOR_BY_TYPE: Record<
  "cash" | "bank" | "debit_card" | "credit_card" | "savings_investment",
  string
> = {
  cash: "#9CA3AF",
  bank: "#F59E0B",
  debit_card: "#A855F7",
  credit_card: "#A855F7",
  savings_investment: "#16A34A",
};

export function isValidAssetColor(c: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(c);
}

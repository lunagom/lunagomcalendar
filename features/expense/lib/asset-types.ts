// features/expense/lib/asset-types.ts
import {
  Wallet,
  Landmark,
  CreditCard,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type AssetType =
  | "cash"
  | "bank"
  | "debit_card"
  | "credit_card"
  | "savings_investment";

export const ASSET_TYPES: readonly AssetType[] = [
  "cash",
  "bank",
  "debit_card",
  "credit_card",
  "savings_investment",
] as const;

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash: "현금",
  bank: "은행",
  debit_card: "체크카드",
  credit_card: "신용카드",
  savings_investment: "저축/투자",
};

export const ASSET_TYPE_ICONS: Record<AssetType, LucideIcon> = {
  cash: Wallet,
  bank: Landmark,
  debit_card: CreditCard,
  credit_card: CreditCard,
  savings_investment: TrendingUp,
};

/** 신용카드는 누적이라 순자산 합산에서 차감. */
export const ASSET_TYPE_SIGN: Record<AssetType, 1 | -1> = {
  cash: 1,
  bank: 1,
  debit_card: 1, // balance 는 항상 0 이지만 합산에 영향 없게 +
  credit_card: -1,
  savings_investment: 1,
};

/** 수입을 받을 수 있는 자산 (체크/신용카드는 수입 불가). */
export function canReceiveIncome(type: AssetType): boolean {
  return type === "cash" || type === "bank" || type === "savings_investment";
}

/** 체크카드 사용 시 linked_asset_id 의 은행에서 차감. */
export function debitsFromLinked(type: AssetType): boolean {
  return type === "debit_card";
}

/** 신용카드 사용 시 누적 (+= 금액). */
export function accumulates(type: AssetType): boolean {
  return type === "credit_card";
}

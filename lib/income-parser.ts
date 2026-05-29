// lib/income-parser.ts
import { INCOME_CATEGORY_PRESETS, type IncomeCategoryPreset } from "./colors";

export type ParsedIncome = {
  amount: number | null;
  category: IncomeCategoryPreset | null;
  memo: string | null;
};

const INCOME_CATEGORY_KEYWORDS: Record<IncomeCategoryPreset, string[]> = {
  월급: ["월급", "급여", "봉급", "salary"],
  투자: ["배당", "이자", "주식", "펀드", "etf", "수익", "차익", "dividend"],
  코인: ["코인", "비트코인", "이더리움", "btc", "eth", "crypto", "암호화폐"],
  부수입: [
    "보너스",
    "상여",
    "프리랜스",
    "용돈",
    "환급",
    "세금환급",
    "매출",
    "bonus",
  ],
  기타: [],
};

function tryParseAmount(token: string): number | null {
  const cleaned = token.replace(/,/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function matchCategory(token: string): IncomeCategoryPreset | null {
  const lower = token.toLowerCase();
  for (const cat of INCOME_CATEGORY_PRESETS) {
    if (cat === "기타") continue;
    for (const kw of INCOME_CATEGORY_KEYWORDS[cat]) {
      if (lower.includes(kw)) return cat;
    }
  }
  return null;
}

/**
 * 자연어 한 줄에서 금액 / 수입 카테고리 / 메모 추출.
 */
export function parseIncome(input: string): ParsedIncome {
  const trimmed = input.trim();
  if (!trimmed) {
    return { amount: null, category: null, memo: null };
  }

  const tokens = trimmed.split(/\s+/);
  let amount: number | null = null;
  let category: IncomeCategoryPreset | null = null;
  const memoTokens: string[] = [];

  for (const token of tokens) {
    const num = tryParseAmount(token);
    if (num !== null) {
      if (amount === null || num > amount) amount = num;
      continue;
    }
    if (category === null) {
      const matched = matchCategory(token);
      if (matched) category = matched;
    }
    memoTokens.push(token);
  }

  return {
    amount,
    category,
    memo: memoTokens.length > 0 ? memoTokens.join(" ") : null,
  };
}

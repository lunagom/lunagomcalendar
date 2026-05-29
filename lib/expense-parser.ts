// lib/expense-parser.ts
import {
  EXPENSE_CATEGORY_PRESETS,
  type ExpenseCategoryPreset,
} from "./colors";

export type ParsedExpense = {
  amount: number | null;
  category: ExpenseCategoryPreset | null;
  memo: string | null;
  asset_id: string | null;
};

/** 자산 후보 — parseExpense 가 받아서 이름 substring match. */
export type AssetCandidate = {
  id: string;
  name: string;
};

/**
 * 카테고리별 키워드 사전. 사용자가 가장 자주 적을 단어 위주.
 * matchCategory 는 토큰을 소문자화한 뒤 token.includes(keyword) 로 부분 일치.
 * '기타' 는 매칭 대상에서 제외 (fallback only).
 */
const CATEGORY_KEYWORDS: Record<ExpenseCategoryPreset, string[]> = {
  식비: [
    "식비", "밥", "점심", "저녁", "아침", "커피", "카페", "음식", "식당",
    "배달", "야식", "간식", "음료", "술", "맥주", "와인", "디저트",
    "스타벅스", "빵",
  ],
  교통: [
    "교통", "지하철", "버스", "택시", "기차", "주유", "톨게이트", "주차",
    "ktx", "srt", "고속버스", "taxi",
  ],
  쇼핑: [
    "쇼핑", "옷", "가방", "신발", "화장품", "책", "마트", "편의점",
    "아마존", "쿠팡", "이마트", "홈플", "코스트코",
  ],
  구독: [
    "구독", "넷플릭스", "유튜브", "디즈니", "스포티파이", "멜론", "왓챠",
    "티빙", "웨이브", "노션", "클로드", "챗gpt", "인스타", "프라임",
    "netflix", "spotify", "youtube",
  ],
  경조사: [
    "경조사", "결혼", "결혼식", "부조", "부조금", "축의금", "조의금",
    "부의금", "돌잔치", "환갑", "장례", "장례식", "축의", "조의",
  ],
  기타: [],
};

function tryParseAmount(token: string): number | null {
  const cleaned = token.replace(/,/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function matchCategory(token: string): ExpenseCategoryPreset | null {
  const lower = token.toLowerCase();
  for (const cat of EXPENSE_CATEGORY_PRESETS) {
    if (cat === "기타") continue;
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      if (lower.includes(kw)) return cat;
    }
  }
  return null;
}

/**
 * 입력 텍스트에서 자산 이름 substring 매칭.
 * 긴 이름 우선 (예: "신한체크" 가 "신한" 보다 먼저 매칭).
 */
function matchAsset(
  input: string,
  candidates: AssetCandidate[],
): string | null {
  if (candidates.length === 0) return null;
  const lower = input.toLowerCase();
  const sorted = [...candidates].sort((a, b) => b.name.length - a.name.length);
  for (const c of sorted) {
    if (c.name.length === 0) continue;
    if (lower.includes(c.name.toLowerCase())) return c.id;
  }
  return null;
}

/**
 * 자연어 한 줄 입력에서 금액 / 카테고리 / 메모 / 자산 ID 추출.
 *
 * 규칙:
 * - 콤마 포함 숫자 토큰은 금액. 여러 개면 가장 큰 값.
 * - 카테고리 키워드 사전에 부분 일치하는 첫 토큰의 카테고리 채택.
 * - 자산 후보의 이름이 입력에 substring 으로 나타나면 그 자산 ID 채택 (긴 이름 우선).
 * - 숫자가 아닌 토큰들은 공백으로 합쳐 memo.
 */
export function parseExpense(
  input: string,
  assetCandidates: AssetCandidate[] = [],
): ParsedExpense {
  const trimmed = input.trim();
  if (!trimmed) {
    return { amount: null, category: null, memo: null, asset_id: null };
  }

  const tokens = trimmed.split(/\s+/);
  let amount: number | null = null;
  let category: ExpenseCategoryPreset | null = null;
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

  const asset_id = matchAsset(trimmed, assetCandidates);

  return {
    amount,
    category,
    memo: memoTokens.length > 0 ? memoTokens.join(" ") : null,
    asset_id,
  };
}

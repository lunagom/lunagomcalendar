import { describe, it, expect } from "vitest";
import { parseIncome } from "./income-parser";

describe("parseIncome", () => {
  it("빈 입력 → null 셋", () => {
    expect(parseIncome("")).toEqual({ amount: null, category: null, memo: null, asset_id: null });
  });

  it("'월급 3000000' → 월급 카테고리 + 금액", () => {
    const r = parseIncome("월급 3000000");
    expect(r.amount).toBe(3000000);
    expect(r.category).toBe("월급");
  });

  it("'배당 50000 KB증권' → 투자 카테고리", () => {
    const r = parseIncome("배당 50000 KB증권");
    expect(r.amount).toBe(50000);
    expect(r.category).toBe("투자");
  });

  it("'비트코인 200,000' → 코인 카테고리 + 콤마 금액", () => {
    const r = parseIncome("비트코인 200,000");
    expect(r.amount).toBe(200000);
    expect(r.category).toBe("코인");
  });

  it("'보너스 500000' → 부수입 카테고리", () => {
    const r = parseIncome("보너스 500000");
    expect(r.category).toBe("부수입");
  });

  it("매칭 안 되는 입력 → category null", () => {
    const r = parseIncome("ㅁㄴㅇㄹ 1000");
    expect(r.amount).toBe(1000);
    expect(r.category).toBeNull();
  });

  it("토큰 여러 개 중 큰 숫자 채택", () => {
    const r = parseIncome("월급 3000000 보너스 500000");
    expect(r.amount).toBe(3000000);
  });

  describe("자산 매칭", () => {
    const assets = [
      { id: "ast-shinhan", name: "신한은행" },
      { id: "ast-kb", name: "KB증권" },
    ];

    it("'배당 50000 KB증권' → asset_id KB증권", () => {
      const r = parseIncome("배당 50000 KB증권", assets);
      expect(r.asset_id).toBe("ast-kb");
    });

    it("자산 후보 없으면 null", () => {
      const r = parseIncome("월급 3000000", []);
      expect(r.asset_id).toBeNull();
    });
  });
});

import { describe, it, expect } from "vitest";
import { parseExpense } from "./expense-parser";

describe("parseExpense", () => {
  describe("금액 추출", () => {
    it("'커피 3500' → amount 3500", () => {
      expect(parseExpense("커피 3500").amount).toBe(3500);
    });

    it("천 단위 콤마 처리 '30,000 결혼식'", () => {
      expect(parseExpense("30,000 결혼식").amount).toBe(30000);
    });

    it("백만 단위 콤마 '1,250,000'", () => {
      expect(parseExpense("1,250,000").amount).toBe(1250000);
    });

    it("숫자만 있으면 amount 만 추출", () => {
      const r = parseExpense("3500");
      expect(r.amount).toBe(3500);
    });

    it("여러 숫자가 있을 때 가장 큰 값을 amount", () => {
      // '메모 100 5000' — 100 은 카운트일 가능성, 5000 이 금액
      expect(parseExpense("메모 100 5000").amount).toBe(5000);
    });

    it("숫자 없으면 amount null", () => {
      expect(parseExpense("커피").amount).toBeNull();
    });
  });

  describe("카테고리 매칭", () => {
    it("'커피' → 식비", () => {
      expect(parseExpense("커피 3500").category).toBe("식비");
    });

    it("'점심' → 식비", () => {
      expect(parseExpense("점심 12000").category).toBe("식비");
    });

    it("'지하철' → 교통", () => {
      expect(parseExpense("지하철 1450").category).toBe("교통");
    });

    it("'택시' → 교통", () => {
      expect(parseExpense("택시 8000").category).toBe("교통");
    });

    it("'넷플릭스' → 구독", () => {
      expect(parseExpense("넷플릭스 17000").category).toBe("구독");
    });

    it("'마트' → 쇼핑", () => {
      expect(parseExpense("마트 35000").category).toBe("쇼핑");
    });

    it("'결혼식' → 경조사", () => {
      expect(parseExpense("결혼식 50000").category).toBe("경조사");
    });

    it("매칭 안 되는 단어는 category null", () => {
      // '애매한단어' 는 키워드 사전에 없음
      expect(parseExpense("애매한단어 5000").category).toBeNull();
    });
  });

  describe("메모 추출", () => {
    it("'커피 3500' → memo '커피'", () => {
      expect(parseExpense("커피 3500").memo).toBe("커피");
    });

    it("숫자만 입력하면 memo null", () => {
      expect(parseExpense("3500").memo).toBeNull();
    });

    it("여러 단어는 공백으로 합쳐 memo", () => {
      const r = parseExpense("스타벅스 라떼 5500");
      expect(r.memo).toBe("스타벅스 라떼");
    });
  });

  describe("엣지 케이스", () => {
    it("빈 입력 → 모두 null", () => {
      const r = parseExpense("");
      expect(r.amount).toBeNull();
      expect(r.category).toBeNull();
      expect(r.memo).toBeNull();
    });

    it("공백만 → 모두 null", () => {
      const r = parseExpense("   ");
      expect(r.amount).toBeNull();
      expect(r.category).toBeNull();
      expect(r.memo).toBeNull();
    });

    it("앞뒤 공백 trim", () => {
      const r = parseExpense("  커피 3500  ");
      expect(r.amount).toBe(3500);
      expect(r.category).toBe("식비");
      expect(r.memo).toBe("커피");
    });

    it("카테고리 매칭 토큰도 memo 에 포함 (사용자가 수정 가능)", () => {
      // 사용자 입장에서 '커피' 라고 적었으면 메모도 '커피' 가 자연스러움
      const r = parseExpense("커피 3500");
      expect(r.memo).toBe("커피");
    });
  });
});

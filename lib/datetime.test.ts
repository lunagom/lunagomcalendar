import { describe, it, expect } from "vitest";
import { isoToLocalInput, isoToLocalDateKey } from "./datetime";

// 테스트는 로컬 TZ 에 의존하지 않도록 구성:
// new Date(year, month, day, h, m) 은 항상 로컬 시각의 Date 를 만든다.
// 그 Date 를 .toISOString() 한 뒤 helper 에 통과시키면, 다시 로컬 컴포넌트가
// 정확히 복원되어야 한다 (라운드트립 항등).

describe("isoToLocalInput", () => {
  it("로컬 14:30 일정의 ISO → 14:30 그대로 복원", () => {
    const local = new Date(2026, 4, 26, 14, 30); // 2026-05-26 14:30 (local)
    expect(isoToLocalInput(local.toISOString())).toBe("2026-05-26T14:30");
  });

  it("로컬 새벽 02:00 일정의 ISO → 같은 날 02:00 (전날 22:00 등으로 안 밀림)", () => {
    const local = new Date(2026, 4, 26, 2, 0);
    expect(isoToLocalInput(local.toISOString())).toBe("2026-05-26T02:00");
  });

  it("로컬 자정 00:00 → 자정 그대로", () => {
    const local = new Date(2026, 4, 26, 0, 0);
    expect(isoToLocalInput(local.toISOString())).toBe("2026-05-26T00:00");
  });

  it("로컬 23:59 일정 → 같은 날 23:59 (다음 날로 안 넘어감)", () => {
    const local = new Date(2026, 4, 26, 23, 59);
    expect(isoToLocalInput(local.toISOString())).toBe("2026-05-26T23:59");
  });

  it("월/년 경계: 12월 31일 23:30", () => {
    const local = new Date(2026, 11, 31, 23, 30);
    expect(isoToLocalInput(local.toISOString())).toBe("2026-12-31T23:30");
  });
});

describe("isoToLocalDateKey", () => {
  it("로컬 자정 직후 일정의 ISO → 같은 날짜 키", () => {
    const local = new Date(2026, 4, 26, 0, 30);
    expect(isoToLocalDateKey(local.toISOString())).toBe("2026-05-26");
  });

  it("로컬 23:30 일정의 ISO → 같은 날짜 키 (다음 날로 안 밀림)", () => {
    const local = new Date(2026, 4, 26, 23, 30);
    expect(isoToLocalDateKey(local.toISOString())).toBe("2026-05-26");
  });

  it("종일 일정 (로컬 00:00) → 그 날짜 키", () => {
    const local = new Date(2026, 4, 26, 0, 0);
    expect(isoToLocalDateKey(local.toISOString())).toBe("2026-05-26");
  });
});

// features/calendar/lib/multi-day.ts
import type { EventRow } from "../server/queries";
import { isoToLocalDateKey } from "@/lib/datetime";

export type WeekSegment = {
  event: EventRow;
  /** 주 시작일(일요일) ISO 키. 예: "2026-05-03" */
  weekKey: string;
  /** 그 주 안에서 막대 시작 day index. 0=일, 6=토 */
  startCol: number;
  endCol: number;
  /** 슬롯(주 안에서 위→아래 row 번호). 0부터. */
  slot: number;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 주(일요일 시작) 키. 멀티데이 layer 가 같은 키로 묶임.
 */
export function weekKeyOfDate(d: Date): string {
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay());
  return toIsoLocal(sunday);
}

/**
 * 멀티데이 이벤트(start≠end day)만 주별 segment 로 분할하고
 * 같은 주에 겹치는 segment 끼리 slot(top row) 을 greedy 로 할당.
 * single-day 이벤트는 결과에 포함되지 않는다 — DayCell 이 그대로 표시.
 */
export function buildWeekSegments(events: EventRow[]): WeekSegment[] {
  type Seg = Omit<WeekSegment, "slot">;
  const raw: Seg[] = [];

  for (const e of events) {
    const startKey = isoToLocalDateKey(e.start_at);
    const endKey = isoToLocalDateKey(e.end_at ?? e.start_at);
    if (startKey === endKey) continue;

    const startDate = new Date(`${startKey}T00:00:00`);
    const endDate = new Date(`${endKey}T00:00:00`);

    let cur = new Date(startDate);
    while (cur.getTime() <= endDate.getTime()) {
      const weekStart = new Date(cur);
      weekStart.setDate(cur.getDate() - cur.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const segStart = cur.getTime() > weekStart.getTime() ? cur : weekStart;
      const segEnd =
        endDate.getTime() < weekEnd.getTime() ? endDate : weekEnd;

      raw.push({
        event: e,
        weekKey: toIsoLocal(weekStart),
        startCol: segStart.getDay(),
        endCol: segEnd.getDay(),
      });

      // 다음 주의 일요일
      const next = new Date(weekStart);
      next.setDate(weekStart.getDate() + 7);
      cur = next;
    }
  }

  // 주별 그루핑 + slot 할당
  const byWeek = new Map<string, Seg[]>();
  for (const seg of raw) {
    const arr = byWeek.get(seg.weekKey) ?? [];
    arr.push(seg);
    byWeek.set(seg.weekKey, arr);
  }

  const result: WeekSegment[] = [];
  const allSegs: Seg[][] = Array.from(byWeek.values());
  for (const segs of allSegs) {
    // 긴 segment 먼저 차지 (시각적 안정성)
    segs.sort(
      (a: Seg, b: Seg) =>
        a.startCol - b.startCol ||
        b.endCol - b.startCol - (a.endCol - a.startCol),
    );

    const slots: boolean[][] = [];
    for (const seg of segs) {
      let s = 0;
      while (true) {
        if (!slots[s]) slots[s] = new Array(7).fill(false);
        const slot = slots[s];
        let conflict = false;
        for (let c = seg.startCol; c <= seg.endCol; c++) {
          if (slot[c]) {
            conflict = true;
            break;
          }
        }
        if (!conflict) {
          for (let c = seg.startCol; c <= seg.endCol; c++) slot[c] = true;
          result.push({ ...seg, slot: s });
          break;
        }
        s++;
      }
    }
  }

  return result;
}

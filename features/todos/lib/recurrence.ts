// features/todos/lib/recurrence.ts
// 반복 할 일 — 가상 표시 방식.
// is_recurring=true 행이 "원본". 보드 그릴 때 해당 주의 매칭 요일마다 가상 카드 생성.
// 사용자가 가상 카드를 체크하면 새 row 생성 (is_recurring=false, completed_at=now).
// 같은 날에 동일 제목의 실제 row 가 있으면 가상은 suppress (title 매칭, v1 단순화).

import type { TaskRow } from "../server/queries";

export const WEEKDAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

export type RecurrenceRule = {
  freq: "weekly";
  byday: WeekdayCode[];
};

/** 가상 반복 카드 — 화면 렌더용 임시 객체, DB row 아님. */
export type VirtualTodo = {
  /** synthetic id: "virtual-{parentId}-{dateIso}" */
  id: string;
  parentId: string;
  title: string;
  emoji: string | null;
  scheduled_date: string;
};

export function parseRecurrenceRule(value: unknown): RecurrenceRule | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { freq?: unknown; byday?: unknown };
  if (v.freq !== "weekly") return null;
  if (!Array.isArray(v.byday) || v.byday.length === 0) return null;
  const validCodes: readonly string[] = WEEKDAY_CODES;
  if (!v.byday.every((c): c is WeekdayCode => typeof c === "string" && validCodes.includes(c)))
    return null;
  return { freq: "weekly", byday: v.byday as WeekdayCode[] };
}

/**
 * 한 주(월~일) 의 가상 반복 todo 펼치기.
 * @param recurringTasks is_recurring=true 인 task rows
 * @param realTasks 같은 주의 실제 task rows (가상 suppress 판단용)
 * @param weekStartIso 월요일 ISO
 */
export function unfoldRecurring(
  recurringTasks: TaskRow[],
  realTasks: TaskRow[],
  weekStartIso: string,
): VirtualTodo[] {
  const [y, m, day] = weekStartIso.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(y, m - 1, day + i);
    weekDays.push(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    );
  }

  // 같은 날+제목인 실제 row 가 있으면 가상 suppress
  const realKeys = new Set(
    realTasks.map((t) => `${t.scheduled_date}|${t.title}`),
  );

  const out: VirtualTodo[] = [];
  for (const r of recurringTasks) {
    const rule = parseRecurrenceRule(r.recurrence_rule);
    if (!rule) continue;
    for (let i = 0; i < 7; i++) {
      const dateIso = weekDays[i];
      if (dateIso < r.scheduled_date) continue; // 시작일 이전 skip
      const wdCode = WEEKDAY_CODES[i];
      if (!rule.byday.includes(wdCode)) continue;
      if (realKeys.has(`${dateIso}|${r.title}`)) continue;
      out.push({
        id: `virtual-${r.id}-${dateIso}`,
        parentId: r.id,
        title: r.title,
        emoji: r.emoji,
        scheduled_date: dateIso,
      });
    }
  }
  return out;
}

/** 요일 코드 → 한글 라벨 ("월", "화", ...). UI 표시용. */
export function weekdayCodeLabel(code: WeekdayCode): string {
  const map: Record<WeekdayCode, string> = {
    MO: "월",
    TU: "화",
    WE: "수",
    TH: "목",
    FR: "금",
    SA: "토",
    SU: "일",
  };
  return map[code];
}

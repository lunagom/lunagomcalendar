// features/calendar/lib/event-recurrence.ts
// 반복 일정 (이벤트) — 가상 인스턴스 전개.
// tasks 의 weekly-only 패턴 (features/todos/lib/recurrence.ts) 을
// daily/weekly/monthly + until/count + exceptions 까지 확장한 events 용.

export const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

export type RecurrenceRule =
  | { freq: "daily"; exceptions?: string[] }
  | { freq: "weekly"; byday: WeekdayCode[]; exceptions?: string[] }
  | { freq: "monthly"; bymonthday: number; exceptions?: string[] };

export type VirtualEvent = {
  /** synthetic id: `virtual-{parentId}-{date}` */
  id: string;
  parentId: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  start_at: string;
  end_at: string;
};

type RecurringEventInput = {
  id: string;
  start_at: string;
  end_at: string;
  title: string;
  is_recurring: boolean;
  recurrence_rule: unknown;
  recurrence_until: string | null;
  recurrence_count: number | null;
};

function parseExceptions(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const all = raw.filter((x): x is string => typeof x === "string");
  return all.length > 0 ? all : undefined;
}

export function parseRecurrenceRule(value: unknown): RecurrenceRule | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const exceptions = parseExceptions(v.exceptions);

  if (v.freq === "daily") {
    return exceptions ? { freq: "daily", exceptions } : { freq: "daily" };
  }
  if (v.freq === "weekly") {
    if (!Array.isArray(v.byday) || v.byday.length === 0) return null;
    const codes: readonly string[] = WEEKDAY_CODES;
    if (
      !v.byday.every(
        (c): c is WeekdayCode => typeof c === "string" && codes.includes(c),
      )
    )
      return null;
    const base: RecurrenceRule = { freq: "weekly", byday: v.byday as WeekdayCode[] };
    return exceptions ? { ...base, exceptions } : base;
  }
  if (v.freq === "monthly") {
    if (typeof v.bymonthday !== "number") return null;
    if (v.bymonthday < 1 || v.bymonthday > 31) return null;
    const base: RecurrenceRule = { freq: "monthly", bymonthday: v.bymonthday };
    return exceptions ? { ...base, exceptions } : base;
  }
  return null;
}

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIsoDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 시작일 + 규칙으로부터 [rangeStart, rangeEnd] 사이의 가상 인스턴스 생성.
 * - recurrence_until 도래 시 그 날까지 포함하고 멈춤
 * - recurrence_count 인스턴스 수 도달 시 멈춤 (보이는 범위 내 카운트, 단순화)
 * - exceptions 에 있는 날짜는 skip
 */
export function unfoldRecurringEvent(
  event: RecurringEventInput,
  rangeStartIso: string,
  rangeEndIso: string,
): VirtualEvent[] {
  if (!event.is_recurring) return [];
  const rule = parseRecurrenceRule(event.recurrence_rule);
  if (!rule) return [];

  const startIso = event.start_at.slice(0, 10);
  const effectiveStart = startIso > rangeStartIso ? startIso : rangeStartIso;
  const untilIso = event.recurrence_until ?? "";
  const effectiveEnd =
    untilIso && untilIso < rangeEndIso ? untilIso : rangeEndIso;

  if (effectiveStart > effectiveEnd) return [];

  const exceptions = new Set(rule.exceptions ?? []);
  const maxCount = event.recurrence_count ?? Number.MAX_SAFE_INTEGER;

  const start = parseIsoDateOnly(effectiveStart);
  const end = parseIsoDateOnly(effectiveEnd);

  const out: VirtualEvent[] = [];
  const cur = new Date(start);
  while (cur <= end && out.length < maxCount) {
    const dateIso = isoDate(cur);
    let matches = false;
    if (rule.freq === "daily") {
      matches = true;
    } else if (rule.freq === "weekly") {
      const wd = WEEKDAY_CODES[cur.getDay()];
      matches = rule.byday.includes(wd);
    } else if (rule.freq === "monthly") {
      matches = cur.getDate() === rule.bymonthday;
    }
    if (matches && dateIso >= startIso && !exceptions.has(dateIso)) {
      out.push({
        id: `virtual-${event.id}-${dateIso}`,
        parentId: event.id,
        date: dateIso,
        title: event.title,
        start_at: event.start_at,
        end_at: event.end_at,
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

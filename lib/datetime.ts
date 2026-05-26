// 로컬(KST) 시각과 ISO UTC 문자열을 안전하게 변환.
// DB 의 timestamptz 는 UTC 로 저장되므로, datetime-local input 이나 day-key 로
// 쓸 때는 반드시 로컬로 변환해야 한다. 단순 .slice(0,16) / .slice(0,10) 는
// UTC 시각의 문자 일부를 자르는 것이라 -9 시간만큼 어긋난다.

const pad = (n: number): string => String(n).padStart(2, "0");

/** ISO UTC 문자열 → `<input type="datetime-local">` 값 ("YYYY-MM-DDTHH:mm"). */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO UTC 문자열 → 로컬 날짜 키 ("YYYY-MM-DD"). 캘린더 셀 그룹핑용. */
export function isoToLocalDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

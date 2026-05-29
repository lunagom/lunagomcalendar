/**
 * 원화 컴팩트 표기.
 * - |n| < 10_000      → "₩1,234"      (천 단위 콤마)
 * - |n| < 1_000_000   → "₩12K"        (천 단위 약식, 정수)
 * - |n| < 1_000_000_000 → "₩1.2M"     (백만 단위 한 자리 소수)
 * - 그 이상             → "₩1.2B"     (십억)
 *
 * 음수면 부호 유지.
 */
export function formatKrwCompact(n: number): string {
  if (n === 0) return "₩0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 10_000) return `${sign}₩${abs.toLocaleString("ko-KR")}`;
  if (abs < 1_000_000) {
    const k = abs / 1000;
    const formatted = k >= 100 ? Math.round(k).toString() : k.toFixed(0);
    return `${sign}₩${formatted}K`;
  }
  if (abs < 1_000_000_000) {
    const m = abs / 1_000_000;
    return `${sign}₩${m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  const b = abs / 1_000_000_000;
  return `${sign}₩${b.toFixed(1).replace(/\.0$/, "")}B`;
}

/** 부호 prefix 가 양수면 "+" 추가 (지출/수입 delta 표기용). */
export function formatKrwCompactWithSign(n: number): string {
  if (n > 0) return `+${formatKrwCompact(n)}`;
  return formatKrwCompact(n);
}

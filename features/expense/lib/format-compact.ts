/**
 * 원화 한국식 표기.
 * - |n| < 10_000              → "1,234원"     (천 단위 콤마)
 * - |n| < 100_000_000 (1억)   → "32만원"      (만 단위 반올림)
 * - 그 이상                    → "1.2억원"    (억 단위 한 자리 소수)
 *
 * 음수면 부호 유지.
 */
export function formatKrwCompact(n: number): string {
  if (n === 0) return "0원";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (abs < 10_000) return `${sign}${abs.toLocaleString("ko-KR")}원`;

  if (abs < 100_000_000) {
    const man = Math.round(abs / 10_000);
    return `${sign}${man.toLocaleString("ko-KR")}만원`;
  }

  const eok = abs / 100_000_000;
  return `${sign}${eok.toFixed(1).replace(/\.0$/, "")}억원`;
}

/** 부호 prefix 가 양수면 "+" 추가 (순수익 delta 표기용). */
export function formatKrwCompactWithSign(n: number): string {
  if (n > 0) return `+${formatKrwCompact(n)}`;
  return formatKrwCompact(n);
}

// Presentation-only formatting. Never computes domain values.

export function formatAed(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `AED ${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `AED ${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `AED ${(value / 1e3).toFixed(0)}K`;
  return `AED ${value.toFixed(0)}`;
}

export function formatDays(days: number | null | undefined): string {
  if (days === null || days === undefined || !Number.isFinite(days)) return "—";
  return `${days.toFixed(1)}d`;
}

export function formatSigned(value: number, digits = 1): string {
  const fixed = value.toFixed(digits);
  if (Number(fixed) === 0) return (0).toFixed(digits);
  return value > 0 ? `+${fixed}` : fixed;
}

export function formatCompact(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

const GST = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dubai",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Time of day in Gulf Standard Time (UTC+4). */
export function formatGst(iso: string | Date): string {
  return GST.format(typeof iso === "string" ? new Date(iso) : iso);
}

export function humanizeChokepoint(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => (["el", "of"].includes(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase())
    .replace("Bab el Mandeb", "Bab el-Mandeb");
}

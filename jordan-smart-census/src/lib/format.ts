import type { Locale } from "@/types/census";

/** Western digits are used in both languages for data-dense tables (common practice in Jordanian statistical releases). */
const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const fmtInt = (n: number) => (Number.isFinite(n) ? nf0.format(Math.round(n)) : "—");
export const fmt1 = (n: number) => (Number.isFinite(n) ? nf1.format(n) : "—");
export const fmtPct = (x: number, d = 1) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : "—");
export const fmtSigned = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmtInt(Math.abs(n));
export const fmtSignedPct = (x: number, d = 1) => (x > 0 ? "+" : x < 0 ? "−" : "") + `${Math.abs(x * 100).toFixed(d)}%`;

export function fmtCompact(n: number, locale: Locale): string {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}${locale === "ar" ? " مليون" : "M"}`;
  if (a >= 1e4) return `${sign}${(a / 1e3).toFixed(0)}${locale === "ar" ? " ألف" : "k"}`;
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(1)}${locale === "ar" ? " ألف" : "k"}`;
  return `${sign}${Math.round(a)}`;
}

export function fmtDateTime(d: Date, locale: Locale) {
  return d.toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(d: Date | string, locale: Locale) {
  const x = typeof d === "string" ? new Date(`${d}T00:00:00`) : d;
  return x.toLocaleDateString(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

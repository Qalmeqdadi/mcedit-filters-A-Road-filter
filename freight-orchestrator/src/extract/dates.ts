// Dates as people write them in freight email: "20 September", "Sep 20", "20/09", "24/09/2026",
// "25-Sep-2026", "2026-10-05", "the twenty fourth". Year and month are inferred from a reference date.

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18,
  nineteenth: 19, twentieth: 20, "twenty first": 21, "twenty second": 22, "twenty third": 23, "twenty fourth": 24, "twenty fifth": 25,
  "twenty sixth": 26, "twenty seventh": 27, "twenty eighth": 28, "twenty ninth": 29, thirtieth: 30, "thirty first": 31,
};

const monthIdx = (s: string) => MONTHS.indexOf(s.slice(0, 3).toLowerCase());
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export interface FoundDate {
  /** ISO date, yyyy-mm-dd. */
  date: string;
  start: number;
  end: number;
  /** Lower when the year or month was inferred or the day was spelled out. */
  confidence: number;
}

const MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

const PATTERNS: { re: RegExp; read: (m: RegExpExecArray, ref: Date) => [number, number, number, number] | null }[] = [
  // 2026-10-05
  { re: /\b(20\d\d)-(\d\d)-(\d\d)\b/g, read: (m) => [+m[1]!, +m[2]! - 1, +m[3]!, 0.99] },
  // 25-Sep-2026, 25 Sep 2026, 20th of September 2026
  { re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?[\\s-]+${MON}[\\s-]+(20\\d\\d)\\b`, "gi"), read: (m) => [+m[3]!, monthIdx(m[2]!), +m[1]!, 0.98] },
  // Sep 20, 2026
  { re: new RegExp(`\\b${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d\\d)\\b`, "gi"), read: (m) => [+m[3]!, monthIdx(m[1]!), +m[2]!, 0.98] },
  // 24/09/2026, 24.09.2026 (day first: the convention on GCC, Asia and Europe lanes)
  // A day above 12 can only be day-first, so it is certain; 05/10 could be either and stays below review thresholds.
  { re: /\b(\d{1,2})[/.](\d{1,2})[/.](20\d\d)\b/g, read: (m) => [+m[3]!, +m[2]! - 1, +m[1]!, +m[1]! > 12 ? 0.97 : 0.85] },
  // 20 September, 20th of September
  { re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?\\s+${MON}\\b(?![\\s-]+20\\d\\d)`, "gi"), read: (m, ref) => [ref.getUTCFullYear(), monthIdx(m[2]!), +m[1]!, 0.92] },
  // Sep 20
  { re: new RegExp(`\\b${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!,?\\s+20\\d\\d)`, "gi"), read: (m, ref) => [ref.getUTCFullYear(), monthIdx(m[1]!), +m[2]!, 0.9] },
  // 24/09
  { re: /\b(\d{1,2})\/(\d{1,2})\b(?![/.]\d)/g, read: (m, ref) => [ref.getUTCFullYear(), +m[2]! - 1, +m[1]!, +m[1]! > 12 ? 0.93 : 0.8] },
  // the twenty fourth (voice transcripts)
  { re: new RegExp(`\\bthe\\s+(${Object.keys(ORDINALS).sort((a, b) => b.length - a.length).join("|")})\\b`, "gi"), read: (m, ref) => {
    const d = ORDINALS[m[1]!.toLowerCase().replace(/-/g, " ")];
    return d ? [ref.getUTCFullYear(), ref.getUTCMonth(), d, 0.72] : null;
  } },
];

/** All dates in the text, earliest position first, overlapping matches removed. */
export function findDates(text: string, ref: Date): FoundDate[] {
  const out: FoundDate[] = [];
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.re.exec(text))) {
      const start = m.index, end = m.index + m[0].length;
      if (out.some((o) => start < o.end && end > o.start)) continue;
      const r = p.read(m, ref);
      if (!r) continue;
      let [y, mo, d, conf] = r;
      if (mo < 0 || mo > 11 || d < 1 || d > 31) continue;
      // An inferred year that lands well in the past means next year (a December email about January).
      if (conf < 0.95 && Date.UTC(y, mo, d) < ref.getTime() - 60 * 864e5) y += 1;
      out.push({ date: iso(y, mo, d), start, end, confidence: conf });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

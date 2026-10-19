// Governorate connector (build time): official Department of Statistics (DoS) labour-market figures
// by governorate, read from an audited public mirror of the DoS files
// (github.com/musab-abukaraki-66/jordanian-unemployment-2025-2026, original files unmodified, SHA-256 listed).
//
//   1. PxWeb tables EMPALL / EMPALL1 (jorinfo.dos.gov.jo): employed and unemployed Jordanians 15+ by
//      governorate, annual 2017–2025 → OFFICIAL counts; the rate is DERIVED (unemployed ÷ labour force).
//   2. Quarterly Labour Force Survey releases (dosweb.dos.gov.jo, PDF): unemployment rate by governorate
//      for the whole population and for Jordanians → OFFICIAL published rates, read from the chart labels
//      by x-position (needs poppler `pdftotext`). Each quarter is checked against the release's own text
//      (highest / lowest governorate).
//
// Writes src/data/governorates.generated.ts.   node scripts/fetch-governorate-data.mjs
import { writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

const MIRROR = "https://raw.githubusercontent.com/musab-abukaraki-66/jordanian-unemployment-2025-2026/main/08_Jordanian_Unemployment_Truth/01_Raw";
// DoS governorate codes → platform ids (DoS publication order)
const DOS = { 11: "AMM", 12: "BAL", 13: "ZAR", 14: "MAD", 21: "IRB", 22: "MAF", 23: "JER", 24: "AJL", 31: "KAR", 32: "TAF", 33: "MAN", 34: "AQB" };
const ORDER = Object.values(DOS);
const NAME = { AMM: "Amman", BAL: "Balqa", ZAR: "Zarqa", MAD: "Madaba", IRB: "Irbid", MAF: "Mafraq", JER: "J[ae]rash", AJL: "Ajloun", KAR: "Karak", TAF: "Tafi", MAN: "Ma.an", AQB: "Aqaba" };
const QUARTERS = [
  { period: "2025-Q3", file: "unemp_Q3_2025_en.pdf" },
  { period: "2025-Q4", file: "unemp_Q4_2025_en.pdf" },
  { period: "2026-Q1", file: "unemp_Q1_2026_en.pdf" },
  { period: "2026-Q2", file: "unemp_Q2_2026_en.pdf" },
];

const sha = (buf) => createHash("sha256").update(buf).digest("hex");
async function get(name) {
  const [file, meta] = await Promise.all([
    fetch(`${MIRROR}/${name}`).then(async (r) => { if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); }),
    fetch(`${MIRROR}/${name}.meta.json`).then((r) => r.json()),
  ]);
  const h = sha(file);
  if (meta.sha256 && meta.sha256 !== h) throw new Error(`${name}: checksum mismatch (${h} vs ${meta.sha256})`);
  return { file, meta: { url: meta.url, retrieved: meta.retrieved, sha256: h } };
}

// json-stat: dimension order PEA × GOV × TIME, PEA has one category
function pxByGov(json) {
  const d = json.dataset;
  const govs = Object.entries(d.dimension.GOV.category.index).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  const years = Object.entries(d.dimension.TIME.category.index).sort((a, b) => a[1] - b[1]).map(([k]) => +k);
  const out = {};
  govs.forEach((g, gi) => { out[DOS[g]] = years.map((y, ti) => [y, d.value[gi * years.length + ti]]); });
  return { years, byGov: out, label: d.label, updated: d.updated };
}

// chart values on the page whose "Figure n" title mentions Governorate, ordered by x
function pdfFigures(buf) {
  const dir = mkdtempSync(path.join(tmpdir(), "dos-"));
  const f = path.join(dir, "r.pdf");
  writeFileSync(f, buf);
  const html = execFileSync("pdftotext", ["-bbox", f, "-"], { encoding: "utf8", maxBuffer: 64 << 20 });
  const text = execFileSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8", maxBuffer: 64 << 20 }).replace(/\s+/g, " ");
  const figs = [];
  for (const page of html.split("<page ")) {
    const ws = [...page.matchAll(/xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="[\d.]+">([^<]+)<\/word>/g)].map((m) => ({ x: +m[1], y: +m[2], w: m[3] }));
    ws.forEach((w, i) => {
      if (!/^Figure/.test(w.w)) return;
      const title = ws.slice(i, i + 12).map((x) => x.w).join(" ");
      if (!/Governorate/.test(title)) return;
      const nums = ws.filter((x) => /^\d+\.\d$/.test(x.w) && x.y > w.y && x.y < w.y + 260 && +x.w < 60).sort((a, b) => a.x - b.x).map((x) => +x.w);
      // drop y-axis ticks (multiples of 5 stacked at the left edge in some releases)
      const ticks = [35, 30, 25, 20, 15, 10, 5, 0];
      const vals = nums.slice(0, 8).every((v, k) => v === ticks[k]) ? nums.slice(8) : nums;
      figs.push({ title, jordanians: /Jordanians/i.test(title), vals });
    });
  }
  return { figs, text };
}

// The release names the highest and lowest governorate in its text, first for the whole population, then
// for Jordanians: the chart reading must agree with both.
function named(text, which) {
  return [...text.matchAll(new RegExp(`${which}[^.]{0,90}?(?:recorded|was) in ((?:Al-)?[A-Z][A-Za-z\u2019']+)`, "g"))].map((m) => m[1]);
}
function check(period, kind, vals, text, k) {
  if (vals.length < 12) throw new Error(`${period} ${kind}: ${vals.length} bars`);
  const v = vals.slice(0, 12);
  const hi = ORDER[v.indexOf(Math.max(...v))];
  const lo = ORDER[v.indexOf(Math.min(...v))];
  const [h, l] = [named(text, "highest")[k], named(text, "lowest")[k]];
  const ok = new RegExp(NAME[hi], "i").test(h ?? "") && new RegExp(NAME[lo], "i").test(l ?? "");
  console.log(`${period} ${kind.padEnd(10)} ${v.join(" ")}  national ${vals[12] ?? "—"}  high ${hi} low ${lo}  text: ${h}/${l} ${ok ? "✓" : "✗"}`);
  if (!ok) throw new Error(`${period} ${kind}: extremes do not match the release text`);
  return { byGov: Object.fromEntries(ORDER.map((g, i) => [g, v[i]])), national: vals[12] ?? null };
}

const emp = await get("PX_EMPALL_GOV.json");
const une = await get("PX_EMPALL1_GOV.json");
const E = pxByGov(JSON.parse(emp.file.toString("utf8")));
const U = pxByGov(JSON.parse(une.file.toString("utf8")));
const annual = Object.fromEntries(ORDER.map((g) => [g, E.byGov[g].map(([y, e], i) => { const u = U.byGov[g][i][1]; return { year: y, employed: e, unemployed: u, rate: +((u / (e + u)) * 100).toFixed(2) }; })]));
const quarterly = [];
for (const q of QUARTERS) {
  const { file, meta } = await get(q.file);
  const { figs, text } = pdfFigures(file);
  const pop = figs.find((f) => !f.jordanians);
  const jor = figs.find((f) => f.jordanians);
  if (!pop || !jor) throw new Error(`${q.period}: governorate figures not found`);
  const p = check(q.period, "population", pop.vals, text, 0);
  // some releases do not label the national bar: take the headline sentence instead
  if (p.national === null) { const m = text.match(/(?:UERATE|UNRATE|unemployment rate) (?:for the total population in Jordan to reach|reached) (\d+\.\d)%/i); p.national = m ? +m[1] : null; }
  const j = check(q.period, "jordanians", jor.vals, text, 1);
  quarterly.push({ period: q.period, total: p, jordanians: j, source: meta });
}

const out = {
  fetchedAt: new Date().toISOString(),
  annual: { label: `${E.label} / ${U.label}`, updated: E.updated, years: E.years, byGov: annual, sources: [emp.meta, une.meta] },
  quarterly,
};
writeFileSync(new URL("../src/data/governorates.generated.ts", import.meta.url), `// Generated by scripts/fetch-governorate-data.mjs — do not edit by hand.\nimport type { GovernorateLabour } from "./governorates";\n\nexport const GOV_LABOUR: GovernorateLabour = ${JSON.stringify(out)};\n`);
console.log(`\nannual ${E.years[0]}–${E.years.at(-1)} × 12 governorates; ${quarterly.length} quarters`);

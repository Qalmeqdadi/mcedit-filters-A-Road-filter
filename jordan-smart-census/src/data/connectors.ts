/**
 * Data connectors framework.
 *
 * A connector brings an external dataset into UFUQ with its provenance. Four kinds:
 *  - EMBEDDED   reference data bundled with the build (boundaries, DoS population estimates)
 *  - OPEN       open-data mirrors fetched at build time and refreshable from the browser
 *  - IMPORT     an official table supplied by the user (CSV), validated, then applied to the models
 *  - PLANNED    a production source with its contract defined but not connected here (needs network
 *               access or credentials); listed so the integration path is explicit
 *
 * Imported values replace modelled values only where present, and every page that uses them says so.
 */
import { z } from "zod";
import type { GovId, L } from "@/types/census";
import { GOV_ORDER } from "./reference";
import type { DataOverrides } from "@/simulation/lab/actions";
import type { ElectricityYear, OpenData, YearValue } from "./openData";

export type ConnectorKind = "EMBEDDED" | "OPEN" | "IMPORT" | "PLANNED";

export interface ConnectorDef {
  id: string;
  kind: ConnectorKind;
  name: L;
  provider: string;
  feeds: L; // which models / pages use it
  sourceIds: string[]; // provenance registry ids
  href?: string;
  needs?: L; // for PLANNED connectors
}

export const CONNECTORS: ConnectorDef[] = [
  { id: "geo", kind: "EMBEDDED", name: { en: "Administrative boundaries (ADM0–ADM2)", ar: "الحدود الإدارية (المستويات 0–2)" }, provider: "geoBoundaries gbOpen", feeds: { en: "Maps, enumeration areas, every district statistic", ar: "الخرائط ومناطق العدّ وكل إحصاءات الألوية" }, sourceIds: ["GEO_ADM1", "GEO_ADM2"], href: "/gis" },
  { id: "dos-pop", kind: "EMBEDDED", name: { en: "Governorate population estimates 2024", ar: "تقديرات سكان المحافظات 2024" }, provider: "Department of Statistics (as reported in secondary sources)", feeds: { en: "Census frame, projections, all per-capita indicators", ar: "إطار التعداد والإسقاطات وكل المؤشرات للفرد" }, sourceIds: ["REF_GOV_POP"], href: "/methodology" },
  { id: "census-2015", kind: "EMBEDDED", name: { en: "Census 2015 reference totals", ar: "المجاميع المرجعية لتعداد 2015" }, provider: "Department of Statistics", feeds: { en: "Cross-checks of the simulated census", ar: "التحقق المتقاطع من التعداد المحاكى" }, sourceIds: ["REF_CENSUS_2015"], href: "/methodology" },
  { id: "wb-gdp", kind: "OPEN", name: { en: "GDP (current US$)", ar: "الناتج المحلي الإجمالي (دولار جارٍ)" }, provider: "World Bank WDI · github.com/datasets/gdp", feeds: { en: "Regional economy calibration → finance, equity, action plans", ar: "معايرة الاقتصاد الإقليمي ← المالية والعدالة وخطط العمل" }, sourceIds: ["OPEN_WB_GDP"], href: "/economy" },
  { id: "wb-pop", kind: "OPEN", name: { en: "Population (total)", ar: "السكان (الإجمالي)" }, provider: "World Bank WDI · github.com/datasets/population", feeds: { en: "National cross-check of the census frame", ar: "تحقق وطني من إطار التعداد" }, sourceIds: ["REF_WB_POP"], href: "/methodology" },
  { id: "wb-cpi", kind: "OPEN", name: { en: "Consumer price inflation", ar: "التضخم في أسعار المستهلك" }, provider: "World Bank WDI · github.com/datasets/inflation", feeds: { en: "Context for cost estimates", ar: "سياق لتقديرات الكلفة" }, sourceIds: ["OPEN_WB_CPI"] },
  { id: "owid-energy", kind: "OPEN", name: { en: "Electricity demand and generation mix", ar: "الطلب على الكهرباء ومزيج التوليد" }, provider: "Our World in Data · github.com/owid/energy-data", feeds: { en: "Energy model calibration, SDG 7.2", ar: "معايرة نموذج الطاقة، الهدف 7.2" }, sourceIds: ["OPEN_OWID_ENERGY"], href: "/energy" },
  { id: "imp-dos-pop", kind: "IMPORT", name: { en: "Official governorate population (DoS file)", ar: "سكان المحافظات الرسمي (ملف الدائرة)" }, provider: "Department of Statistics", feeds: { en: "Rebuilds the census frame (Methodology → import adapter)", ar: "يعيد بناء إطار التعداد (المنهجية ← محوّل الاستيراد)" }, sourceIds: ["REF_GOV_POP"], href: "/methodology" },
  { id: "imp-grp", kind: "IMPORT", name: { en: "Output (GRP) by governorate", ar: "الناتج حسب المحافظة" }, provider: "DoS / Ministry of Planning", feeds: { en: "Economy shares → finance, equity, action plans", ar: "حصص الاقتصاد ← المالية والعدالة وخطط العمل" }, sourceIds: ["SIM_ECONOMY"], href: "/economy" },
  { id: "imp-peak", kind: "IMPORT", name: { en: "Peak electricity demand by governorate (MW)", ar: "حمل الذروة الكهربائي حسب المحافظة (ميغاواط)" }, provider: "NEPCO / distribution companies", feeds: { en: "Energy model, grid actions", ar: "نموذج الطاقة وإجراءات الشبكة" }, sourceIds: ["SIM_ENERGY"], href: "/energy" },
  { id: "imp-capacity", kind: "IMPORT", name: { en: "Grid (substation) capacity by governorate (MW)", ar: "سعة الشبكة (المحطات) حسب المحافظة (ميغاواط)" }, provider: "NEPCO / distribution companies", feeds: { en: "Energy model, grid actions", ar: "نموذج الطاقة وإجراءات الشبكة" }, sourceIds: ["SIM_ENERGY"], href: "/energy" },
  { id: "imp-revenue", kind: "IMPORT", name: { en: "Municipal own-source revenue per resident (JOD)", ar: "الإيرادات البلدية الذاتية للفرد (دينار)" }, provider: "Ministry of Local Administration", feeds: { en: "Municipal finance, finance actions", ar: "المالية المحلية وإجراءات التمويل" }, sourceIds: ["SIM_FINANCE"], href: "/municipal-finance" },
  { id: "pl-dos-api", kind: "PLANNED", name: { en: "DoS statistical database", ar: "قاعدة بيانات دائرة الإحصاءات" }, provider: "Department of Statistics", feeds: { en: "Replaces reference and simulated census tables", ar: "تحل محل الجداول المرجعية والمحاكاة" }, sourceIds: [], needs: { en: "Network access to the DoS portal and a data-sharing agreement", ar: "وصول شبكي لبوابة الدائرة واتفاقية مشاركة بيانات" } },
  { id: "pl-emis", kind: "PLANNED", name: { en: "School inventory (EMIS)", ar: "سجل المدارس (نظام إدارة المعلومات التربوية)" }, provider: "Ministry of Education", feeds: { en: "Facility siting, school seat gaps", ar: "مواقع المرافق وفجوات المقاعد" }, sourceIds: ["SIM_FACILITIES"], needs: { en: "Credentials for the EMIS export", ar: "صلاحيات لتصدير بيانات النظام" } },
  { id: "pl-moh", kind: "PLANNED", name: { en: "Health facilities register", ar: "سجل المرافق الصحية" }, provider: "Ministry of Health", feeds: { en: "Primary care and hospital capacity", ar: "طاقة الرعاية الأولية والمستشفيات" }, sourceIds: ["SIM_FACILITIES"], needs: { en: "Facility list with capacity and coordinates", ar: "قائمة المرافق مع الطاقة والإحداثيات" } },
  { id: "pl-water", kind: "PLANNED", name: { en: "Water supply and non-revenue water", ar: "إمدادات المياه والفاقد" }, provider: "Ministry of Water & Irrigation / WAJ", feeds: { en: "Water security model", ar: "نموذج الأمن المائي" }, sourceIds: ["SIM_WATER"], needs: { en: "Governorate supply and NRW series", ar: "سلاسل الإمداد والفاقد حسب المحافظة" } },
  { id: "pl-dem", kind: "PLANNED", name: { en: "Elevation and land cover", ar: "الارتفاعات والغطاء الأرضي" }, provider: "Copernicus DEM / ESA WorldCover", feeds: { en: "Replaces the illustrative terrain constraints", ar: "يحل محل قيود التضاريس التوضيحية" }, sourceIds: ["SIM_LAND"], needs: { en: "Raster processing outside the browser (tiles exceed the page size limit)", ar: "معالجة نقطية خارج المتصفح (تتجاوز البلاطات حجم الصفحة)" } },
  { id: "pl-climate", kind: "PLANNED", name: { en: "Observed and projected temperature", ar: "درجات الحرارة المرصودة والمسقطة" }, provider: "Jordan Meteorological Department / ERA5", feeds: { en: "Heat-risk classes", ar: "فئات خطر الحر" }, sourceIds: ["SIM_CLIMATE"], needs: { en: "Station data or reanalysis extracts", ar: "بيانات المحطات أو مستخلصات إعادة التحليل" } },
];

// ------------------------------------------------------------------ user imports

export type ImportField = keyof DataOverrides;

export interface ImportDataset {
  id: string; // connector id
  field: ImportField;
  unit: L;
  min: number;
  max: number;
  example: Partial<Record<GovId, number>>;
}

export const IMPORT_DATASETS: ImportDataset[] = [
  { id: "imp-grp", field: "grpShare", unit: { en: "JOD million (any consistent unit — shares are used)", ar: "مليون دينار (أي وحدة متسقة — تُستخدم الحصص)" }, min: 0, max: 1e7, example: { AMM: 15800, IRB: 4300 } },
  { id: "imp-peak", field: "peakMW", unit: { en: "MW", ar: "ميغاواط" }, min: 1, max: 20000, example: { AMM: 1900, IRB: 790 } },
  { id: "imp-capacity", field: "capacityMW", unit: { en: "MW", ar: "ميغاواط" }, min: 1, max: 40000, example: { AMM: 2500, IRB: 1000 } },
  { id: "imp-revenue", field: "ownRevenuePc", unit: { en: "JOD per resident per year", ar: "دينار للفرد سنوياً" }, min: 0, max: 2000, example: { AMM: 62, IRB: 45 } },
];

export interface ImportedDataset {
  id: string;
  fileName: string;
  importedAt: string;
  values: Partial<Record<GovId, number>>;
}

export interface ValidationResult {
  ok: boolean;
  values: Partial<Record<GovId, number>>;
  issues: { row: number; message: L; level: "error" | "warning" }[];
}

const GOV_ALIASES: Record<string, GovId> = {};
export function registerGovAliases(govs: { id: GovId; name: L; iso: string }[]) {
  for (const g of govs) {
    for (const k of [g.id, g.iso, g.name.en, g.name.ar, g.name.en.replace(/^Al-|^Az-|^Ma'an$/i, "")]) GOV_ALIASES[k.trim().toLowerCase()] = g.id;
  }
}

const rowSchema = z.object({ governorate: z.string().min(1), value: z.coerce.number().finite() });

/** Parse "governorate,value" CSV (header optional; governorate = id, ISO code, English or Arabic name). */
export function validateImport(ds: ImportDataset, text: string): ValidationResult {
  const issues: ValidationResult["issues"] = [];
  const values: Partial<Record<GovId, number>> = {};
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  lines.forEach((line, i) => {
    const cells = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (i === 0 && cells[1] && Number.isNaN(Number(cells[1]))) return; // header
    const parsed = rowSchema.safeParse({ governorate: cells[0], value: cells[1] });
    if (!parsed.success) { issues.push({ row: i + 1, level: "error", message: { en: "Expected “governorate,number”.", ar: "المتوقع «محافظة،رقم»." } }); return; }
    const gid = GOV_ALIASES[parsed.data.governorate.toLowerCase()];
    if (!gid) { issues.push({ row: i + 1, level: "error", message: { en: `Unknown governorate “${parsed.data.governorate}”.`, ar: `محافظة غير معروفة «${parsed.data.governorate}».` } }); return; }
    if (parsed.data.value < ds.min || parsed.data.value > ds.max) { issues.push({ row: i + 1, level: "error", message: { en: `Value ${parsed.data.value} is outside the plausible range ${ds.min}–${ds.max}.`, ar: `القيمة ${parsed.data.value} خارج النطاق المعقول ${ds.min}–${ds.max}.` } }); return; }
    if (values[gid] !== undefined) issues.push({ row: i + 1, level: "warning", message: { en: `Duplicate row for ${gid}; the last value is used.`, ar: `صف مكرر لـ ${gid}؛ تُستخدم القيمة الأخيرة.` } });
    values[gid] = parsed.data.value;
  });
  const n = Object.keys(values).length;
  if (n === 0) issues.push({ row: 0, level: "error", message: { en: "No valid rows.", ar: "لا صفوف صالحة." } });
  else if (n < GOV_ORDER.length) issues.push({ row: 0, level: "warning", message: { en: `${GOV_ORDER.length - n} governorates missing — modelled values are kept for them.`, ar: `${GOV_ORDER.length - n} محافظات مفقودة — تبقى القيم المنمذجة لها.` } });
  if (ds.field === "grpShare" && n > 0 && n < GOV_ORDER.length) issues.push({ row: 0, level: "error", message: { en: "Output shares need all 12 governorates.", ar: "تحتاج حصص الناتج إلى المحافظات الاثنتي عشرة كلها." } });
  return { ok: !issues.some((x) => x.level === "error"), values, issues };
}

export function templateCsv(ds: ImportDataset) {
  return ["governorate,value", ...GOV_ORDER.map((g) => `${g},${ds.example[g] ?? ""}`)].join("\r\n");
}

export function overridesFrom(imports: Record<string, ImportedDataset>): DataOverrides {
  const o: DataOverrides = {};
  for (const ds of IMPORT_DATASETS) {
    const imp = imports[ds.id];
    if (imp && Object.keys(imp.values).length) o[ds.field] = imp.values;
  }
  return o;
}

// ------------------------------------------------------------------ runtime open-data refresh

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const split = (l: string) => {
    const out: string[] = [];
    let cur = "", q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const head = split(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v])));
}

const num = (v: string | undefined) => (v === undefined || v === "" ? null : Number(v));

/** Fetch the open-data mirrors from the browser. Rejects when the page may not reach them. */
export async function refreshOpenData(prev: OpenData): Promise<OpenData> {
  const next: OpenData = { ...prev, fetchedAt: new Date().toISOString(), sources: [] };
  for (const s of prev.sources) {
    const r = await fetch(s.url, { cache: "no-store" });
    if (!r.ok) throw new Error(`${s.id}: HTTP ${r.status}`);
    const rows = parseCsv(await r.text());
    let picked: (YearValue | ElectricityYear)[] = [];
    if (s.id === "OPEN_WB_GDP") picked = next.gdpUsd = rows.filter((x) => x["Country Code"] === "JOR").map((x) => ({ year: +x.Year, value: +x.Value }));
    if (s.id === "OPEN_WB_POP") picked = next.population = rows.filter((x) => x["Country Code"] === "JOR").map((x) => ({ year: +x.Year, value: +x.Value }));
    if (s.id === "OPEN_WB_CPI") picked = next.inflation = rows.filter((x) => x["Country Code"] === "JOR").map((x) => ({ year: +x.Year, value: +x.Inflation }));
    if (s.id === "OPEN_OWID_ENERGY") picked = next.electricity = rows.filter((x) => x.country === "Jordan" && +x.year >= 2000 && x.electricity_demand !== "").map((x) => ({ year: +x.year, demandTWh: num(x.electricity_demand), generationTWh: num(x.electricity_generation), renewablesShare: num(x.renewables_share_elec), solarShare: num(x.solar_share_elec), perCapitaKWh: num(x.per_capita_electricity), netImportsTWh: num(x.net_elec_imports), ghgMt: num(x.greenhouse_gas_emissions) }));
    picked.sort((a, b) => a.year - b.year);
    if (!picked.length) throw new Error(`${s.id}: no Jordan rows`);
    next.sources.push({ ...s, rows: picked.length, firstYear: picked[0].year, lastYear: picked[picked.length - 1].year, sha256: "runtime" });
  }
  return next;
}

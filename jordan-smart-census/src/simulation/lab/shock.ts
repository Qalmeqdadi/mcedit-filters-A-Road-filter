/**
 * Shock response simulator — sudden population inflow, week by week (SIMULATED).
 *
 * Arrivals follow a gamma-shaped curve (peak week, spread) and are split across governorates by a
 * destination pattern. Camps absorb arrivals up to their capacity; the rest settle in host communities.
 *
 * Capacity per governorate, from the census frame and the Planning Lab inventory:
 *   housing   rentable vacant dwellings = vacant dwellings (census frame) × rentable share × 5.5 persons
 *   schools   seats in the synthetic school inventory (× 1.6 once double shifts are active)
 *   health    primary-care catchment capacity (+ 6,000 residents per mobile clinic once deployed)
 *   water     delivered litres / person / day = base supply ÷ (residents + arrivals) (+ trucking)
 * Stress = demand ÷ capacity for each sector (water: 80 l/p/d minimum ÷ delivered). A breach is a stress
 * ≥ 1 that is also ≥ 5 points above the pre-shock level (so existing gaps are not blamed on the shock).
 * Recommendations are rule-based and only proposed — a human decides.
 */
import type { GovId, L } from "@/types/census";
import type { World } from "../generate";
import type { SmallArea } from "./common";
import type { SitingAnalysis } from "./facilities";

export type ShockSector = "HOUSING" | "EDUCATION" | "HEALTH" | "WATER";
export const SHOCK_SECTORS: ShockSector[] = ["HOUSING", "EDUCATION", "HEALTH", "WATER"];

export type Destination = "NORTH" | "URBAN" | "SOUTH";

export const DESTINATIONS: Record<Destination, Partial<Record<GovId, number>>> = {
  NORTH: { MAF: 0.42, IRB: 0.28, ZAR: 0.12, AMM: 0.12, JER: 0.03, AJL: 0.03 },
  URBAN: { AMM: 0.42, ZAR: 0.2, IRB: 0.18, BAL: 0.08, MAF: 0.07, MAD: 0.05 },
  SOUTH: { AQB: 0.3, MAN: 0.25, KAR: 0.2, TAF: 0.05, AMM: 0.2 },
};

export interface ShockParams {
  arrivals: number;
  peakWeek: number;
  spread: number;
  destination: Destination;
  campCapacity: number;
  rentableShare: number;
  doubleShiftWeek: number | null;
  mobileClinics: number;
  clinicLeadWeeks: number;
  truckingLpcd: number;
  truckingLeadWeeks: number;
}

export const DEFAULT_SHOCK: ShockParams = { arrivals: 250000, peakWeek: 5, spread: 3, destination: "NORTH", campCapacity: 60000, rentableShare: 0.3, doubleShiftWeek: null, mobileClinics: 0, clinicLeadWeeks: 2, truckingLpcd: 0, truckingLeadWeeks: 1 };

export const WEEKS = 52;
const CAMP_GOVS: GovId[] = ["MAF", "ZAR"];
const MIN_LPCD = 80;

export interface ShockWeek {
  week: number;
  arrivals: number;
  camp: number;
  host: Record<string, number>;
  stress: Record<string, Record<ShockSector, number>>;
}

export interface ShockAction {
  week: number;
  govId: GovId;
  sector: ShockSector;
  text: L;
}

export interface ShockResult {
  params: ShockParams;
  weeks: ShockWeek[];
  firstBreach: Record<string, Partial<Record<ShockSector, number>>>;
  peakStress: Record<string, number>;
  baseStress: Record<string, Record<ShockSector, number>>;
  actions: ShockAction[];
  totals: { camp: number; host: number; breachedGovs: number };
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function simulateShock(world: World, sa: SmallArea, schools: SitingAnalysis, phc: SitingAnalysis, waterLpcd: Record<string, number>, p: ShockParams): ShockResult {
  const govs = world.governorates.map((g) => g.id);
  const vacant: Record<string, number> = Object.fromEntries(govs.map((g) => [g, 0]));
  for (const e of world.eas) vacant[e.govId] += e.vacantTrue;
  // gamma-shaped arrival curve
  const k = Math.max(1.2, (p.peakWeek / p.spread) ** 2 / 2 + 1);
  const theta = p.peakWeek / Math.max(0.2, k - 1);
  const raw = Array.from({ length: WEEKS }, (_, i) => Math.pow(i + 1, k - 1) * Math.exp(-(i + 1) / theta));
  const rs = raw.reduce((a, b) => a + b, 0) || 1;
  const curve = raw.map((v) => (v / rs) * p.arrivals);
  const dest = DESTINATIONS[p.destination];
  const host: Record<string, number> = Object.fromEntries(govs.map((g) => [g, 0]));
  const campGov: Record<string, number> = Object.fromEntries(govs.map((g) => [g, 0]));
  let camp = 0;
  const weeks: ShockWeek[] = [];
  const firstBreach: ShockResult["firstBreach"] = Object.fromEntries(govs.map((g) => [g, {}]));
  const peakStress: Record<string, number> = Object.fromEntries(govs.map((g) => [g, 0]));
  const actions: ShockAction[] = [];
  const proposed = new Set<string>();
  const baseStress: Record<string, Record<ShockSector, number>> = {};
  for (const g of govs) {
    const housingCap = vacant[g] * p.rentableShare * 5.5;
    baseStress[g] = { HOUSING: 0, EDUCATION: schools.byGov[g].demand / Math.max(1, schools.byGov[g].capacity), HEALTH: sa.gov[g].pop / Math.max(1, phc.byGov[g].capacity), WATER: MIN_LPCD / Math.max(1, waterLpcd[g]) };
    void housingCap;
  }
  for (let w = 1; w <= WEEKS; w++) {
    const arr = curve[w - 1];
    let toCamp = Math.min(arr * 0.45, Math.max(0, p.campCapacity - camp));
    camp += toCamp;
    CAMP_GOVS.forEach((g, i) => (campGov[g] += toCamp * (i === 0 ? 0.6 : 0.4)));
    const rest = arr - toCamp;
    toCamp = 0;
    for (const g of govs) host[g] += rest * (dest[g] ?? 0);
    const stress: ShockWeek["stress"] = {};
    for (const g of govs) {
      const pop = sa.gov[g].pop;
      const housingCap = vacant[g] * p.rentableShare * 5.5;
      const ds = p.doubleShiftWeek !== null && w >= p.doubleShiftWeek ? 1.6 : 1;
      const schoolCap = schools.byGov[g].capacity * ds;
      const schoolDemand = schools.byGov[g].demand + host[g] * 0.3 * 0.95;
      const clinics = w >= 1 + p.clinicLeadWeeks ? p.mobileClinics * (dest[g] ?? 0) * 6000 : 0;
      const phcCap = phc.byGov[g].capacity + clinics;
      const phcDemand = pop + host[g] + campGov[g];
      const truck = w >= 1 + p.truckingLeadWeeks ? p.truckingLpcd * ((dest[g] ?? 0) > 0 ? 1 : 0) : 0;
      const lpcd = (waterLpcd[g] * pop) / (pop + host[g] + campGov[g]) + truck;
      const s: Record<ShockSector, number> = {
        HOUSING: housingCap > 0 ? host[g] / housingCap : host[g] > 0 ? 9 : 0,
        EDUCATION: schoolDemand / Math.max(1, schoolCap),
        HEALTH: phcDemand / Math.max(1, phcCap),
        WATER: MIN_LPCD / Math.max(1, lpcd),
      };
      stress[g] = s;
      for (const sec of SHOCK_SECTORS) {
        peakStress[g] = Math.max(peakStress[g], host[g] > 0 || campGov[g] > 0 ? s[sec] : 0);
        // a breach is caused by the shock: over capacity AND at least 5 points above the pre-shock level
        if (s[sec] >= Math.max(1, baseStress[g][sec] + 0.05) && (host[g] > 1000 || campGov[g] > 1000) && firstBreach[g][sec] === undefined) {
          firstBreach[g][sec] = w;
          const key = `${g}|${sec}`;
          if (proposed.has(key)) continue;
          proposed.add(key);
          const gn = world.gov[g].name;
          if (sec === "EDUCATION") {
            const extra = schoolDemand - schoolCap;
            actions.push({ week: w, govId: g, sector: sec, text: { en: `${gn.en}: school places exceeded by ${fmt(extra)} — propose double shifts in about ${fmt(extra / 400)} schools and temporary classrooms.`, ar: `${gn.ar}: تجاوز الطلب على المقاعد المدرسية بمقدار ${fmt(extra)} — يُقترح نظام الفترتين في نحو ${fmt(extra / 400)} مدرسة وغرف صفية مؤقتة.` } });
          } else if (sec === "HEALTH") {
            const extra = phcDemand - phcCap;
            actions.push({ week: w, govId: g, sector: sec, text: { en: `${gn.en}: primary-care demand over capacity by ${fmt(extra)} residents — propose ${fmt(Math.ceil(extra / 6000))} mobile clinics.`, ar: `${gn.ar}: الطلب على الرعاية الأولية يفوق الطاقة بـ ${fmt(extra)} ساكن — يُقترح ${fmt(Math.ceil(extra / 6000))} عيادة متنقلة.` } });
          } else if (sec === "WATER") {
            actions.push({ week: w, govId: g, sector: sec, text: { en: `${gn.en}: delivered water falls below ${MIN_LPCD} l/person/day — propose water trucking and network pressure management.`, ar: `${gn.ar}: تنخفض المياه الموزعة دون ${MIN_LPCD} لتر/فرد/يوم — يُقترح نقل المياه بالصهاريج وإدارة ضغط الشبكة.` } });
          } else {
            actions.push({ week: w, govId: g, sector: sec, text: { en: `${gn.en}: rentable vacant housing exhausted — propose rental subsidies to bring vacant units to market and transitional shelter.`, ar: `${gn.ar}: نفاد المساكن الشاغرة القابلة للإيجار — يُقترح دعم الإيجار لإدخال المساكن الشاغرة إلى السوق وتوفير مأوى انتقالي.` } });
          }
        }
      }
    }
    weeks.push({ week: w, arrivals: arr, camp, host: { ...host }, stress });
  }
  actions.sort((a, b) => a.week - b.week);
  return { params: p, weeks, firstBreach, peakStress, baseStress, actions, totals: { camp, host: Object.values(host).reduce((a, b) => a + b, 0), breachedGovs: govs.filter((g) => Object.keys(firstBreach[g]).length > 0).length } };
}

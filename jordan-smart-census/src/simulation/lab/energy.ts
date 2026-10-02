/**
 * Energy & utilities (SIMULATED, calibrated to open national data).
 *
 *   residential kWh_g(t) = households_g(t) × kWh per household (urban / rural, + air-conditioning uplift)
 *                          × (1 + appliance growth)^(t − base) × (1 + cooling uplift from warming)
 *   total demand_g(t)    = residential ÷ residential share; scaled so that the national base year
 *                          equals Jordan's electricity demand (Our World in Data, latest year)
 *   peak MW              = demand ÷ (8,760 h × load factor)
 *   grid capacity        = base peak × headroom (synthetic, per governorate) unless imported
 *   rooftop solar        = households × suitable-roof share × kWp per roof
 *   solid waste          = population × kg per person per day; landfill full when cumulative waste > capacity
 *   sewer coverage       = census share of households on the public sewer
 */
import type { GovId } from "@/types/census";
import type { World } from "../generate";
import { computeProfile } from "../analytics";
import { calibration } from "@/data/openData";
import { labRng, type SmallArea } from "./common";

export interface EnergyParams {
  applianceGrowth: number;
  coolingUplift: number; // extra demand by 2050 from warming
  loadFactor: number;
  renewableTarget: number; // share of electricity by 2030
  rooftopShare: number;
  kgPerPersonDay: number;
  /** imported values */
  peakMW?: Partial<Record<GovId, number>>;
  capacityMW?: Partial<Record<GovId, number>>;
}

export const DEFAULT_ENERGY: EnergyParams = { applianceGrowth: 0.012, coolingUplift: 0.08, loadFactor: 0.6, renewableTarget: 0.31, rooftopShare: 0.25, kgPerPersonDay: 0.95 };

export interface GovEnergy {
  demandBaseGWh: number;
  demandHGWh: number;
  peakBase: number;
  peakH: number;
  capacity: number;
  headroomH: number; // capacity ÷ peak at horizon
  capacityYear: number | null;
  reinforceMVA: number;
  rooftopMW: number;
  acShare: number;
  wasteTpdH: number;
  landfillFullYear: number | null;
  sewerShare: number;
  noSewerHhH: number;
  imported: boolean;
}

export interface EnergyResult {
  params: EnergyParams;
  year: number;
  calibration: { twh: number; year: number | null; renewables: number; renewablesYear: number | null };
  series: { year: number; twh: number; peakMW: number }[];
  byGov: Record<GovId, GovEnergy>;
  national: { demandBaseGWh: number; demandHGWh: number; peakBase: number; peakH: number; rooftopMW: number; reinforceMVA: number; wasteTpdH: number; sewerShare: number };
}

export function assessEnergy(world: World, areaFor: (y: number) => SmallArea, baseYear: number, year: number, p: EnergyParams = DEFAULT_ENERGY): EnergyResult {
  const cal = calibration();
  const rng = labRng(world, "energy-headroom");
  const sa0 = areaFor(baseYear);
  const govs = world.governorates.map((g) => g.id);
  const per: Record<string, { kwhHh: number; ac: number; sewer: number; roofs: number; head: number; landfillYrs: number }> = {};
  for (const id of govs) {
    const gp = computeProfile(world, { govId: id });
    const hh = Math.max(1, gp.households);
    const ac = (gp.housing.cooling.AC ?? 0) / hh;
    const urban = gp.urban / Math.max(1, gp.population);
    const houses = ((gp.housing.type.HOUSE ?? 0) + (gp.housing.type.VILLA ?? 0) + (gp.housing.type.TRADITIONAL ?? 0)) / hh;
    per[id] = { kwhHh: (3300 + 900 * urban) * (1 + 0.45 * ac), ac, sewer: (gp.housing.sanitation.PUBLIC_SEWER ?? 0) / hh, roofs: houses * 0.8 + (1 - houses) * 0.12, head: rng.range(1.12, 1.45), landfillYrs: rng.range(7, 22) };
  }
  const resShare = 0.47;
  const rawBase = govs.reduce((s, id) => s + (sa0.gov[id].households * per[id].kwhHh) / resShare, 0);
  const k = (cal.electricityTWh * 1e9) / rawBase; // calibrate to national demand
  const demandAt = (id: GovId, y: number, sa: SmallArea) => (sa.gov[id].households * per[id].kwhHh * k) / resShare / 1e6 * (1 + p.applianceGrowth) ** (y - baseYear) * (1 + p.coolingUplift * Math.max(0, (y - baseYear) / (2050 - baseYear)));
  const peakOf = (gwh: number) => (gwh * 1000) / (8760 * p.loadFactor);
  const series: EnergyResult["series"] = [];
  const govYear: Record<string, { y: number; peak: number; pop: number }[]> = Object.fromEntries(govs.map((id) => [id, []]));
  for (let y = baseYear; y <= 2050; y++) {
    const sa = areaFor(y);
    let twh = 0;
    for (const id of govs) {
      const gwh = demandAt(id, y, sa);
      twh += gwh / 1000;
      govYear[id].push({ y, peak: peakOf(gwh), pop: sa.gov[id].pop });
    }
    series.push({ year: y, twh, peakMW: peakOf(twh * 1000) });
  }
  const saH = areaFor(year);
  const byGov = {} as Record<GovId, GovEnergy>;
  for (const id of govs) {
    const ys = govYear[id];
    const peakBase = p.peakMW?.[id] ?? ys[0].peak;
    const scale = peakBase / ys[0].peak;
    const capacity = p.capacityMW?.[id] ?? peakBase * per[id].head;
    const at = ys.find((x) => x.y === year) ?? ys[ys.length - 1];
    const peakH = at.peak * scale;
    const capacityYear = ys.find((x) => x.peak * scale > capacity)?.y ?? null;
    const capacityTons = ys[0].pop * p.kgPerPersonDay * 365 / 1000 * per[id].landfillYrs;
    let cum = 0;
    let landfillFullYear: number | null = null;
    for (const x of ys) {
      cum += x.pop * p.kgPerPersonDay * 365 / 1000;
      if (cum > capacityTons) { landfillFullYear = x.y; break; }
    }
    byGov[id] = {
      demandBaseGWh: ys[0].peak * scale * 8760 * p.loadFactor / 1000, demandHGWh: peakH * 8760 * p.loadFactor / 1000,
      peakBase, peakH, capacity, headroomH: capacity / Math.max(1, peakH), capacityYear,
      reinforceMVA: Math.max(0, peakH * 1.15 - capacity) / 0.9,
      rooftopMW: (saH.gov[id].households * per[id].roofs * p.rooftopShare * 3) / 1000,
      acShare: per[id].ac,
      wasteTpdH: (saH.gov[id].pop * p.kgPerPersonDay) / 1000, landfillFullYear,
      sewerShare: per[id].sewer, noSewerHhH: saH.gov[id].households * (1 - per[id].sewer),
      imported: p.peakMW?.[id] !== undefined || p.capacityMW?.[id] !== undefined,
    };
  }
  const sum = (f: (g: GovEnergy) => number) => govs.reduce((s, id) => s + f(byGov[id]), 0);
  return {
    params: p, year,
    calibration: { twh: cal.electricityTWh, year: cal.electricityYear, renewables: cal.renewablesShare, renewablesYear: cal.renewablesYear },
    series, byGov,
    national: { demandBaseGWh: sum((g) => g.demandBaseGWh), demandHGWh: sum((g) => g.demandHGWh), peakBase: sum((g) => g.peakBase), peakH: sum((g) => g.peakH), rooftopMW: sum((g) => g.rooftopMW), reinforceMVA: sum((g) => g.reinforceMVA), wasteTpdH: sum((g) => g.wasteTpdH), sewerShare: govs.reduce((s, id) => s + byGov[id].sewerShare * sa0.gov[id].households, 0) / Math.max(1, sa0.national.households) },
  };
}

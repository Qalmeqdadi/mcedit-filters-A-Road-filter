/**
 * Land & terrain (SIMULATED, illustrative constraint shares).
 *
 * Each district is assigned one of Jordan's three physiographic zones — Jordan Valley / Wadi Araba
 * lowlands, the western highlands, or the eastern Badia plateau — using the same rule as the
 * climate layer. Zone shares of steep, prime agricultural and protected land are planning
 * assumptions, not survey results.
 *
 *   built-up land     = urban population ÷ urban density + rural population ÷ village density (2,000 per km²)
 *   developable land  = area × (1 − steep − agricultural − protected) × serviceable share − built-up
 *   land demand       = new households × (1 + vacancy allowance) ÷ gross density + employment land
 *   sufficiency       = developable ÷ demand   ·   years of supply = developable ÷ annual demand
 *   agricultural land at risk = demand that cannot be met on unconstrained land, taken from farmland
 */
import type { GovId } from "@/types/census";
import type { World } from "../generate";
import type { SmallArea } from "./common";
import { heatClass, type HeatClass } from "./climate";

export type Zone = HeatClass; // LOWLAND | HIGHLAND | DESERT

export const ZONE_LABEL: Record<Zone, { en: string; ar: string }> = {
  LOWLAND: { en: "Jordan Valley & Wadi Araba lowlands", ar: "الأغوار ووادي عربة" },
  HIGHLAND: { en: "Western highlands", ar: "المرتفعات الغربية" },
  DESERT: { en: "Badia plateau", ar: "هضبة البادية" },
};

export const ZONE_SHORT: Record<Zone, { en: string; ar: string }> = { LOWLAND: { en: "Valley", ar: "الأغوار" }, HIGHLAND: { en: "Highlands", ar: "المرتفعات" }, DESERT: { en: "Badia", ar: "البادية" } };

export interface ZoneConstraints { steep: number; agricultural: number; protected: number; serviceable: number; urbanDensity: number }

export const ZONES: Record<Zone, ZoneConstraints> = {
  HIGHLAND: { steep: 0.3, agricultural: 0.25, protected: 0.06, serviceable: 0.55, urbanDensity: 7000 },
  LOWLAND: { steep: 0.12, agricultural: 0.42, protected: 0.08, serviceable: 0.45, urbanDensity: 4500 },
  DESERT: { steep: 0.05, agricultural: 0.03, protected: 0.1, serviceable: 0.035, urbanDensity: 4000 },
};

export interface LandParams {
  grossDensity: number; // dwellings per km² of new urban land (incl. roads and services)
  vacancyAllowance: number;
  employmentLandShare: number; // extra land for jobs and services as a share of residential land
}

export const DEFAULT_LAND: LandParams = { grossDensity: 2200, vacancyAllowance: 0.08, employmentLandShare: 0.25 };

export interface AreaLand {
  zone: Zone;
  areaKm2: number;
  builtKm2: number;
  constrainedKm2: number;
  agriculturalKm2: number;
  developableKm2: number;
  demandKm2: number;
  sufficiency: number;
  yearsSupply: number;
  agriAtRiskKm2: number;
}

export interface LandResult {
  params: LandParams;
  year: number;
  byDistrict: Record<string, AreaLand>;
  byGov: Record<GovId, Omit<AreaLand, "zone"> & { zones: Record<Zone, number> }>;
  national: { areaKm2: number; builtKm2: number; developableKm2: number; demandKm2: number; agriAtRiskKm2: number; zones: Record<Zone, number> };
}

export function assessLand(world: World, sa0: SmallArea, saH: SmallArea, p: LandParams = DEFAULT_LAND): LandResult {
  const yrs = Math.max(1, saH.year - sa0.year);
  const byDistrict: Record<string, AreaLand> = {};
  for (const d of world.districts) {
    const zone = heatClass(world, d.id);
    const z = ZONES[zone];
    const b = sa0.district[d.id];
    const h = saH.district[d.id];
    const builtKm2 = Math.min(d.areaKm2 * 0.6, b.urban / z.urbanDensity + (b.pop - b.urban) / 2000);
    const agriculturalKm2 = d.areaKm2 * z.agricultural;
    const constrainedKm2 = d.areaKm2 * (z.steep + z.protected);
    const developableKm2 = Math.max(0, d.areaKm2 * (1 - z.steep - z.agricultural - z.protected) * z.serviceable - builtKm2 * 0.5);
    const newHh = Math.max(0, h.households - b.households);
    const demandKm2 = ((newHh * (1 + p.vacancyAllowance)) / p.grossDensity) * (1 + p.employmentLandShare);
    byDistrict[d.id] = {
      zone, areaKm2: d.areaKm2, builtKm2, constrainedKm2, agriculturalKm2, developableKm2, demandKm2,
      sufficiency: demandKm2 > 0 ? developableKm2 / demandKm2 : 99,
      yearsSupply: demandKm2 > 0 ? developableKm2 / (demandKm2 / yrs) : 99,
      agriAtRiskKm2: Math.min(agriculturalKm2 * z.serviceable, Math.max(0, demandKm2 - developableKm2) + demandKm2 * (zone === "DESERT" ? 0 : 0.15)),
    };
  }
  const blank = () => ({ areaKm2: 0, builtKm2: 0, constrainedKm2: 0, agriculturalKm2: 0, developableKm2: 0, demandKm2: 0, agriAtRiskKm2: 0, zones: { LOWLAND: 0, HIGHLAND: 0, DESERT: 0 } as Record<Zone, number> });
  const acc = Object.fromEntries(world.governorates.map((g) => [g.id, blank()])) as Record<GovId, ReturnType<typeof blank>>;
  const nat = blank();
  for (const d of world.districts) {
    const x = byDistrict[d.id];
    for (const t of [acc[d.govId], nat]) {
      t.areaKm2 += x.areaKm2; t.builtKm2 += x.builtKm2; t.constrainedKm2 += x.constrainedKm2; t.agriculturalKm2 += x.agriculturalKm2;
      t.developableKm2 += x.developableKm2; t.demandKm2 += x.demandKm2; t.agriAtRiskKm2 += x.agriAtRiskKm2; t.zones[x.zone] += x.areaKm2;
    }
  }
  const byGov = {} as LandResult["byGov"];
  for (const g of world.governorates) {
    const a = acc[g.id];
    byGov[g.id] = { ...a, sufficiency: a.demandKm2 > 0 ? a.developableKm2 / a.demandKm2 : 99, yearsSupply: a.demandKm2 > 0 ? a.developableKm2 / (a.demandKm2 / yrs) : 99 };
  }
  return { params: p, year: saH.year, byDistrict, byGov, national: { areaKm2: nat.areaKm2, builtKm2: nat.builtKm2, developableKm2: nat.developableKm2, demandKm2: nat.demandKm2, agriAtRiskKm2: nat.agriAtRiskKm2, zones: nat.zones } };
}

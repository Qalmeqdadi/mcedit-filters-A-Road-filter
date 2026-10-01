/**
 * Seeded synthetic world generator.
 *
 *   generateGovernorates → generateDistricts → generateEnumerationAreas
 *   → generateEnumerators/assignEnumerators → generateHouseholds/generatePopulation
 *
 * Everything is deterministic for a given seed and config.
 */
import { COUNTRY, DISTRICT_GEO, GOVERNORATE_GEO, type DistrictProps } from "@/data/geo";
import { GOV_ORDER, GOV_PROFILES, GOV_REFERENCE } from "@/data/reference";
import type {
  District, EnumerationArea, Enumerator, EnumeratorProfileKind, GovId, Governorate, Household, StatisticalBlock, Supervisor,
} from "@/types/census";
import { bbox, kmBetween, pointInFeature, type GeoFeature } from "./geo";
import { pseudonym } from "./names";
import { fabricatedHousehold, generateHousehold, plantError } from "./population";
import { clamp, derive, Rng } from "./rng";

export interface SimConfig {
  seed: string;
  fieldDays: number;
  interviewsPerDay: number;
  efficiency: number;
  supervisorRatio: number;
  startDate: string;
  referenceDate: string;
  /** target number of sampled microdata households (national) */
  sampleHouseholds: number;
  /** optional official governorate population override (from import adapter) */
  govPopulationOverride?: Partial<Record<GovId, number>>;
  officialImportLabel?: string;
}

export const DEFAULT_SEED = "JORDAN-CENSUS-DEMO-2030";

export const DEFAULT_CONFIG: SimConfig = {
  seed: DEFAULT_SEED,
  fieldDays: 21,
  interviewsPerDay: 14,
  efficiency: 0.85,
  supervisorRatio: 8,
  startDate: "2026-12-01",
  referenceDate: "2026-11-30",
  sampleHouseholds: 10000,
};

/** EAs are delineated so that one EA ≈ one enumerator's planned workload (urban) or 80% of it (rural, longer travel). */
export function eaTargets(config: SimConfig) {
  const workload = config.interviewsPerDay * config.efficiency * config.fieldDays;
  return { workload, urban: Math.round(workload * 0.95), rural: Math.round(workload * 0.8) };
}

export interface World {
  config: SimConfig;
  governorates: Governorate[];
  gov: Record<GovId, Governorate>;
  districts: District[];
  district: Record<string, District>;
  eas: EnumerationArea[];
  eaIdx: Map<string, number>;
  enumerators: Enumerator[];
  enumIdx: Map<string, number>;
  supervisors: Supervisor[];
  supIdx: Map<string, number>;
  households: Household[];
  hhByEa: Map<string, number[]>;
  totals: { population: number; households: number; dwellings: number };
  generationMs: number;
}

const HOT_DISTRICT_HINTS = ["Ghor", "Shuna", "Aqaba", "Araba", "Deir Alla", "Safi", "Quwayra"];

export function generateGovernorates(config: SimConfig): Governorate[] {
  return GOV_ORDER.map((id) => {
    const f = GOVERNORATE_GEO.features.find((x) => x.properties.id === id)!;
    const ref = GOV_REFERENCE.find((r) => r.govId === id)!;
    const override = config.govPopulationOverride?.[id];
    const p = f.properties;
    return {
      id,
      iso: p.iso,
      name: { en: p.nameEn, ar: p.nameAr },
      capital: { en: p.capitalEn, ar: p.capitalAr },
      region: p.region,
      areaKm2: p.areaKm2,
      label: [p.labelLng, p.labelLat],
      capitalPoint: [p.capitalLng, p.capitalLat],
      refPopulation: override ?? ref.population,
      refYear: ref.year,
      refSourceId: override ? "OFFICIAL_IMPORT" : "REF_GOV_POP",
      profile: GOV_PROFILES[id],
    };
  });
}

export function generateDistricts(config: SimConfig, govs: Governorate[]): District[] {
  const out: District[] = [];
  for (const g of govs) {
    const feats = DISTRICT_GEO.features.filter((f) => f.properties.govId === g.id);
    const rng = derive(config.seed, "districts", g.id);
    const w = feats.map((f) => {
      const seatW = f.properties.anchors.reduce((s, a) => s + a[2], 0);
      return seatW * rng.range(0.85, 1.15) + 0.3 + Math.log10(1 + f.properties.areaKm2 / 400) * 0.25;
    });
    const sumW = w.reduce((a, b) => a + b, 0);
    feats.forEach((f, i) => {
      const p = f.properties;
      const pop = Math.round((g.refPopulation * w[i]) / sumW);
      const urbanShare = p.capital
        ? clamp(g.profile.urbanShare + 0.08, 0.5, 0.985)
        : clamp(g.profile.urbanShare - 0.2 + rng.normal(0, 0.08) + (p.anchors.reduce((s, a) => s + a[2], 0) >= 3 ? 0.15 : 0), 0.15, 0.95);
      const hhSize = g.profile.meanHouseholdSize * (urbanShare > 0.8 ? 0.98 : 1.05);
      out.push({
        id: p.id,
        govId: g.id,
        name: { en: p.nameEn, ar: p.nameAr },
        sourceLabel: p.sourceLabel,
        labelMethod: p.labelMethod,
        areaKm2: p.areaKm2,
        label: [p.labelLng, p.labelLat],
        anchors: p.anchors,
        isCapitalDistrict: p.capital,
        population: pop,
        households: Math.round(pop / hhSize),
        urbanShare,
      });
    });
  }
  return out;
}

const country = COUNTRY.features[0] as GeoFeature<unknown>;

function placePoint(rng: Rng, feat: GeoFeature<DistrictProps>, anchors: [number, number, number][], urban: boolean): [number, number] {
  const [minX, minY, maxX, maxY] = bbox(feat);
  const inside = (x: number, y: number) => pointInFeature(x, y, feat) && pointInFeature(x, y, country);
  for (let attempt = 0; attempt < 200; attempt++) {
    let x: number;
    let y: number;
    if (urban || attempt > 120) {
      const a = rng.weighted(anchors, anchors.map((v) => v[2]));
      const sigma = 0.006 * Math.sqrt(a[2]) + 0.006 + (attempt > 120 ? 0.03 : 0);
      x = a[0] + rng.normal(0, sigma * 1.15);
      y = a[1] + rng.normal(0, sigma);
    } else {
      x = rng.range(minX, maxX);
      y = rng.range(minY, maxY);
      const d = Math.min(...anchors.map((a) => kmBetween([x, y], [a[0], a[1]])));
      if (!rng.chance(Math.exp(-d / 22))) continue;
    }
    if (inside(x, y)) return [x, y];
  }
  // deterministic fallback: label point of the district (verified interior at build time)
  return [feat.properties.labelLng, feat.properties.labelLat];
}

export function generateEnumerationAreas(config: SimConfig, govs: Governorate[], districts: District[]): EnumerationArea[] {
  const eas: EnumerationArea[] = [];
  const govCounter: Record<string, number> = {};
  const capacity = config.interviewsPerDay * config.efficiency;
  const target = eaTargets(config);
  for (const g of govs) {
    for (const d of districts.filter((x) => x.govId === g.id)) {
      const rng = derive(config.seed, "eas", d.id);
      const feat = DISTRICT_GEO.features.find((f) => f.properties.id === d.id)!;
      const hhUrban = d.households * d.urbanShare;
      const hhRural = d.households - hhUrban;
      const nU = Math.max(hhUrban > 50 ? 1 : 0, Math.round(hhUrban / target.urban));
      const nR = Math.max(2, Math.round(hhRural / target.rural));
      const specs: { urban: boolean; w: number }[] = [];
      for (let i = 0; i < nU; i++) specs.push({ urban: true, w: rng.lognormal(1, 0.16) });
      for (let i = 0; i < nR; i++) specs.push({ urban: false, w: rng.lognormal(1, 0.2) });
      const sumU = specs.filter((s) => s.urban).reduce((a, s) => a + s.w, 0) || 1;
      const sumR = specs.filter((s) => !s.urban).reduce((a, s) => a + s.w, 0) || 1;
      const placed = specs.map((s) => {
        const [lng, lat] = placePoint(rng, feat, d.anchors, s.urban);
        return { ...s, lng, lat };
      });
      // spatial serpentine order for contiguous enumerator assignment
      placed.sort((a, b) => {
        const ra = Math.round(a.lat * 40);
        const rb = Math.round(b.lat * 40);
        if (ra !== rb) return rb - ra;
        return ra % 2 === 0 ? a.lng - b.lng : b.lng - a.lng;
      });
      for (const s of placed) {
        govCounter[g.id] = (govCounter[g.id] ?? 0) + 1;
        const id = `${g.id}-${String(govCounter[g.id]).padStart(4, "0")}`;
        const hhEstimate = Math.max(40, Math.round(s.urban ? (hhUrban * s.w) / sumU : (hhRural * s.w) / sumR));
        const hhSize = g.profile.meanHouseholdSize * (s.urban ? 0.97 : 1.07);
        const vac = clamp(g.profile.vacancyRate * rng.range(0.6, 1.4), 0.03, 0.4);
        const dwellings = Math.round(hhEstimate / (1 - vac));
        let hhTrue = Math.max(20, Math.round(hhEstimate * rng.normal(1, 0.045)));
        let planted: EnumerationArea["planted"];
        if (id === "IRB-0207" || rng.chance(0.004)) {
          hhTrue = Math.round(hhEstimate * rng.range(0.72, 0.8));
          planted = "OCCUPANCY_SHORTFALL";
        } else if (rng.chance(0.003)) {
          hhTrue = Math.round(hhEstimate * rng.range(1.22, 1.35));
          planted = "FRAME_UNDERCOUNT";
        }
        const vacantTrue = Math.max(0, Math.round(dwellings * vac * rng.normal(1, 0.1)));
        const accessibility = clamp(g.profile.accessibility * (s.urban ? 1.06 : 0.86) * rng.normal(1, 0.08), 0.25, 1);
        eas.push({
          id,
          index: eas.length,
          govId: g.id,
          districtId: d.id,
          lng: +s.lng.toFixed(5),
          lat: +s.lat.toFixed(5),
          urban: s.urban,
          popEstimate: Math.round(hhEstimate * hhSize),
          hhEstimate,
          dwellings,
          hhTrue,
          dwellingsTrue: hhTrue + vacantTrue,
          vacantTrue,
          planted,
          blocks: Math.max(1, Math.ceil(dwellings / 40)),
          enumeratorId: "",
          supervisorId: "",
          accessibility,
          startDay: 0,
          expectedDays: Math.max(1, Math.ceil(hhEstimate / capacity)),
        });
      }
    }
  }
  return eas;
}

function profileFor(rng: Rng, id: string): Enumerator["profile"] {
  let kind: EnumeratorProfileKind = rng.table({ STANDARD: 0.816, FAST: 0.08, SLOW: 0.08, FABRICATION_RISK: 0.003, HIGH_REFUSAL: 0.005, DEVICE_ISSUES: 0.012, GPS_DRIFT: 0.004 });
  if (id === "AMM-E0037") kind = "FABRICATION_RISK";
  if (id === "ZAR-E0112") kind = "HIGH_REFUSAL";
  if (id === "IRB-E0058") kind = "GPS_DRIFT";
  const base = { kind, speed: clamp(rng.normal(1, 0.1), 0.7, 1.3), errorRate: rng.range(0.006, 0.025), refusalFactor: clamp(rng.normal(1, 0.15), 0.6, 1.5), durationFactor: clamp(rng.normal(1, 0.1), 0.75, 1.3), deviceReliability: 0.997 };
  switch (kind) {
    case "FAST": return { ...base, speed: rng.range(1.22, 1.4), durationFactor: rng.range(0.78, 0.9) };
    case "SLOW": return { ...base, speed: rng.range(0.62, 0.8), durationFactor: rng.range(1.12, 1.3) };
    case "FABRICATION_RISK": return { ...base, speed: rng.range(2.5, 2.9), errorRate: 0.07, durationFactor: 0.17 };
    case "HIGH_REFUSAL": return { ...base, refusalFactor: rng.range(4.2, 5.5) };
    case "DEVICE_ISSUES": return { ...base, deviceReliability: 0.8 };
    default: return base;
  }
}

export function generateEnumerators(config: SimConfig, govs: Governorate[], districts: District[], eas: EnumerationArea[]): { enumerators: Enumerator[]; supervisors: Supervisor[] } {
  const enumerators: Enumerator[] = [];
  const supervisors: Supervisor[] = [];
  const capacity = config.interviewsPerDay * config.efficiency;
  const perEnumerator = capacity * config.fieldDays;
  const eCount: Record<string, number> = {};
  const sCount: Record<string, number> = {};
  for (const g of govs) {
    for (const d of districts.filter((x) => x.govId === g.id)) {
      const dEas = eas.filter((e) => e.districtId === d.id);
      const dEaById = new Map(dEas.map((e) => [e.id, e]));
      // contiguous workloads capped at 108% of the planned per-enumerator workload
      const cap = perEnumerator * 1.08;
      const chunks: EnumerationArea[][] = [];
      let cur: EnumerationArea[] = [];
      let acc = 0;
      for (const ea of dEas) {
        if (cur.length && acc + ea.hhEstimate > cap) {
          chunks.push(cur);
          cur = [];
          acc = 0;
        }
        cur.push(ea);
        acc += ea.hhEstimate;
      }
      if (cur.length) chunks.push(cur);
      const dEnums: Enumerator[] = [];
      for (const chunk of chunks) {
        eCount[g.id] = (eCount[g.id] ?? 0) + 1;
        const id = `${g.id}-E${String(eCount[g.id]).padStart(4, "0")}`;
        const rng = derive(config.seed, "enum", id);
        const first = chunk[0];
        const startDay = first.accessibility < 0.5 && !first.urban ? 1 : 0;
        const e: Enumerator = {
          id,
          index: enumerators.length,
          name: pseudonym(rng),
          govId: g.id,
          districtId: d.id,
          eaIds: chunk.map((x) => x.id),
          supervisorId: "",
          startDay,
          householdsAssigned: chunk.reduce((s, x) => s + x.hhEstimate, 0),
          profile: profileFor(rng, id),
        };
        let day = startDay;
        for (const ea of chunk) {
          ea.enumeratorId = id;
          ea.startDay = Math.round(day);
          day += ea.hhEstimate / capacity;
        }
        enumerators.push(e);
        dEnums.push(e);
      }
      for (let i = 0; i < dEnums.length; i += config.supervisorRatio) {
        sCount[g.id] = (sCount[g.id] ?? 0) + 1;
        const sid = `${g.id}-S${String(sCount[g.id]).padStart(3, "0")}`;
        const team = dEnums.slice(i, i + config.supervisorRatio);
        supervisors.push({ id: sid, name: pseudonym(derive(config.seed, "sup", sid)), govId: g.id, districtId: d.id, enumeratorIds: team.map((t) => t.id) });
        for (const t of team) {
          t.supervisorId = sid;
          for (const eaId of t.eaIds) dEaById.get(eaId)!.supervisorId = sid;
        }
      }
    }
  }
  return { enumerators, supervisors };
}

export function generateHouseholds(config: SimConfig, govs: Governorate[], districts: District[], eas: EnumerationArea[]): Household[] {
  const nationalHH = eas.reduce((s, e) => s + e.hhEstimate, 0);
  const rate = config.sampleHouseholds / nationalHH;
  const households: Household[] = [];
  const govPop: Record<string, number> = {};
  for (const g of govs) govPop[g.id] = g.refPopulation;
  const origin = (dest: GovId) => {
    const w = {} as Record<GovId, number>;
    for (const g of govs) w[g.id] = g.id === dest ? 0 : Math.pow(govPop[g.id], 0.8) * (g.id === "AMM" && dest !== "AMM" ? 1.4 : 1);
    return w;
  };
  const originCache = Object.fromEntries(govs.map((g) => [g.id, origin(g.id)])) as Record<GovId, Record<GovId, number>>;
  const distById = Object.fromEntries(districts.map((d) => [d.id, d]));
  const refYear = Number(config.referenceDate.slice(0, 4));

  for (const ea of eas) {
    const rng = derive(config.seed, "hh", ea.id);
    const g = govs.find((x) => x.id === ea.govId)!;
    const expected = ea.hhEstimate * rate;
    const n = Math.floor(expected) + (rng.chance(expected - Math.floor(expected)) ? 1 : 0);
    const dName = distById[ea.districtId].name.en;
    const hot = ea.govId === "AQB" || HOT_DISTRICT_HINTS.some((h) => dName.includes(h));
    for (let k = 0; k < n; k++) {
      const hh = generateHousehold({
        rng, hhId: `${ea.id}-H${String(k + 1).padStart(3, "0")}`, eaId: ea.id, govId: ea.govId, districtId: ea.districtId,
        urban: ea.urban, profile: g.profile, refYear, enumeratorId: ea.enumeratorId, originWeights: originCache[ea.govId], hot,
      });
      if (rng.chance(0.006)) plantError(rng, hh);
      households.push(hh);
    }
  }
  // duplicates: a handful of re-submitted household records (same ID)
  const dupRng = derive(config.seed, "dups");
  for (let i = 0; i < 6; i++) {
    const src = households[dupRng.int(0, households.length - 1)];
    households.push({ ...src, members: src.members.map((m) => ({ ...m })), order: Math.min(0.999, src.order + 0.01), planted: "DUPLICATE_ID" });
  }
  // weights: frame households per governorate / sample households per governorate
  const frameHH: Record<string, number> = {};
  const sampleHH: Record<string, number> = {};
  for (const e of eas) frameHH[e.govId] = (frameHH[e.govId] ?? 0) + e.hhEstimate;
  for (const h of households) sampleHH[h.govId] = (sampleHH[h.govId] ?? 0) + 1;
  for (const h of households) h.weight = frameHH[h.govId] / sampleHH[h.govId];
  return households;
}

/** Add fabricated households for planted fabrication-risk enumerators (sampled paradata). */
function plantFabrications(config: SimConfig, enumerators: Enumerator[], households: Household[], eas: EnumerationArea[]) {
  const eaById = new Map(eas.map((e) => [e.id, e]));
  for (const e of enumerators.filter((x) => x.profile.kind === "FABRICATION_RISK")) {
    const rng = derive(config.seed, "fab", e.id);
    const template = households.find((h) => h.enumeratorId === e.id) ?? households.find((h) => h.govId === e.govId)!;
    const ea = eaById.get(e.eaIds[0])!;
    for (let i = 0; i < 9; i++) {
      const hh = fabricatedHousehold({ ...template, eaId: ea.id, districtId: ea.districtId, govId: ea.govId, enumeratorId: e.id, urban: ea.urban }, `${ea.id}-F${String(i + 1).padStart(3, "0")}`, rng);
      hh.weight = template.weight;
      households.push(hh);
    }
  }
}

export function generateWorld(config: SimConfig): World {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const governorates = generateGovernorates(config);
  const districts = generateDistricts(config, governorates);
  const eas = generateEnumerationAreas(config, governorates, districts);
  const { enumerators, supervisors } = generateEnumerators(config, governorates, districts, eas);
  const households = generateHouseholds(config, governorates, districts, eas);
  plantFabrications(config, enumerators, households, eas);
  const hhByEa = new Map<string, number[]>();
  households.forEach((h, i) => {
    const list = hhByEa.get(h.eaId) ?? [];
    list.push(i);
    hhByEa.set(h.eaId, list);
  });
  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    config,
    governorates,
    gov: Object.fromEntries(governorates.map((g) => [g.id, g])) as Record<GovId, Governorate>,
    districts,
    district: Object.fromEntries(districts.map((d) => [d.id, d])),
    eas,
    eaIdx: new Map(eas.map((e, i) => [e.id, i])),
    enumerators,
    enumIdx: new Map(enumerators.map((e, i) => [e.id, i])),
    supervisors,
    supIdx: new Map(supervisors.map((s, i) => [s.id, i])),
    households,
    hhByEa,
    totals: {
      population: eas.reduce((s, e) => s + e.popEstimate, 0),
      households: eas.reduce((s, e) => s + e.hhEstimate, 0),
      dwellings: eas.reduce((s, e) => s + e.dwellings, 0),
    },
    generationMs: Math.round(t1 - t0),
  };
}

/** Statistical blocks of an EA, generated on demand (deterministic). */
export function generateBlocks(seed: string, ea: EnumerationArea): StatisticalBlock[] {
  const rng = derive(seed, "blocks", ea.id);
  const out: StatisticalBlock[] = [];
  let left = ea.dwellings;
  const spread = ea.urban ? 0.0035 : 0.012;
  for (let b = 0; b < ea.blocks; b++) {
    const dw = b === ea.blocks - 1 ? left : Math.min(left, Math.round(rng.range(28, 48)));
    left -= dw;
    out.push({
      id: `${ea.id}-B${String(b + 1).padStart(2, "0")}`,
      eaId: ea.id,
      dwellings: dw,
      buildings: Math.max(1, Math.round(dw / (ea.urban ? rng.range(4, 9) : rng.range(1, 1.6)))),
      lng: ea.lng + rng.normal(0, spread * 1.15),
      lat: ea.lat + rng.normal(0, spread),
    });
  }
  return out;
}

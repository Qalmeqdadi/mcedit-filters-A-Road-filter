/**
 * Weighted analytics over the synthetic microdata (SIMULATED).
 *
 * Person weights are calibrated so that each governorate's weighted population
 * equals its frame population; household weights equal frame households / sample
 * households. Planted fabrications and duplicate records are excluded and
 * impossible ages are dropped (post-edit dataset).
 */
import type {
  Attainment, Cooling, DwellingType, EmploymentStatus, GovId, Heating, Household, HouseholdType, MoveReason, Nationality,
  Occupation, PrevCountry, Sanitation, Sector, Tenure, WaterSource, WGDomain,
} from "@/types/census";
import type { World } from "./generate";
import { MAX_AGE } from "./projection";

export interface Scope {
  govId?: GovId;
  districtId?: string;
  eaId?: string;
}

type Counts<K extends string> = Record<K, number>;

export interface Profile {
  sampleHouseholds: number;
  samplePersons: number;
  population: number;
  households: number;
  areaKm2: number;
  avgHHSize: number;
  male: number;
  female: number;
  sexRatio: number;
  medianAge: number;
  dependencyRatio: number;
  single: { m: number[]; f: number[] };
  groups: { a0_14: number; a15_24: number; a15_64: number; a65: number; a6_17: number; a18_23: number; a0_5: number };
  urban: number;
  rural: number;
  nationality: Counts<Nationality>;
  hhSizeDist: number[];
  hhType: Counts<HouseholdType>;
  housing: {
    type: Counts<DwellingType>;
    tenure: Counts<Tenure>;
    rooms: number[];
    crowded: number;
    personsPerRoom: number;
    water: Counts<WaterSource>;
    electricity: number;
    sanitation: Counts<Sanitation>;
    internet: number;
    heating: Counts<Heating>;
    cooling: Counts<Cooling>;
    vehicles: number[];
    withVehicle: number;
  };
  labour: {
    workingAge: number;
    employed: number;
    unemployed: number;
    outside: number;
    byBand: { band: string; mE: number; mU: number; mO: number; fE: number; fU: number; fO: number }[];
    status: Counts<EmploymentStatus>;
    occupation: Counts<Occupation>;
    sector: Counts<Sector>;
    youth: { pop: number; employed: number; unemployed: number; students: number; neet: number };
  };
  education: {
    schoolAge: number;
    schoolEnrolled: number;
    uniAge: number;
    uniEnrolled: number;
    attainment25: Counts<Attainment>;
    attainmentBySex: { m: Counts<Attainment>; f: Counts<Attainment> };
    pop25: number;
    secondaryPlus25: number;
    university25: number;
  };
  health: {
    insured: number;
    wg: Record<WGDomain, number[]>;
    disability: number;
    pop5plus: number;
    byBand: { band: string; pop: number; disabled: number }[];
  };
  migration: {
    internal: number;
    abroad: number;
    prevCountry: Counts<PrevCountry>;
    years: number[];
    reasons: Counts<MoveReason>;
    flows: Record<string, number>;
  };
}

const zero = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Counts<K>;
export const NATIONALITIES = ["JORDANIAN", "SYRIAN", "EGYPTIAN", "IRAQI", "OTHER_ARAB", "OTHER"] as const;
export const HH_TYPES = ["SINGLE", "COUPLE", "NUCLEAR", "SINGLE_PARENT", "EXTENDED", "COMPOSITE"] as const;
export const DWELLING_TYPES = ["APARTMENT", "HOUSE", "VILLA", "TRADITIONAL", "TENT_CARAVAN", "OTHER"] as const;
export const TENURES = ["OWNED", "RENTED", "EMPLOYER", "FREE", "OTHER"] as const;
export const WATER = ["PUBLIC_NETWORK", "TANKER", "WELL_SPRING", "OTHER"] as const;
export const SANITATION = ["PUBLIC_SEWER", "CESSPIT", "NONE"] as const;
export const HEATING = ["GAS", "KEROSENE", "ELECTRIC", "CENTRAL", "WOOD", "NONE"] as const;
export const COOLING = ["AC", "FANS", "EVAPORATIVE", "NONE"] as const;
export const EMPLOYMENT = ["EMPLOYED", "UNEMPLOYED", "STUDENT", "HOMEMAKER", "RETIRED", "UNABLE", "OTHER_INACTIVE", "NOT_APPLICABLE"] as const;
export const OCCUPATIONS = ["MANAGERS", "PROFESSIONALS", "TECHNICIANS", "CLERICAL", "SERVICE_SALES", "AGRICULTURE", "CRAFT", "OPERATORS", "ELEMENTARY", "ARMED_FORCES"] as const;
export const SECTORS = ["AGRICULTURE", "MANUFACTURING", "CONSTRUCTION", "TRADE", "TRANSPORT", "HOSPITALITY", "ICT_FINANCE", "PUBLIC_ADMIN", "EDUCATION", "HEALTH", "OTHER_SERVICES"] as const;
export const ATTAINMENTS = ["NONE", "PRIMARY", "BASIC", "SECONDARY", "DIPLOMA", "BACHELOR", "POSTGRAD"] as const;
export const WG_DOMAINS = ["seeing", "hearing", "walking", "cognition", "selfcare", "communication"] as const;
export const PREV_COUNTRIES = ["SYRIA", "IRAQ", "GULF", "EGYPT", "OTHER_ARAB", "OTHER"] as const;
export const MOVE_REASONS = ["WORK", "MARRIAGE", "FAMILY", "EDUCATION", "HOUSING", "SECURITY", "OTHER"] as const;
export const LABOUR_BANDS = ["15–19", "20–24", "25–34", "35–44", "45–54", "55–64", "65+"];
const bandOf = (a: number) => (a < 20 ? 0 : a < 25 ? 1 : a < 35 ? 2 : a < 45 ? 3 : a < 55 ? 4 : a < 65 ? 5 : 6);
export const HEALTH_BANDS = ["5–17", "18–39", "40–59", "60–74", "75+"];
const hBandOf = (a: number) => (a < 18 ? 0 : a < 40 ? 1 : a < 60 ? 2 : a < 75 ? 3 : 4);

export function cleanHouseholds(world: World): Household[] {
  return world.households.filter((h) => h.planted !== "FABRICATION" && h.planted !== "DUPLICATE_ID");
}

/** person-level calibration factors per governorate */
export function personWeightFactors(world: World): Record<string, number> {
  const frame: Record<string, number> = {};
  const sample: Record<string, number> = {};
  for (const e of world.eas) frame[e.govId] = (frame[e.govId] ?? 0) + e.popEstimate;
  for (const h of cleanHouseholds(world)) sample[h.govId] = (sample[h.govId] ?? 0) + h.members.filter((p) => p.age >= 0 && p.age <= 110).length;
  const out: Record<string, number> = {};
  for (const g of Object.keys(frame)) out[g] = frame[g] / Math.max(1, sample[g] ?? 0);
  return out;
}

const cache = new WeakMap<World, Map<string, Profile>>();

export function computeProfile(world: World, scope: Scope = {}): Profile {
  const key = `${scope.govId ?? ""}|${scope.districtId ?? ""}|${scope.eaId ?? ""}`;
  let wc = cache.get(world);
  if (!wc) {
    wc = new Map();
    cache.set(world, wc);
  }
  const hit = wc.get(key);
  if (hit) return hit;

  const pw = personWeightFactors(world);
  const hhs = cleanHouseholds(world).filter((h) => (!scope.govId || h.govId === scope.govId) && (!scope.districtId || h.districtId === scope.districtId) && (!scope.eaId || h.eaId === scope.eaId));
  const area = scope.eaId ? 0 : scope.districtId ? world.district[scope.districtId].areaKm2 : scope.govId ? world.gov[scope.govId].areaKm2 : world.governorates.reduce((s, g) => s + g.areaKm2, 0);

  const P: Profile = {
    sampleHouseholds: hhs.length, samplePersons: 0, population: 0, households: 0, areaKm2: area, avgHHSize: 0, male: 0, female: 0, sexRatio: 0, medianAge: 0, dependencyRatio: 0,
    single: { m: new Array(MAX_AGE + 1).fill(0), f: new Array(MAX_AGE + 1).fill(0) },
    groups: { a0_14: 0, a15_24: 0, a15_64: 0, a65: 0, a6_17: 0, a18_23: 0, a0_5: 0 },
    urban: 0, rural: 0, nationality: zero(NATIONALITIES), hhSizeDist: new Array(10).fill(0), hhType: zero(HH_TYPES),
    housing: { type: zero(DWELLING_TYPES), tenure: zero(TENURES), rooms: new Array(8).fill(0), crowded: 0, personsPerRoom: 0, water: zero(WATER), electricity: 0, sanitation: zero(SANITATION), internet: 0, heating: zero(HEATING), cooling: zero(COOLING), vehicles: new Array(4).fill(0), withVehicle: 0 },
    labour: { workingAge: 0, employed: 0, unemployed: 0, outside: 0, byBand: LABOUR_BANDS.map((band) => ({ band, mE: 0, mU: 0, mO: 0, fE: 0, fU: 0, fO: 0 })), status: zero(EMPLOYMENT), occupation: zero(OCCUPATIONS), sector: zero(SECTORS), youth: { pop: 0, employed: 0, unemployed: 0, students: 0, neet: 0 } },
    education: { schoolAge: 0, schoolEnrolled: 0, uniAge: 0, uniEnrolled: 0, attainment25: zero(ATTAINMENTS), attainmentBySex: { m: zero(ATTAINMENTS), f: zero(ATTAINMENTS) }, pop25: 0, secondaryPlus25: 0, university25: 0 },
    health: { insured: 0, wg: Object.fromEntries(WG_DOMAINS.map((d) => [d, [0, 0, 0, 0]])) as Record<WGDomain, number[]>, disability: 0, pop5plus: 0, byBand: HEALTH_BANDS.map((band) => ({ band, pop: 0, disabled: 0 })) },
    migration: { internal: 0, abroad: 0, prevCountry: zero(PREV_COUNTRIES), years: [0, 0, 0, 0], reasons: zero(MOVE_REASONS), flows: {} },
  };
  let roomsW = 0;
  let personsInRoomsW = 0;
  for (const h of hhs) {
    const hw = h.weight;
    const k = pw[h.govId];
    const members = h.members.filter((p) => p.age >= 0 && p.age <= 110);
    P.samplePersons += members.length;
    P.households += hw;
    P.hhSizeDist[Math.min(9, members.length - 1)] += hw;
    P.hhType[h.type] += hw;
    const d = h.dwelling;
    P.housing.type[d.type] += hw;
    P.housing.tenure[d.tenure] += hw;
    P.housing.rooms[Math.min(7, d.rooms - 1)] += hw;
    if (members.length / d.rooms > 2) P.housing.crowded += hw;
    roomsW += d.rooms * hw;
    personsInRoomsW += members.length * hw;
    P.housing.water[d.water] += hw;
    if (d.electricity) P.housing.electricity += hw;
    P.housing.sanitation[d.sanitation] += hw;
    if (d.internet) P.housing.internet += hw;
    P.housing.heating[d.heating] += hw;
    P.housing.cooling[d.cooling] += hw;
    P.housing.vehicles[Math.min(3, d.vehicles)] += hw;
    if (d.vehicles > 0) P.housing.withVehicle += hw;

    for (const p of members) {
      const w = k;
      P.population += w;
      const a = Math.min(MAX_AGE, p.age);
      if (p.sex === "M") { P.male += w; P.single.m[a] += w; } else { P.female += w; P.single.f[a] += w; }
      if (p.age <= 14) P.groups.a0_14 += w;
      if (p.age >= 15 && p.age <= 24) P.groups.a15_24 += w;
      if (p.age >= 15 && p.age <= 64) P.groups.a15_64 += w;
      if (p.age >= 65) P.groups.a65 += w;
      if (p.age >= 6 && p.age <= 17) P.groups.a6_17 += w;
      if (p.age >= 18 && p.age <= 23) P.groups.a18_23 += w;
      if (p.age <= 5) P.groups.a0_5 += w;
      if (h.urban) P.urban += w; else P.rural += w;
      P.nationality[p.nationality] += w;
      // labour (15+)
      P.labour.status[p.employment] += w;
      if (p.age >= 15) {
        const b = P.labour.byBand[bandOf(p.age)];
        const isE = p.employment === "EMPLOYED";
        const isU = p.employment === "UNEMPLOYED";
        if (p.age <= 64) P.labour.workingAge += w;
        if (isE) P.labour.employed += w; else if (isU) P.labour.unemployed += w; else P.labour.outside += w;
        if (p.sex === "M") { if (isE) b.mE += w; else if (isU) b.mU += w; else b.mO += w; }
        else { if (isE) b.fE += w; else if (isU) b.fU += w; else b.fO += w; }
        if (p.occupation) P.labour.occupation[p.occupation] += w;
        if (p.sector) P.labour.sector[p.sector] += w;
        if (p.age <= 24) {
          P.labour.youth.pop += w;
          if (isE) P.labour.youth.employed += w;
          if (isU) P.labour.youth.unemployed += w;
          if (p.employment === "STUDENT") P.labour.youth.students += w;
          if (!isE && p.eduStatus !== "CURRENTLY_ENROLLED") P.labour.youth.neet += w;
        }
      }
      // education
      if (p.age >= 6 && p.age <= 17) { P.education.schoolAge += w; if (p.eduStatus === "CURRENTLY_ENROLLED") P.education.schoolEnrolled += w; }
      if (p.age >= 18 && p.age <= 23) { P.education.uniAge += w; if (p.eduStatus === "CURRENTLY_ENROLLED") P.education.uniEnrolled += w; }
      if (p.age >= 25) {
        P.education.pop25 += w;
        P.education.attainment25[p.attainment] += w;
        P.education.attainmentBySex[p.sex === "M" ? "m" : "f"][p.attainment] += w;
        if (["SECONDARY", "DIPLOMA", "BACHELOR", "POSTGRAD"].includes(p.attainment)) P.education.secondaryPlus25 += w;
        if (p.attainment === "BACHELOR" || p.attainment === "POSTGRAD") P.education.university25 += w;
      }
      // health
      if (p.healthInsurance) P.health.insured += w;
      if (p.age >= 5) {
        P.health.pop5plus += w;
        let dis = false;
        for (const dmn of WG_DOMAINS) {
          P.health.wg[dmn][p.wg[dmn] - 1] += w;
          if (p.wg[dmn] >= 3) dis = true;
        }
        const hb = P.health.byBand[hBandOf(p.age)];
        hb.pop += w;
        if (dis) { P.health.disability += w; hb.disabled += w; }
      }
      // migration
      if (p.prevGov) {
        P.migration.internal += w;
        const key = `${p.prevGov}>${h.govId}`;
        P.migration.flows[key] = (P.migration.flows[key] ?? 0) + w;
      }
      if (p.prevCountry) { P.migration.abroad += w; P.migration.prevCountry[p.prevCountry] += w; }
      if (p.yearsSinceMove !== null) P.migration.years[p.yearsSinceMove < 5 ? 0 : p.yearsSinceMove < 10 ? 1 : p.yearsSinceMove < 15 ? 2 : 3] += w;
      if (p.moveReason) P.migration.reasons[p.moveReason] += w;
    }
  }
  P.avgHHSize = P.households ? personsInRoomsW / P.households : 0;
  P.housing.personsPerRoom = roomsW ? personsInRoomsW / roomsW : 0;
  P.sexRatio = P.female ? (100 * P.male) / P.female : 0;
  P.dependencyRatio = P.groups.a15_64 ? (100 * (P.groups.a0_14 + P.groups.a65)) / P.groups.a15_64 : 0;
  // median age from single-year distribution
  const half = P.population / 2;
  let acc = 0;
  for (let a = 0; a <= MAX_AGE; a++) {
    const v = P.single.m[a] + P.single.f[a];
    if (acc + v >= half) { P.medianAge = a + (half - acc) / Math.max(1e-9, v); break; }
    acc += v;
  }
  wc.set(key, P);
  return P;
}

/** National single-year base population for projections, smoothed and scaled to a target total. */
export function basePopulation(world: World, total: number) {
  const prof = computeProfile(world);
  const smooth = (arr: number[]) => arr.map((_, i) => {
    const lo = Math.max(0, i - 1);
    const hi = Math.min(arr.length - 1, i + 1);
    let s = 0;
    for (let j = lo; j <= hi; j++) s += arr[j];
    return s / (hi - lo + 1);
  });
  const m = smooth(prof.single.m);
  const f = smooth(prof.single.f);
  const sum = m.reduce((a, b) => a + b, 0) + f.reduce((a, b) => a + b, 0);
  const k = total / sum;
  return { m: m.map((v) => v * k), f: f.map((v) => v * k), employmentRatio: prof.labour.employed / Math.max(1, prof.groups.a15_64), avgHHSize: prof.avgHHSize, urbanShare: prof.urban / Math.max(1, prof.population) };
}

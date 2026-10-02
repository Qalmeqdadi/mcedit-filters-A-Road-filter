/**
 * Scenario simulator & infrastructure demand (SIMULATED).
 *
 * A scenario = projection assumptions + planning norms. Demand formulas:
 *   housing units   = max(0, Δhouseholds) × housing formation ratio
 *   school seats    = population 6–17 × (1 + school-age adj.) × 0.95 enrolment
 *   classrooms      = school seats / classroom capacity
 *   schools         = classrooms / (school capacity / classroom capacity)
 *   healthcare      = population × utilisation + population 65+ × utilisation × 1.5
 *   water (MCM/yr)  = population × litres/person/day × 365 / 10⁹
 *   electricity GWh = population × kWh/person/year / 10⁶
 *   jobs            = population 15–64 × employment ratio(t)
 *   elderly care    = population 65+ × (1 + elderly adj.) × 12% care-need share
 */
import type { GovId, InfrastructureImpact, ProjectionPoint, ScenarioParams, ScenarioPreset } from "@/types/census";
import type { World } from "./generate";
import { basePopulation, computeProfile } from "./analytics";
import { projectPopulation, type ProjectionInputs } from "./projection";

export const PROJECTION_END = 2050;
export const PROJECTION_YEARS = [2030, 2035, 2040, 2045, 2050];
export const BASE_TFR = 2.7;
export const TFR_2050_TREND = 2.2;
export const BASE_E0 = 75.5;
export const CARE_NEED_SHARE = 0.12;
export const SCHOOL_ENROLMENT = 0.95;

export interface ScenarioExtra {
  /** one-off additional inflow spread over first 3 years (persons) */
  migrationShock: number;
  /** share of migration shock settling in northern governorates (0..1) */
  shockNorthShare: number;
}

export type FullScenario = ScenarioParams & ScenarioExtra;

export const DEFAULT_PARAMS: FullScenario = {
  fertilityMultiplier: 1,
  netMigration: 15000,
  lifeExpectancyGain: 3.5,
  householdSize: 4.3,
  employmentGrowth: 0,
  schoolAgeGrowth: 0,
  elderlyGrowth: 0,
  urbanization: 0.94,
  waterLpcd: 110,
  electricityKwh: 1500,
  classroomCapacity: 32,
  schoolCapacity: 640,
  healthUtilization: 3.4,
  housingFormationRatio: 1.08,
  migrationShock: 0,
  shockNorthShare: 0.5,
};

export const PRESETS: Record<Exclude<ScenarioPreset, "CUSTOM">, Partial<FullScenario>> = {
  BASELINE: {},
  HIGH_GROWTH: { fertilityMultiplier: 1.15, netMigration: 45000, lifeExpectancyGain: 4.5, householdSize: 4.5 },
  LOW_GROWTH: { fertilityMultiplier: 0.85, netMigration: -10000, lifeExpectancyGain: 2.5, householdSize: 4.0 },
  MIGRATION_SHOCK: { netMigration: 25000, migrationShock: 600000, shockNorthShare: 0.7, householdSize: 4.6 },
  YOUTH_PRESSURE: { fertilityMultiplier: 1.2, schoolAgeGrowth: 0.05, employmentGrowth: 0.03, householdSize: 4.5 },
  AGEING: { fertilityMultiplier: 0.72, lifeExpectancyGain: 6, elderlyGrowth: 0.08, netMigration: -5000, householdSize: 3.8 },
};

export function paramsForPreset(p: ScenarioPreset): FullScenario {
  if (p === "CUSTOM") return { ...DEFAULT_PARAMS };
  return { ...DEFAULT_PARAMS, ...PRESETS[p] };
}

export interface ScenarioRun {
  params: FullScenario;
  baseYear: number;
  series: ProjectionPoint[];
  impacts: Record<number, InfrastructureImpact>;
  baseEmploymentRatio: number;
}

const NORTH: GovId[] = ["IRB", "MAF", "JER", "AJL"];

/** Projection inputs implied by a scenario (shared by the deterministic and probabilistic runs). */
export function scenarioInputs(world: World, baseTotal: number, params: FullScenario) {
  const baseYear = Number(world.config.referenceDate.slice(0, 4));
  const bp = basePopulation(world, baseTotal);
  const inputs: ProjectionInputs = {
    baseYear,
    endYear: PROJECTION_END,
    tfrStart: BASE_TFR,
    tfrEnd: TFR_2050_TREND * params.fertilityMultiplier,
    e0Start: BASE_E0,
    e0End: BASE_E0 + params.lifeExpectancyGain,
    netMigration: params.netMigration,
    migrationShock: params.migrationShock,
    hhSizeStart: bp.avgHHSize,
    hhSizeEnd: params.householdSize,
    urbanStart: bp.urbanShare,
    urbanEnd: params.urbanization,
  };
  if (params.fertilityMultiplier !== 1) inputs.tfrStart = BASE_TFR * (1 + (params.fertilityMultiplier - 1) * 0.25);
  return { baseYear, bp, inputs };
}

export function runScenario(world: World, baseTotal: number, params: FullScenario): ScenarioRun {
  const { baseYear, bp, inputs } = scenarioInputs(world, baseTotal, params);
  const series = projectPopulation({ year: baseYear, m: bp.m, f: bp.f }, inputs);
  const impacts: Record<number, InfrastructureImpact> = {};
  const base = series[0];
  for (const year of [baseYear, ...PROJECTION_YEARS]) {
    const pt = series.find((s) => s.year === year);
    if (pt) impacts[year] = calculateInfrastructureDemand(world, pt, base, params, bp.employmentRatio, baseYear);
  }
  return { params, baseYear, series, impacts, baseEmploymentRatio: bp.employmentRatio };
}

function demand(pt: ProjectionPoint, p: FullScenario, empRatio: number) {
  const seats = pt.age6_17 * (1 + p.schoolAgeGrowth) * SCHOOL_ENROLMENT;
  const classrooms = seats / p.classroomCapacity;
  return {
    population: pt.population,
    households: pt.households,
    schoolSeats: seats,
    classroomsRequired: classrooms,
    schoolsRequired: classrooms / (p.schoolCapacity / p.classroomCapacity),
    healthcareVisits: pt.population * p.healthUtilization + pt.age65plus * p.healthUtilization * 1.5,
    waterMcm: (pt.population * p.waterLpcd * 365) / 1e9,
    electricityGwh: (pt.population * p.electricityKwh) / 1e6,
    jobsRequired: pt.age15_64 * empRatio,
    elderlyCareDemand: pt.age65plus * (1 + p.elderlyGrowth) * CARE_NEED_SHARE,
  };
}

export function calculateInfrastructureDemand(world: World, pt: ProjectionPoint, base: ProjectionPoint, p: FullScenario, baseEmpRatio: number, baseYear: number): InfrastructureImpact {
  const t = (pt.year - baseYear) / (PROJECTION_END - baseYear);
  const empRatio = baseEmpRatio + p.employmentGrowth * t;
  const d = demand(pt, p, empRatio);
  const b = demand(base, { ...p, schoolAgeGrowth: 0, elderlyGrowth: 0 }, baseEmpRatio);
  const housingUnitsNeeded = Math.max(0, d.households - b.households) * p.housingFormationRatio;

  // governorate apportionment: base share × growth differential, plus migration-shock focus
  const years = pt.year - baseYear;
  const nat = computeProfile(world);
  const raw: Record<string, number> = {};
  let sum = 0;
  for (const g of world.governorates) {
    const share = g.refPopulation / world.governorates.reduce((s, x) => s + x.refPopulation, 0);
    raw[g.id] = share * Math.exp(g.profile.growthDifferential * years);
    sum += raw[g.id];
  }
  const growth = pt.population - base.population;
  const shockAlloc = Math.min(p.migrationShock, Math.max(0, growth));
  const byGov: InfrastructureImpact["byGov"] = {};
  const northPop = NORTH.reduce((s, id) => s + raw[id], 0);
  for (const g of world.governorates) {
    const gp = computeProfile(world, { govId: g.id });
    const baseShare = raw[g.id] / sum;
    const isNorth = NORTH.includes(g.id);
    const shockShare = isNorth ? (p.shockNorthShare * raw[g.id]) / northPop : ((1 - p.shockNorthShare) * raw[g.id]) / (sum - northPop);
    const pop = (pt.population - shockAlloc) * baseShare + shockAlloc * shockShare;
    const k = pop / Math.max(1, pt.population);
    const youthFactor = gp.groups.a6_17 / Math.max(1, gp.population) / (nat.groups.a6_17 / nat.population);
    const elderFactor = gp.groups.a65 / Math.max(1, gp.population) / (nat.groups.a65 / nat.population);
    const basePop = base.population * (g.refPopulation / world.governorates.reduce((s, x) => s + x.refPopulation, 0));
    const age6_17 = pt.age6_17 * k * youthFactor;
    const age65 = pt.age65plus * k * elderFactor;
    const base6_17 = base.age6_17 * (basePop / base.population) * youthFactor;
    const base65 = base.age65plus * (basePop / base.population) * elderFactor;
    const popGrowth = pop / basePop - 1;
    const pressure = Math.max(0, popGrowth) * 45 + Math.max(0, age6_17 / base6_17 - 1) * 30 + Math.max(0, age65 / base65 - 1) * 15 + (1 - g.profile.accessibility) * 10;
    byGov[g.id] = { population: pop, age6_17, age65plus: age65, households: pop / (pt.population / pt.households), pressure };
  }
  const maxP = Math.max(...Object.values(byGov).map((x) => x.pressure), 1e-9);
  for (const v of Object.values(byGov)) v.pressure = Math.round((100 * v.pressure) / maxP);

  return {
    year: pt.year,
    ...d,
    housingUnitsNeeded,
    delta: {
      population: d.population - b.population,
      households: d.households - b.households,
      housingUnitsNeeded,
      schoolSeats: d.schoolSeats - b.schoolSeats,
      classroomsRequired: d.classroomsRequired - b.classroomsRequired,
      schoolsRequired: d.schoolsRequired - b.schoolsRequired,
      healthcareVisits: d.healthcareVisits - b.healthcareVisits,
      waterMcm: d.waterMcm - b.waterMcm,
      electricityGwh: d.electricityGwh - b.electricityGwh,
      jobsRequired: d.jobsRequired - b.jobsRequired,
      elderlyCareDemand: d.elderlyCareDemand - b.elderlyCareDemand,
    },
    byGov,
  };
}

export const IMPACT_KEYS = ["population", "households", "housingUnitsNeeded", "schoolSeats", "classroomsRequired", "schoolsRequired", "healthcareVisits", "waterMcm", "electricityGwh", "jobsRequired", "elderlyCareDemand"] as const;
export type ImpactKey = (typeof IMPACT_KEYS)[number];

export function compareScenarios(runs: { name: string; run: ScenarioRun }[], year: number) {
  return IMPACT_KEYS.map((key) => ({
    key,
    values: runs.map(({ name, run }) => ({ name, value: run.impacts[year]?.[key] ?? 0, delta: key === "housingUnitsNeeded" ? run.impacts[year]?.housingUnitsNeeded ?? 0 : run.impacts[year]?.delta[key] ?? 0 })),
  }));
}

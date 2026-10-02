/** Central CSV exporters (every row carries its data nature). */
import type { CensusEngine } from "@/simulation/engine";
import { computeProfile } from "@/simulation/analytics";
import { RULE_INDEX } from "@/simulation/quality";
import { medianFromHist } from "@/simulation/anomalies";
import { compareScenarios, DEFAULT_PARAMS, PROJECTION_YEARS, runScenario, type FullScenario } from "@/simulation/scenarios";
import type { PESSummary } from "@/types/census";
import { smallArea } from "@/simulation/lab/common";
import { analyseSiting, DEFAULT_NORMS, facilityInventory } from "@/simulation/lab/facilities";
import { DEFAULT_HOUSING, forecastHousing } from "@/simulation/lab/housingNeed";
import { DEFAULT_JOBS, forecastJobs } from "@/simulation/lab/jobs";
import { DEFAULT_WATER, simulateWater } from "@/simulation/lab/water";
import { assessClimate, DEFAULT_CLIMATE } from "@/simulation/lab/climate";
import { buildPlans, liveCensus, planSnapshot } from "@/simulation/lab/actions";

export function governorateSummary(engine: CensusEngine) {
  const byGov = engine.aggregateBy("govId");
  return engine.world.governorates.map((g) => {
    const p = computeProfile(engine.world, { govId: g.id });
    const a = byGov[g.id];
    return {
      governorate_id: g.id, iso: g.iso, name_en: g.name.en, name_ar: g.name.ar, area_km2: g.areaKm2,
      reference_population: g.refPopulation, reference_year: g.refYear, reference_nature: g.refSourceId === "OFFICIAL_IMPORT" ? "OFFICIAL" : "REFERENCE",
      districts: engine.world.districts.filter((d) => d.govId === g.id).length, enumeration_areas: a.eas, enumerators: a.enumerators,
      simulated_population: Math.round(p.population), simulated_households: Math.round(p.households), avg_household_size: +p.avgHHSize.toFixed(2),
      sex_ratio: +p.sexRatio.toFixed(1), median_age: +p.medianAge.toFixed(1), dependency_ratio: +p.dependencyRatio.toFixed(1),
      fieldwork_completion: +a.completionPct.toFixed(4), response_rate: +a.responseRate.toFixed(4), persons_enumerated: a.persons, simulated_nature: "SIMULATED / SYNTHETIC_OPERATIONAL",
    };
  });
}

export function enumeratorPerformance(engine: CensusEngine) {
  return engine.world.enumerators.map((e, i) => {
    const s = engine.en[i];
    const ad = engine.activeDays[i];
    return { enumerator_id: e.id, name_synthetic: e.name.en, governorate: e.govId, district: e.districtId, eas: e.eaIds.join(" "), supervisor: e.supervisorId, assigned: s.assigned, completed: s.completed, pending: s.pending, refusals: s.refusals, avg_interview_min: s.durCount ? +(s.durSum / s.durCount).toFixed(1) : "", median_interview_min: +medianFromHist(s.durHist).toFixed(1), interviews_per_day: ad ? +(s.completed / ad).toFixed(2) : "", validation_score: s.validationScore, coverage_score: s.coverageScore, risk_score: s.riskScore, status: s.status, nature: "SYNTHETIC_OPERATIONAL" };
  });
}

export function qualityIssues(engine: CensusEngine) {
  return engine.issues.map((x) => ({ id: x.id, rule: x.ruleId, rule_title: RULE_INDEX[x.ruleId]?.title.en, severity: x.severity, entity_type: x.entityType, entity_id: x.entityId, ea: x.eaId ?? "", enumerator: x.enumeratorId ?? "", governorate: x.govId, detected: engine.timeOf(x.step).toISOString(), status: x.status, assignee: x.assignee ?? "", dismiss_reason: x.dismissReason ?? "", message: x.message.en, evidence: x.evidence.en, nature: "SYNTHETIC_OPERATIONAL" }));
}

export function anomalies(engine: CensusEngine) {
  return engine.anomalies.map((x) => ({ id: x.id, kind: x.kind, severity: x.severity, subject_type: x.subjectType, subject: x.subjectId, governorate: x.govId, method: x.method, score: +x.score.toFixed(3), detected: engine.timeOf(x.step).toISOString(), what: x.what.en, why: x.why.en, recommendation: x.recommendation.en, status: x.status, decision: x.decision?.action ?? "", decided_by: x.decision?.by ?? "", nature: "SYNTHETIC_OPERATIONAL (AI-assisted anomaly simulation)" }));
}

export function scenarioResults(engine: CensusEngine, params: FullScenario, name: string) {
  const run = runScenario(engine.world, engine.world.totals.population, params);
  const base = runScenario(engine.world, engine.world.totals.population, DEFAULT_PARAMS);
  return PROJECTION_YEARS.flatMap((y) => compareScenarios([{ name, run }, { name: "Baseline", run: base }], y).flatMap((c) => c.values.map((v) => ({ year: y, scenario: v.name, indicator: c.key, value: Math.round(v.value * 100) / 100, change_vs_base_year: Math.round(v.delta * 100) / 100, nature: "SIMULATED" }))));
}

export function pesResults(engine: CensusEngine) {
  const r = engine.pesResult;
  if (!r) return [];
  const row = (level: string, gov: string, s: PESSummary) => ({ level, governorate: gov, areas: s.areas, census_count: s.census, pes_count: s.pes, matched: s.matched, omissions: s.omissions, erroneous_inclusions: s.erroneous, duplicates: s.duplicates, dual_system_estimate: Math.round(s.dualSystemEstimate), match_rate: +s.matchRate.toFixed(4), net_coverage_error: +s.netCoverageError.toFixed(4), gross_coverage_error: +s.grossCoverageError.toFixed(4), nature: "SIMULATED POST-ENUMERATION SURVEY" });
  return [row("NATIONAL", "JOR", r.national), ...Object.entries(r.byGov).map(([g, s]) => row("GOVERNORATE", g, s))];
}

/** One row per governorate with the headline Planning Lab indicators (baseline scenario, 2035/2040 horizons). */
export function planningLabIndicators(engine: CensusEngine) {
  const world = engine.world;
  const run = runScenario(world, world.totals.population, DEFAULT_PARAMS);
  const areaFor = (y: number) => smallArea(world, run, y);
  const base = run.baseYear;
  const sa0 = areaFor(base);
  const sa35 = areaFor(2035);
  const sa40 = areaFor(2040);
  const inv = facilityInventory(world, sa0);
  const schools = analyseSiting(world, sa35, "SCHOOL", inv.SCHOOL, DEFAULT_NORMS.SCHOOL);
  const phc = analyseSiting(world, sa35, "PHC", inv.PHC, DEFAULT_NORMS.PHC);
  const housing = forecastHousing(world, areaFor, base, 2050, DEFAULT_HOUSING);
  const jobs = forecastJobs(world, run.series, areaFor, DEFAULT_JOBS);
  const water = simulateWater(world, areaFor, base, 2050, DEFAULT_WATER, 2040);
  const climate = assessClimate(world, sa40, DEFAULT_CLIMATE);
  return world.governorates.map((g) => {
    const cl = climate.districts.filter((d) => world.district[d.id].govId === g.id);
    return {
      governorate: g.name.en, governorate_ar: g.name.ar,
      population_base: Math.round(sa0.gov[g.id].pop), population_2035: Math.round(sa35.gov[g.id].pop), population_2040: Math.round(sa40.gov[g.id].pop),
      pop_65_plus_growth_to_2040: +(sa40.gov[g.id].a65 / sa0.gov[g.id].a65 - 1).toFixed(3),
      school_seat_gap_2035: Math.round(schools.byGov[g.id].gap), phc_capacity_gap_2035: Math.round(phc.byGov[g.id].gap),
      homes_needed_to_2035: Math.round(housing.byGov[g.id].need2035), jobs_needed_to_2035: Math.round(jobs.byGov[g.id].jobsNeeded2035),
      water_first_stress_year: water.stressYear[g.id] ?? "", water_supply_ratio_2040: +(water.byGov[g.id].find((x) => x.year === 2040)!.ratio).toFixed(3),
      people_at_heat_risk_2040: Math.round(cl.reduce((s, d) => s + d.atRisk, 0)), flood_exposed_2040: Math.round(cl.reduce((s, d) => s + d.floodExposed, 0)),
      scenario: "BASELINE", data_nature: "SIMULATED",
    };
  });
}

/** All corrective actions for all governorates (baseline scenario, 2040 horizon). */
export function areaActionPlans(engine: CensusEngine) {
  const world = engine.world;
  const run = runScenario(world, world.totals.population, DEFAULT_PARAMS);
  const np = buildPlans(world, planSnapshot(world, run, (y) => smallArea(world, run, y), 2040), liveCensus(engine));
  return world.governorates.flatMap((g) => np.plans[g.id].actions.map((a, i) => ({ governorate: g.name.en, rank_in_governorate: i + 1, sector: a.sector, severity: a.severity, horizon: a.horizon, action: a.title.en, action_ar: a.title.ar, rationale: a.rationale.en, kpi_target: a.kpi.en, lead_agency: a.lead.en, indicative_cost_jod_m: a.costM.toFixed(2), people_reached: Math.round(a.beneficiaries), districts: a.districts.map((d) => world.district[d].name.en).join(" | "), priority_score: a.score.toFixed(2), scenario: "BASELINE", horizon_year: 2040, data_nature: "SIMULATED" })));
}

import { generateWorld, DEFAULT_CONFIG } from "../src/simulation/generate";
import { computeProfile } from "../src/simulation/analytics";
import { runScenario, paramsForPreset } from "../src/simulation/scenarios";
import { survivalForE0 } from "../src/simulation/projection";
import { calculatePlan, planScenarios } from "../src/simulation/planning";
const w = generateWorld(DEFAULT_CONFIG);
const t = performance.now();
const p = computeProfile(w);
console.log("profile ms", (performance.now() - t).toFixed(0));
console.log({ pop: Math.round(p.population), hh: Math.round(p.households), avg: p.avgHHSize.toFixed(2), sexRatio: p.sexRatio.toFixed(1), median: p.medianAge.toFixed(1), dep: p.dependencyRatio.toFixed(1), a0_14: (p.groups.a0_14 / p.population).toFixed(3), a65: (p.groups.a65 / p.population).toFixed(3), urban: (p.urban / p.population).toFixed(3) });
console.log("emp", (p.labour.employed / p.labour.workingAge).toFixed(3), "unempRate", (p.labour.unemployed / (p.labour.employed + p.labour.unemployed)).toFixed(3), "lfpr", ((p.labour.employed + p.labour.unemployed) / (p.labour.employed + p.labour.unemployed + p.labour.outside)).toFixed(3));
console.log("school enr", (p.education.schoolEnrolled / p.education.schoolAge).toFixed(3), "uni", (p.education.uniEnrolled / p.education.uniAge).toFixed(3), "disab", (p.health.disability / p.health.pop5plus).toFixed(3), "insured", (p.health.insured / p.population).toFixed(3));
let l = 1, e = 0; const S = survivalForE0(75.5); for (let x = 0; x < 101; x++) { const n = l * S[x]; e += (l + n) / 2; l = n; } console.log("e0 check", e.toFixed(2));
for (const preset of ["BASELINE", "HIGH_GROWTH", "LOW_GROWTH", "MIGRATION_SHOCK", "AGEING"] as const) {
  const t2 = performance.now();
  const r = runScenario(w, w.totals.population, paramsForPreset(preset));
  const i = r.impacts[2040]; const last = r.series.at(-1)!;
  console.log(preset, (performance.now() - t2).toFixed(0) + "ms", "2040 pop", Math.round(i.population), "2050", Math.round(last.population), "65+% 2050", (last.age65plus / last.population).toFixed(3), "classrooms Δ", Math.round(i.delta.classroomsRequired), "housing", Math.round(i.housingUnitsNeeded), "jobs Δ", Math.round(i.delta.jobsRequired), "water Δ", i.delta.waterMcm.toFixed(1));
}
console.log(planScenarios({ households: 2428924, fieldDays: 21, interviewsPerDay: 14, efficiency: 0.85, supervisorRatio: 8, reservePct: 0.1, trainingBatch: 35, deviceReservePct: 0.08, startDate: "2026-12-01", referenceDate: "2026-11-30", excludeFridays: true }).map(r => [r.name, r.enumerators, r.supervisors, r.devices, r.completionDate]));

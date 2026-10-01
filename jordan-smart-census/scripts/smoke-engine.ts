import { CensusEngine } from "../src/simulation/engine";
import { DEFAULT_CONFIG } from "../src/simulation/generate";
const t0 = Date.now();
const eng = new CensusEngine(DEFAULT_CONFIG);
console.log("init ms", Date.now() - t0);
let steps = 0;
const tStart = Date.now();
while (eng.phase !== "FINISHED" && steps < 200) {
  const t = Date.now();
  eng.advance(4); steps += 4;
  const agg = eng.aggregate();
  if (eng.day % 3 === 0 || eng.phase === "FINISHED") console.log(`day ${eng.day} ${Date.now() - t}ms compl ${(agg.completionPct*100).toFixed(1)}% exp ${(agg.expectedPct*100).toFixed(1)}% resp ${(agg.responseRate*100).toFixed(1)}% persons ${agg.persons} hh ${agg.completed} eaDone ${agg.eaByStatus.COMPLETED} risk ${agg.eaByStatus.COVERAGE_RISK} rev ${agg.eaByStatus.REVISIT_REQUIRED} issues ${eng.issues.length} anomalies ${eng.anomalies.length} alerts ${eng.alerts.length} offline ${agg.offline}`);
}
console.log("total sim ms", Date.now() - tStart, "phase", eng.phase, "day", eng.day);
const kinds: Record<string, number> = {}; for (const a of eng.anomalies) kinds[a.kind] = (kinds[a.kind] ?? 0) + 1; console.log(kinds);
const rules: Record<string, number> = {}; for (const a of eng.issues) rules[a.ruleId] = (rules[a.ruleId] ?? 0) + 1; console.log(rules);
const al: Record<string, number> = {}; for (const a of eng.alerts) al[a.type] = (al[a.type] ?? 0) + 1; console.log(al);
console.log(eng.anomalies.find(a => a.subjectId === "AMM-E0037")?.what.en);
console.log(eng.anomalies.find(a => a.subjectId === "IRB-0207")?.what.en);
eng.drawPES(120); eng.runPES(); const n = eng.pesResult!.national;
console.log("PES", eng.pesSample!.eaIds.length, { match: n.matchRate.toFixed(3), net: n.netCoverageError.toFixed(4), gross: n.grossCoverageError.toFixed(4), dse: Math.round(n.dualSystemEstimate), census: n.census });

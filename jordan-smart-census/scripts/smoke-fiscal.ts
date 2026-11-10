import { BASELINE, IMF_DEBT_PATH, derivedRatios } from "../src/data/fiscalBaseline";
import { runFiscal, scenario, stabilisingPrimaryBalance, jobsShock, type Band } from "../src/simulation/lab/fiscal";

const f1 = (v: number) => v.toFixed(1);
const d = derivedRatios();
console.log("BASELINE 2026  GDP JOD", (BASELINE.nominalGdp.value / 1000).toFixed(1), "bn | interest", f1(d.interestPctGdp), "% GDP,", f1(d.interestPctDomesticRevenue), "% of domestic revenue | primary balance", f1(d.primaryBalancePctGdp), "% (ex-grants", f1(d.primaryBalanceExGrantsPctGdp) + ") | r_eff", f1(d.effectiveRate), "| SSIF share", f1(d.ssifShareOfDebt), "%");
console.log("stabilising pb at 108.7 %, r 4.6, g 3.0, π 2.0:", stabilisingPrimaryBalance(108.7, 4.6, 3.0, 2.0).toFixed(2), "% of GDP");

// check against the IMF path
const A = runFiscal(scenario("A"));
const errs: number[] = [];
for (const [i, y] of IMF_DEBT_PATH.years.entries()) {
  const r = A.find((x) => x.year === y); if (!r) continue;
  errs.push(Math.abs(r.debtPct - IMF_DEBT_PATH.total[i]), Math.abs(r.debtExSscPct - IMF_DEBT_PATH.exSsc[i]));
  console.log(`IMF check ${y}: total ${f1(r.debtPct)} vs ${IMF_DEBT_PATH.total[i]} | ex-SSC ${f1(r.debtExSscPct)} vs ${IMF_DEBT_PATH.exSsc[i]}`);
}
const maxErr = Math.max(...errs);
console.log("max deviation from IMF path (pp):", maxErr.toFixed(2));
if (maxErr > 1.0) { console.error("FAIL: baseline drifts more than 1 pp from the IMF path"); process.exit(1); }

const cols = ["year", "real g%", "GDP $bn", "GDP/cap $", "debt%", "exSSC%", "debt JODbn", "rev JODbn", "exp JODbn", "PB%", "FB%", "int/rev%", "pubInv JODbn", "unemp%", "employed m"];
for (const [id, band] of [["A", "central"], ["B", "central"], ["C", "low"], ["C", "central"], ["C", "high"]] as [("A" | "B" | "C"), Band][]) {
  const rows = runFiscal(scenario(id, band));
  console.log(`\n== Scenario ${id}${id === "C" ? ` (${band})` : ""}: ${scenario(id, band).name}`);
  console.log(cols.join(" | "));
  for (const r of rows.filter((x) => [2026, 2030, 2035, 2040].includes(x.year))) {
    console.log([r.year, f1(r.realGrowth), f1(r.nominalGdpUsd), Math.round(r.gdpPcUsd), f1(r.debtPct), f1(r.debtExSscPct), f1(r.debt / 1000), f1(r.revenue / 1000), f1(r.expenditure / 1000), f1((r.primaryBalance / r.nominalGdp) * 100), f1((r.fiscalBalance / r.nominalGdp) * 100), f1(r.interestPctRevenue), f1(r.publicInvestment / 1000), f1(r.unemployment), (r.employed).toFixed(2)].join(" | "));
  }
}
// attribution C − B
const Bn = runFiscal(scenario("B"));
for (const band of ["low", "central", "high"] as Band[]) {
  const C = runFiscal(scenario("C", band));
  const at = (y: number) => [C.find((r) => r.year === y)!, Bn.find((r) => r.year === y)!];
  const out = [2030, 2035, 2040].map((y) => { const [c, b] = at(y); return `${y}: GDP +${f1(((c.realGdp / b.realGdp) - 1) * 100)}% | debt ${f1(c.debtPct - b.debtPct)} pp | unemp ${f1(c.unemployment - b.unemployment)} pp | jobs +${Math.round((c.employed - b.employed) * 1000)}k`; });
  console.log(`\nUfuq-attributable (C−B, ${band}):`, out.join("  ·  "));
}
const j = jobsShock(50000, 1), j2 = jobsShock(50000, 0.6);
console.log(`\n50,000 jobs @ avg productivity: GDP +JOD ${Math.round(j.dGdpJodM)} M (+${j.dGdpPct.toFixed(2)}%), revenue +JOD ${Math.round(j.dRevenueJodM)} M, unemp ${j.dUnemploymentPp.toFixed(2)} pp, debt ratio ${j.dDebtPctDenominator.toFixed(2)} pp (denominator only); @60%: +${j2.dGdpPct.toFixed(2)}% GDP`);
console.log("OK");

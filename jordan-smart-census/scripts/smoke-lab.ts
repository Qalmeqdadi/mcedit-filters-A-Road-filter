import { generateWorld, DEFAULT_CONFIG } from "../src/simulation/generate";
import { runScenario, DEFAULT_PARAMS } from "../src/simulation/scenarios";
import { smallArea, demandNodes } from "../src/simulation/lab/common";
import { facilityInventory, analyseSiting, suggestSites, DEFAULT_NORMS } from "../src/simulation/lab/facilities";
import { buildNetwork } from "../src/simulation/lab/network";

const t0 = performance.now();
const world = generateWorld(DEFAULT_CONFIG);
const run = runScenario(world, world.totals.population, DEFAULT_PARAMS);
const t1 = performance.now();
const sa0 = smallArea(world, run, run.baseYear);
const sa = smallArea(world, run, 2040);
console.log("world+run ms", Math.round(t1 - t0), "nodes", demandNodes(world).length, "sa ms", Math.round(performance.now() - t1));
console.log("nat base", Math.round(sa0.national.pop), "2040", Math.round(sa.national.pop), "sum gov", Math.round(Object.values(sa.gov).reduce((s, g) => s + g.pop, 0)), "sum dist", Math.round(Object.values(sa.district).reduce((s, g) => s + g.pop, 0)));
const inv = facilityInventory(world, sa0);
console.log("inventory", Object.fromEntries(Object.entries(inv).map(([k, v]) => [k, v.length])));
for (const kind of ["SCHOOL", "PHC", "HOSPITAL"] as const) {
  const t = performance.now();
  const a0 = analyseSiting(world, sa0, kind, inv[kind], DEFAULT_NORMS[kind]);
  const a = analyseSiting(world, sa, kind, inv[kind], DEFAULT_NORMS[kind]);
  const t2 = performance.now();
  const picks = suggestSites(world, sa, kind, inv[kind], DEFAULT_NORMS[kind], { count: 20, alpha: 0.5 });
  const a2 = analyseSiting(world, sa, kind, [...inv[kind], ...picks], DEFAULT_NORMS[kind]);
  console.log(kind, "access base", (a0.accessPct * 100).toFixed(1), "2040", (a.accessPct * 100).toFixed(1), "gap", Math.round(a.capacityGap), "needed", a.facilitiesNeeded, "ms", Math.round(t2 - t), "opt ms", Math.round(performance.now() - t2), "→ access", (a2.accessPct * 100).toFixed(1), "gap", Math.round(a2.capacityGap));
  console.log("  ", picks[0]?.reason?.en);
}
const net = buildNetwork(world);
console.log("network links", net.links.length);
import { buildGrid, simulateGrowth, GROWTH_REGIONS } from "../src/simulation/lab/urbanGrowth";
for (const r of GROWTH_REGIONS) {
  const t = performance.now();
  const grid = buildGrid(world, r.id);
  const t2 = performance.now();
  let u0 = 0; for (const v of grid.urban0) u0 += v;
  const line = [r.id, `grid ${grid.nx}x${grid.ny}`, `ms ${Math.round(t2 - t)}`, `urban0 ${(u0 * grid.cellKm2).toFixed(0)}km2`, `r90 ${grid.r90.toFixed(1)}`];
  for (const policy of ["COMPACT", "TREND", "SPRAWL"] as const) {
    const t3 = performance.now();
    const res = simulateGrowth(world, grid, (y) => smallArea(world, run, y), run.baseYear, 2050, { policy, greenBelt: false, boundaryKm: null });
    line.push(`${policy}: +${res.totals.newKm2.toFixed(0)}km2 cost ${res.totals.costM.toFixed(0)}M leap ${(res.totals.leapfrogShare * 100).toFixed(0)}% dist ${res.series.at(-1)!.meanDistKm.toFixed(1)} (${Math.round(performance.now() - t3)}ms)`);
  }
  console.log(line.join(" | "));
}
import { simulateWater, DEFAULT_WATER, compareLevers } from "../src/simulation/lab/water";
{
  const t = performance.now();
  const af = (y: number) => smallArea(world, run, y);
  const w = simulateWater(world, af, run.baseYear, 2050, DEFAULT_WATER);
  const n = w.national;
  console.log("water ms", Math.round(performance.now() - t), "stress year", w.nationalStressYear, n.filter((x) => [2026, 2030, 2035, 2040, 2050].includes(x.year)).map((x) => `${x.year}: req ${x.requirement.toFixed(0)} sup ${x.supply.toFixed(0)} ratio ${x.ratio.toFixed(2)} lpcd ${x.deliveredLpcd.toFixed(0)}`).join(" | "));
  console.log("risk 2040", w.risk.find((r) => r.year === 2040), "gov stress", w.stressYear);
  console.log(compareLevers(world, af, run.baseYear, DEFAULT_WATER));
}
import { forecastHousing, DEFAULT_HOUSING } from "../src/simulation/lab/housingNeed";
import { forecastJobs, DEFAULT_JOBS } from "../src/simulation/lab/jobs";
import { forecastAgeing, DEFAULT_AGEING } from "../src/simulation/lab/ageing";
import { probabilisticProjection, probAbove } from "../src/simulation/lab/uncertainty";
{
  const af = (y: number) => smallArea(world, run, y);
  let t = performance.now();
  const h = forecastHousing(world, af, run.baseYear, 2050, DEFAULT_HOUSING);
  const pick = (y: number) => h.national.find((x) => x.year === y)!;
  console.log("housing ms", Math.round(performance.now() - t), "completions", h.completions, "base", h.base, [2027, 2030, 2035, 2050].map((y) => `${y}: need ${Math.round(pick(y).need)} new ${Math.round(pick(y).newHouseholds)} rep ${Math.round(pick(y).replacement)} bl ${Math.round(pick(y).backlog)} rel ${Math.round(pick(y).vacancyRelease)} gap ${Math.round(pick(y).cumulativeGap)}`).join(" | "));
  console.log("  AMM", h.byGov.AMM, "MAF", Math.round(h.byGov.MAF.per1000));
  t = performance.now();
  const j = forecastJobs(world, run.series, af, DEFAULT_JOBS);
  const jp = (y: number) => j.series.find((x) => x.year === y)!;
  console.log("jobs ms", Math.round(performance.now() - t), "u0", j.u0.toFixed(3), "lfpr m", j.lfpr.m.map((x) => x.toFixed(2)).join(","), "f", j.lfpr.f.map((x) => x.toFixed(2)).join(","));
  console.log("  ", [2027, 2030, 2035, 2050].map((y) => `${y}: LF ${Math.round(jp(y).labourForce)} needHold ${Math.round(jp(y).netNeedHold)} needTarget ${Math.round(jp(y).netNeedTarget)} created ${Math.round(jp(y).netCreated)} u ${(jp(y).impliedUnemployment * 100).toFixed(1)} entrants ${Math.round(jp(y).entrants)} exits ${Math.round(jp(y).exits)}`).join(" | "));
  t = performance.now();
  const a = forecastAgeing(world, run.series, af, DEFAULT_AGEING);
  const ap = (y: number) => a.series.find((x) => x.year === y)!;
  console.log("ageing ms", Math.round(performance.now() - t), "prev", a.prevalence.map((x) => x.toFixed(3)).join(","), [2026, 2040, 2050].map((y) => `${y}: 65+ ${Math.round(ap(y).a65)} oadr ${ap(y).oadr.toFixed(1)} median ${ap(y).medianAge.toFixed(1)} beds ${Math.round(ap(y).beds)} disabled ${(ap(y).disabledShare * 100).toFixed(1)}%`).join(" | "));
  t = performance.now();
  const u = probabilisticProjection(world, world.totals.population, DEFAULT_PARAMS);
  const b = u.bands.population.find((x) => x.year === 2050)!;
  console.log("uncertainty ms", Math.round(performance.now() - t), "2050 pop", Math.round(b.p025), Math.round(b.p50), Math.round(b.p975), "P>16M", probAbove(u, "population", 2050, 16e6));
}
import { runNowcast } from "../src/simulation/lab/nowcast";
import { simulateShock, DEFAULT_SHOCK } from "../src/simulation/lab/shock";
import { simulateMobility, calibrateMobility, DEFAULT_MOBILITY } from "../src/simulation/lab/mobility";
import { assessClimate, DEFAULT_CLIMATE } from "../src/simulation/lab/climate";
import { buildProjects, scoreProjects, selectPortfolio, DEFAULT_WEIGHTS } from "../src/simulation/lab/capital";
{
  const af = (y: number) => smallArea(world, run, y);
  const b = run.series[1];
  let t = performance.now();
  const nc = runNowcast(world, sa0, b.births / b.population, b.deaths / b.population, 15000, world.config.startDate);
  console.log("nowcast ms", Math.round(performance.now() - t), "nat mape", JSON.stringify(nc.national.mape), ["MAF", "IRB", "AQB", "AMM", "KAR"].map((g) => `${g} det ${nc.byGov[g as "MAF"].detectedMonth} mape acc ${(nc.byGov[g as "MAF"].mape.accounting * 100).toFixed(2)} now ${(nc.byGov[g as "MAF"].mape.nowcast * 100).toFixed(2)}`).join(" | "));
  const inv = facilityInventory(world, sa0);
  const sch = analyseSiting(world, sa0, "SCHOOL", inv.SCHOOL, DEFAULT_NORMS.SCHOOL);
  const phc = analyseSiting(world, sa0, "PHC", inv.PHC, DEFAULT_NORMS.PHC);
  const w = simulateWater(world, af, run.baseYear, 2050, DEFAULT_WATER);
  const lp = Object.fromEntries(Object.entries(w.byGov).map(([g, s]) => [g, s[0].deliveredLpcd]));
  t = performance.now();
  const sh = simulateShock(world, sa0, sch, phc, lp, DEFAULT_SHOCK);
  console.log("shock ms", Math.round(performance.now() - t), sh.totals, "breach MAF", sh.firstBreach.MAF, "IRB", sh.firstBreach.IRB, "actions", sh.actions.length, sh.actions[0]?.text.en);
  t = performance.now();
  const cal = calibrateMobility(world, sa0, DEFAULT_MOBILITY);
  const mb = simulateMobility(world, sa0, DEFAULT_MOBILITY, cal.asc, cal.capacity);
  const mb40 = simulateMobility(world, af(2040), DEFAULT_MOBILITY, cal.asc, cal.capacity);
  const mbB = simulateMobility(world, af(2040), { ...DEFAULT_MOBILITY, corridors: ["AMM-ZAR", "AMM-SALT"] }, cal.asc, cal.capacity);
  console.log("mobility ms", Math.round(performance.now() - t), "asc", mb.asc.toFixed(2), "base", Math.round(mb.trips), (mb.transitShare * 100).toFixed(1), mb.meanMinutes.toFixed(1), mb.meanKm.toFixed(1), "maxVC", Math.max(...mb.links.map((l) => l.vc)).toFixed(2), "| 2040 maxVC", Math.max(...mb40.links.map((l) => l.vc)).toFixed(2), "share", (mb40.transitShare * 100).toFixed(1), "co2", Math.round(mb40.co2TonsYear), "| BRT share", (mbB.transitShare * 100).toFixed(1), "co2", Math.round(mbB.co2TonsYear), mbB.corridorTrips);
  t = performance.now();
  const cl = assessClimate(world, af(2040), DEFAULT_CLIMATE);
  console.log("climate ms", Math.round(performance.now() - t), JSON.stringify(cl.totals), cl.actions[0].text.en, cl.districts.slice(0,50).map(d=>d.cls[0]).join(""));
  const s40 = { SCHOOL: analyseSiting(world, af(2035), "SCHOOL", inv.SCHOOL, DEFAULT_NORMS.SCHOOL), PHC: analyseSiting(world, af(2035), "PHC", inv.PHC, DEFAULT_NORMS.PHC), HOSPITAL: analyseSiting(world, af(2035), "HOSPITAL", inv.HOSPITAL, DEFAULT_NORMS.HOSPITAL) };
  const sb = { SCHOOL: sch, PHC: phc, HOSPITAL: analyseSiting(world, sa0, "HOSPITAL", inv.HOSPITAL, DEFAULT_NORMS.HOSPITAL) };
  const projects = scoreProjects(buildProjects(world, { siting: s40, sitingBase: sb, housing: forecastHousing(world, af, run.baseYear, 2050, DEFAULT_HOUSING), water: w }), DEFAULT_WEIGHTS);
  const pf = selectPortfolio(projects, 1500);
  console.log("capital projects", projects.length, "total cost", Math.round(projects.reduce((s, p) => s + p.costM, 0)), "portfolio 1500M", pf.selected.length, Math.round(pf.spentM), Math.round(pf.beneficiaries), JSON.stringify(pf.bySector));
}

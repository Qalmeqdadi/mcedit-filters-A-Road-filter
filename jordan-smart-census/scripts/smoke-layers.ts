import { CensusEngine, SHIFTS_PER_DAY } from "../src/simulation/engine";
import { DEFAULT_CONFIG } from "../src/simulation/generate";
import { runScenario, DEFAULT_PARAMS } from "../src/simulation/scenarios";
import { smallArea } from "../src/simulation/lab/common";
import { planSnapshot, buildPlans, liveCensus } from "../src/simulation/lab/actions";
const engine = new CensusEngine(DEFAULT_CONFIG);
engine.start(); engine.advance(SHIFTS_PER_DAY * 6);
const run = runScenario(engine.world, engine.world.totals.population, DEFAULT_PARAMS);
const af = (y: number) => smallArea(engine.world, run, y);
let t = performance.now();
const s = planSnapshot(engine.world, run, af, 2040);
console.log("snapshot ms", Math.round(performance.now() - t));
const np = buildPlans(engine.world, s, liveCensus(engine));
const f = (n: number, d = 0) => n.toFixed(d);
console.log("GDP base M", f(s.economy.gdpBase), "year", s.economy.gdpYear, "theil", f(s.economy.national.theilBase, 4), f(s.economy.national.theilH, 4), "pub", f(s.economy.national.publicShare, 2));
for (const g of engine.world.governorates) {
  const e = s.economy.byGov[g.id], l = s.land.byGov[g.id], en = s.energy.byGov[g.id], fi = np.finance.byGov[g.id];
  console.log(g.id, "idx", f(e.index, 2), "pcap", f(e.perCapH), "hhi", f(e.hhi, 2), "pub", f(e.publicShare, 2), "| land dev", f(l.developableKm2), "dem", f(l.demandKm2, 1), "yrs", f(l.yearsSupply), "agri", f(l.agriAtRiskKm2, 1), "| peak", f(en.peakBase), "→", f(en.peakH), "cap", f(en.capacity), "yr", en.capacityYear, "roof", f(en.rooftopMW), "lf", en.landfillFullYear, "sew", f(en.sewerShare, 2), "| opp", f(s.equity.index[g.id]), "| need", f(fi.needM), "space", f(fi.spaceM), "cov", f(fi.coverage, 2), "own", f(fi.ownRevenuePc));
}
console.log("energy nat TWh base", f(s.energy.series[0].twh, 1), "peak", f(s.energy.national.peakBase), "→", f(s.energy.national.peakH));
console.log("SDGs", s.equity.sdgs.map((x) => `${x.target}:${f(x.national, 3)}:${x.status}`).join(" "));
console.log("lagging", s.equity.districts.slice(0, 6).map((d) => `${engine.world.district[d.id].name.en}(${f(d.index)},${d.weakest})`).join(" "));
const by: Record<string, number> = {};
for (const p of Object.values(np.plans)) for (const a of p.actions) by[a.sector] = (by[a.sector] ?? 0) + 1;
console.log("actions by sector", by, "fin nat", f(np.finance.national.needM), f(np.finance.national.spaceM), f(np.finance.national.coverage, 2));

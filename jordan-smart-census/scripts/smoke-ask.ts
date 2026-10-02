import { CensusEngine, SHIFTS_PER_DAY } from "../src/simulation/engine";
import { DEFAULT_CONFIG } from "../src/simulation/generate";
import { runScenario, DEFAULT_PARAMS } from "../src/simulation/scenarios";
import { smallArea } from "../src/simulation/lab/common";
import { answer, SUGGESTIONS } from "../src/simulation/lab/ask";
const engine = new CensusEngine(DEFAULT_CONFIG);
engine.start(); engine.advance(SHIFTS_PER_DAY * 6);
const run = runScenario(engine.world, engine.world.totals.population, DEFAULT_PARAMS);
const ctx = { world: engine.world, engine, run, areaFor: (y: number) => smallArea(engine.world, run, y), scenarioName: "Baseline" };
for (const q of [...SUGGESTIONS.flatMap((s) => [s.en, s.ar]), "what is the weather", "population of Ramtha in 2045", "top 3 governorates for housing need"]) {
  const t = performance.now();
  const a = answer(ctx, q);
  console.log(`${Math.round(performance.now() - t)}ms [${a.parsed.topic}/${a.parsed.op}/${a.parsed.govId ?? "-"}/${a.parsed.year ?? "-"}] ${q}\n   → ${a.headline.en}`);
}

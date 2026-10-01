import { CensusEngine } from "../src/simulation/engine";
import { DEFAULT_CONFIG } from "../src/simulation/generate";
const eng = new CensusEngine(DEFAULT_CONFIG);
eng.advance(21 * 4);
console.log("reserves", eng.reservesDeployed, "/", eng.reservePool);
const lag = eng.world.eas.map((a, k) => ({ a, s: eng.ea[k] })).filter(({ a, s }) => s.visited < a.dwellingsTrue);
console.log("unfinished EAs at day 21", lag.length);
const byKind: Record<string, number> = {}; const byDist: Record<string, number> = {};
let rem = 0;
for (const { a, s } of lag) { const e = eng.world.enumerators[eng.world.enumIdx.get(a.enumeratorId)!]; byKind[e.profile.kind] = (byKind[e.profile.kind] ?? 0) + 1; byDist[a.districtId] = (byDist[a.districtId] ?? 0) + 1; rem += a.dwellingsTrue - s.visited; }
console.log(byKind, "remaining dwellings", rem, Object.entries(byDist).sort((a,b)=>b[1]-a[1]).slice(0,8), eng.disruptions.map(d=>d.districtId));
const exp = eng.world.eas.map(a => a.startDay + a.expectedDays); exp.sort((a,b)=>a-b);
console.log("planned end p50/p90/p99/max", exp[Math.floor(exp.length*.5)], exp[Math.floor(exp.length*.9)], exp[Math.floor(exp.length*.99)], exp.at(-1));
const sizes = eng.world.enumerators.map(e => e.householdsAssigned).sort((a,b)=>a-b);
console.log("workload p50/p90/max", sizes[Math.floor(sizes.length*.5)], sizes[Math.floor(sizes.length*.9)], sizes.at(-1));

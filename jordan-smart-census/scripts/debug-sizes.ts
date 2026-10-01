import { generateWorld, DEFAULT_CONFIG } from "../src/simulation/generate";
const w = generateWorld(DEFAULT_CONFIG);
const big = [...w.enumerators].sort((a, b) => b.householdsAssigned - a.householdsAssigned).slice(0, 5);
for (const e of big) console.log(e.id, e.districtId, e.householdsAssigned, e.eaIds.length, e.eaIds.slice(0, 4).map(id => w.eas[w.eaIdx.get(id)!].hhEstimate));
const eas = [...w.eas].sort((a, b) => b.hhEstimate - a.hhEstimate).slice(0, 5).map(a => [a.id, a.districtId, a.urban, a.hhEstimate]);
console.log(eas);
for (const d of w.districts.filter(d => ["ZAR-D01","AMM-D05"].includes(d.id))) {
  const de = w.eas.filter(a => a.districtId === d.id); const en = w.enumerators.filter(e => e.districtId === d.id);
  console.log(d.id, "hh", d.households, "EAs", de.length, "enums", en.length, "sum ea hh", de.reduce((s,a)=>s+a.hhEstimate,0));
}

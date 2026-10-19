import { INDICATORS, freshness, scorecards, proposedRequests, AS_OF } from "@/data/registry";
console.log("as of", AS_OF, "indicators", INDICATORS.length);
const c: Record<string, number> = {};
for (const i of INDICATORS) { const f = freshness(i).state; c[i.status + "/" + f] = (c[i.status + "/" + f] ?? 0) + 1; }
console.log(c);
for (const s of scorecards()) console.log(s.entity.id.padEnd(6), s.owned, s.available, s.current, s.late, s.stale, s.missing, s.score);
console.log(proposedRequests().map((r) => `${r.id} ${r.entityId} ${r.reason} ${r.indicatorIds.length}`).join("\n"));

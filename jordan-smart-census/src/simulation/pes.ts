/**
 * SIMULATED POST-ENUMERATION SURVEY.
 *
 * An independent re-enumeration of a stratified sample of completed EAs.
 * For each sampled EA:
 *   C   = census count (persons, incl. count-imputation for non-responding occupied dwellings)
 *   EE  = erroneous inclusions, DUP = duplicates  → CE = C − EE − DUP (correct enumerations)
 *   T   = true resident population of the simulated world (hidden truth)
 *   P   = PES count  ~ Binomial(T, pesCoverage)
 *   M   = matched    ~ Binomial(P, CE / T)   (independence assumption)
 * Dual-system (Chandra Sekar–Deming) estimate per stratum: N̂ = CE × P / M
 *   match rate          = M / P
 *   net coverage error  = (C − N̂) / N̂        (negative = net under-count)
 *   gross coverage error= (omissions + EE + DUP) / N̂, omissions = N̂ − CE
 */
import type { GovId, PESAreaResult, PESResult, PESSample, PESSummary } from "@/types/census";
import type { CensusEngine } from "./engine";
import { derive } from "./rng";

export function drawPESSample(engine: CensusEngine, n: number): PESSample {
  const { world } = engine;
  const rng = derive(world.config.seed, "pes-sample", engine.step, n);
  const eligible = world.eas.map((a, k) => ({ a, k })).filter(({ k }) => engine.ea[k].status === "COMPLETED" || engine.ea[k].visited / Math.max(1, world.eas[k].dwellingsTrue) >= 0.95);
  const byGov = new Map<GovId, number[]>();
  for (const { a, k } of eligible) {
    const list = byGov.get(a.govId) ?? [];
    list.push(k);
    byGov.set(a.govId, list);
  }
  const total = eligible.length;
  const picked: string[] = [];
  for (const [, list] of byGov) {
    const alloc = Math.min(list.length, Math.max(4, Math.round((n * list.length) / Math.max(1, total))));
    rng.shuffle(list);
    for (const k of list.slice(0, alloc)) picked.push(world.eas[k].id);
  }
  return { eaIds: picked, drawnAtStep: engine.step, method: "STRATIFIED_RANDOM" };
}

function summarise(areas: PESAreaResult[]): PESSummary {
  const sum = (f: (a: PESAreaResult) => number) => areas.reduce((s, a) => s + f(a), 0);
  const census = sum((a) => a.censusCount);
  const pes = sum((a) => a.pesCount);
  const matched = sum((a) => a.matched);
  const erroneous = sum((a) => a.erroneous);
  const duplicates = sum((a) => a.duplicates);
  const ce = census - erroneous - duplicates;
  const dse = matched > 0 ? (ce * pes) / matched : census;
  const omissionsEst = Math.max(0, dse - ce);
  return {
    areas: areas.length,
    census,
    pes,
    matched,
    omissions: pes - matched,
    erroneous,
    duplicates,
    correctEnumerations: ce,
    dualSystemEstimate: dse,
    matchRate: pes ? matched / pes : 0,
    netCoverageError: dse ? (census - dse) / dse : 0,
    grossCoverageError: dse ? (omissionsEst + erroneous + duplicates) / dse : 0,
    omissionRate: dse ? omissionsEst / dse : 0,
    erroneousRate: census ? (erroneous + duplicates) / census : 0,
  };
}

export function runPostEnumerationSurvey(engine: CensusEngine, sample: PESSample): PESResult {
  const { world } = engine;
  const areas: PESAreaResult[] = [];
  for (const id of sample.eaIds) {
    const k = world.eaIdx.get(id)!;
    const a = world.eas[k];
    const s = engine.ea[k];
    const e = world.enumerators[world.enumIdx.get(a.enumeratorId)!];
    const rng = derive(world.config.seed, "pes", id);
    const meanSize = s.completed ? s.persons / s.completed : 4.8;
    // census count includes count-imputation for occupied, non-responding dwellings (refusals, final non-contacts)
    const C = s.persons + Math.round((s.refusals + s.noContactFinal + s.noContactPending) * meanSize);
    // hidden truth: all true households × observed mean size, plus hidden omissions within enumerated households
    const T = Math.round(a.hhTrue * meanSize * rng.range(1.004, 1.02));
    const eeRate = 0.006 + (e.profile.kind === "FABRICATION_RISK" ? 0.09 : 0) + (e.profile.kind === "GPS_DRIFT" ? 0.03 : 0);
    const EE = rng.binomial(C, eeRate);
    const DUP = rng.binomial(C, a.urban ? 0.005 : 0.003);
    const CE = Math.min(T, C - EE - DUP);
    const P = rng.binomial(T, a.urban ? 0.962 : 0.974);
    const M = rng.binomial(P, CE / Math.max(1, T));
    areas.push({ eaId: id, govId: a.govId, censusCount: C, pesCount: P, matched: M, omissions: P - M, erroneous: EE, duplicates: DUP });
  }
  const byGov: Record<string, PESSummary> = {};
  for (const g of world.governorates) {
    const list = areas.filter((x) => x.govId === g.id);
    if (list.length) byGov[g.id] = summarise(list);
  }
  return { areas, byGov, national: summarise(areas), ranAtStep: engine.step };
}

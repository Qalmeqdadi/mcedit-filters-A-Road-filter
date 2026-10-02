/**
 * Probabilistic projection — Monte-Carlo over the scenario assumptions (SIMULATED).
 *
 * Each of R seeded runs draws
 *   TFR in 2050     = central × lognormal(σ = 0.12)
 *   e0 gain to 2050 = central + N(0, 1.2 years)
 *   net migration   = central + N(0, σ_mig), σ_mig default 20,000 / year
 * and re-runs the cohort-component projection (life expectancy quantised to 0.1 year).
 * Bands are empirical percentiles across runs. They express assumption uncertainty only —
 * not base-population error or model error — so they are a lower bound on true uncertainty.
 */
import type { World } from "../generate";
import { projectPopulation } from "../projection";
import { scenarioInputs, type FullScenario } from "../scenarios";
import { derive } from "../rng";
import { percentile } from "./common";

export interface UncertaintyParams {
  runs: number;
  tfrSigma: number;
  e0Sigma: number;
  migSigma: number;
}

export const DEFAULT_UNCERTAINTY: UncertaintyParams = { runs: 300, tfrSigma: 0.12, e0Sigma: 1.2, migSigma: 20000 };

export type Indicator = "population" | "age6_17" | "age65plus" | "age15_64" | "households";

export interface Band {
  year: number;
  p025: number;
  p10: number;
  p50: number;
  p90: number;
  p975: number;
}

export interface UncertaintyResult {
  years: number[];
  bands: Record<Indicator, Band[]>;
  /** final values per run, by year, for probability statements */
  draws: Record<Indicator, Record<number, number[]>>;
  params: UncertaintyParams;
}

const INDICATORS: Indicator[] = ["population", "age6_17", "age65plus", "age15_64", "households"];

export function probabilisticProjection(world: World, baseTotal: number, params: FullScenario, u: UncertaintyParams = DEFAULT_UNCERTAINTY): UncertaintyResult {
  const { baseYear, bp, inputs } = scenarioInputs(world, baseTotal, params);
  const rng = derive(world.config.seed, "uncertainty", u.runs, u.tfrSigma, u.e0Sigma, u.migSigma);
  const draws = Object.fromEntries(INDICATORS.map((k) => [k, {} as Record<number, number[]>])) as UncertaintyResult["draws"];
  let years: number[] = [];
  for (let r = 0; r < u.runs; r++) {
    const run = projectPopulation(
      { year: baseYear, m: bp.m, f: bp.f },
      {
        ...inputs,
        tfrEnd: Math.max(1.2, inputs.tfrEnd * Math.exp(rng.normal(0, u.tfrSigma) - (u.tfrSigma * u.tfrSigma) / 2)),
        e0End: inputs.e0End + rng.normal(0, u.e0Sigma),
        netMigration: inputs.netMigration + rng.normal(0, u.migSigma),
        e0Quantum: 0.1,
      },
    );
    if (!years.length) years = run.map((p) => p.year);
    for (const pt of run) for (const k of INDICATORS) (draws[k][pt.year] ??= []).push(pt[k]);
  }
  const bands = Object.fromEntries(
    INDICATORS.map((k) => [
      k,
      years.map((year) => {
        const s = draws[k][year].slice().sort((a, b) => a - b);
        return { year, p025: percentile(s, 0.025), p10: percentile(s, 0.1), p50: percentile(s, 0.5), p90: percentile(s, 0.9), p975: percentile(s, 0.975) };
      }),
    ]),
  ) as Record<Indicator, Band[]>;
  return { years, bands, draws, params: u };
}

/** Probability that the indicator exceeds a threshold in a year. */
export function probAbove(res: UncertaintyResult, k: Indicator, year: number, threshold: number) {
  const d = res.draws[k][year] ?? [];
  return d.length ? d.filter((x) => x > threshold).length / d.length : 0;
}

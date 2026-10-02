/**
 * Open-data layer: Jordan series from open mirrors of World Bank WDI and Our World in Data.
 * A snapshot is bundled at build time (scripts/fetch-open-data.mjs); the Data Connectors page can
 * refresh it at runtime where the browser is allowed to reach the source.
 */
import { OPEN_DATA_SNAPSHOT } from "./openData.generated";

export interface YearValue { year: number; value: number }
export interface ElectricityYear { year: number; demandTWh: number | null; generationTWh: number | null; renewablesShare: number | null; solarShare: number | null; perCapitaKWh: number | null; netImportsTWh: number | null; ghgMt: number | null }
export interface OpenSourceMeta { id: string; url: string; licence: string; rows: number; firstYear: number | null; lastYear: number | null; sha256: string }

export interface OpenData {
  fetchedAt: string;
  sources: OpenSourceMeta[];
  gdpUsd: YearValue[];
  population: YearValue[];
  inflation: YearValue[];
  electricity: ElectricityYear[];
}

/** The Jordanian dinar is pegged to the US dollar at 0.709 JOD per USD. */
export const JOD_PER_USD = 0.709;

export const latest = <T extends { year: number }>(xs: T[], pick?: (x: T) => number | null) => {
  const ok = pick ? xs.filter((x) => pick(x) !== null) : xs;
  return ok.length ? ok[ok.length - 1] : null;
};

let current: OpenData = OPEN_DATA_SNAPSHOT;
export const openData = () => current;
export const setOpenData = (d: OpenData) => { current = d; };

/** Calibration values used by the economy and energy layers. */
export function calibration(d: OpenData = current) {
  const gdp = latest(d.gdpUsd);
  const pop = latest(d.population);
  const el = latest(d.electricity, (x) => x.demandTWh);
  const re = latest(d.electricity, (x) => x.renewablesShare);
  return {
    gdpJodBn: gdp ? (gdp.value * JOD_PER_USD) / 1e9 : 36,
    gdpYear: gdp?.year ?? null,
    populationRef: pop?.value ?? null,
    populationYear: pop?.year ?? null,
    electricityTWh: el?.demandTWh ?? 23.7,
    electricityYear: el?.year ?? null,
    renewablesShare: (re?.renewablesShare ?? 24) / 100,
    renewablesYear: re?.year ?? null,
  };
}

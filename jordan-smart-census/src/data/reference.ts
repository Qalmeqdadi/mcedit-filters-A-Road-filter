import type { GovId, GovernorateProfile } from "@/types/census";

/**
 * REFERENCE DATA — governorate population baseline used as the census frame.
 *
 * These are rounded Department of Statistics (DoS) end-of-year 2024 population
 * estimates AS REPORTED IN SECONDARY SOURCES (web search results citing DoS).
 * They were NOT ingested from an official DoS file in this prototype and must be
 * verified against the DoS release before any operational use.
 *
 * `verification` documents exactly how each row was obtained.
 * Replace this table by importing an official DoS CSV (see Methodology →
 * "Replace reference data"); the import adapter validates it with Zod and the
 * whole platform regenerates from it.
 */
export type Verification = "SECONDARY_CONFIRMED" | "SECONDARY_SINGLE_SOURCE" | "DERIVED_RESIDUAL";

export interface GovReference {
  govId: GovId;
  population: number;
  year: number;
  verification: Verification;
}

export const REFERENCE_YEAR = 2024;

export const GOV_REFERENCE: GovReference[] = [
  { govId: "AMM", population: 4_920_100, year: 2024, verification: "SECONDARY_SINGLE_SOURCE" },
  { govId: "IRB", population: 2_139_200, year: 2024, verification: "DERIVED_RESIDUAL" },
  { govId: "ZAR", population: 1_675_700, year: 2024, verification: "SECONDARY_CONFIRMED" },
  { govId: "MAF", population: 675_200, year: 2024, verification: "SECONDARY_CONFIRMED" },
  { govId: "BAL", population: 603_700, year: 2024, verification: "SECONDARY_CONFIRMED" },
  { govId: "JER", population: 291_000, year: 2024, verification: "SECONDARY_CONFIRMED" },
  { govId: "AJL", population: 216_200, year: 2024, verification: "SECONDARY_CONFIRMED" },
  { govId: "MAD", population: 232_300, year: 2024, verification: "SECONDARY_CONFIRMED" },
  { govId: "KAR", population: 388_700, year: 2024, verification: "SECONDARY_CONFIRMED" },
  { govId: "TAF", population: 118_200, year: 2024, verification: "SECONDARY_CONFIRMED" },
  { govId: "MAN", population: 194_500, year: 2024, verification: "SECONDARY_CONFIRMED" },
  { govId: "AQB", population: 245_200, year: 2024, verification: "SECONDARY_CONFIRMED" },
];

/** Cross-check references (REFERENCE DATA). */
export const NATIONAL_REFERENCES = {
  /** World Bank WDI SP.POP.TOTL, via github.com/datasets/population (ODC-PDDL). */
  worldBank: [
    { year: 2020, value: 10_865_228 },
    { year: 2021, value: 11_066_356 },
    { year: 2022, value: 11_256_263 },
    { year: 2023, value: 11_439_213 },
    { year: 2024, value: 11_552_876 },
    { year: 2025, value: 11_520_684 },
  ],
  /** DoS General Population and Housing Census 2015 — headline totals as publicly reported. */
  census2015: { total: 9_531_712, amman: 4_007_526, irbid: 1_770_158 },
};

/**
 * SIMULATED — synthetic planning profiles per governorate. These drive the
 * synthetic population and fieldwork; they are illustrative assumptions and
 * NOT statistics about Jordan.
 */
export const GOV_PROFILES: Record<GovId, GovernorateProfile> = {
  AMM: { urbanShare: 0.96, meanHouseholdSize: 4.6, vacancyRate: 0.16, nonJordanianShare: 0.32, syrianShareOfNonJordanian: 0.45, accessibility: 0.9, growthDifferential: 0.0015 },
  IRB: { urbanShare: 0.85, meanHouseholdSize: 4.9, vacancyRate: 0.14, nonJordanianShare: 0.27, syrianShareOfNonJordanian: 0.75, accessibility: 0.85, growthDifferential: 0.0 },
  ZAR: { urbanShare: 0.95, meanHouseholdSize: 4.9, vacancyRate: 0.12, nonJordanianShare: 0.3, syrianShareOfNonJordanian: 0.55, accessibility: 0.85, growthDifferential: 0.001 },
  MAF: { urbanShare: 0.62, meanHouseholdSize: 5.4, vacancyRate: 0.12, nonJordanianShare: 0.45, syrianShareOfNonJordanian: 0.85, accessibility: 0.55, growthDifferential: 0.0035 },
  BAL: { urbanShare: 0.78, meanHouseholdSize: 4.9, vacancyRate: 0.17, nonJordanianShare: 0.22, syrianShareOfNonJordanian: 0.4, accessibility: 0.75, growthDifferential: -0.0005 },
  JER: { urbanShare: 0.7, meanHouseholdSize: 5.2, vacancyRate: 0.15, nonJordanianShare: 0.22, syrianShareOfNonJordanian: 0.5, accessibility: 0.8, growthDifferential: 0.0005 },
  AJL: { urbanShare: 0.72, meanHouseholdSize: 5.1, vacancyRate: 0.15, nonJordanianShare: 0.14, syrianShareOfNonJordanian: 0.45, accessibility: 0.7, growthDifferential: -0.001 },
  MAD: { urbanShare: 0.8, meanHouseholdSize: 4.9, vacancyRate: 0.16, nonJordanianShare: 0.2, syrianShareOfNonJordanian: 0.4, accessibility: 0.8, growthDifferential: 0.0 },
  KAR: { urbanShare: 0.6, meanHouseholdSize: 5.0, vacancyRate: 0.18, nonJordanianShare: 0.12, syrianShareOfNonJordanian: 0.4, accessibility: 0.65, growthDifferential: -0.0015 },
  TAF: { urbanShare: 0.7, meanHouseholdSize: 5.2, vacancyRate: 0.19, nonJordanianShare: 0.08, syrianShareOfNonJordanian: 0.35, accessibility: 0.6, growthDifferential: -0.002 },
  MAN: { urbanShare: 0.62, meanHouseholdSize: 5.4, vacancyRate: 0.17, nonJordanianShare: 0.16, syrianShareOfNonJordanian: 0.4, accessibility: 0.5, growthDifferential: -0.001 },
  AQB: { urbanShare: 0.9, meanHouseholdSize: 4.6, vacancyRate: 0.2, nonJordanianShare: 0.28, syrianShareOfNonJordanian: 0.3, accessibility: 0.7, growthDifferential: 0.003 },
};

export const GOV_ORDER: GovId[] = ["AMM", "IRB", "ZAR", "MAF", "BAL", "JER", "AJL", "MAD", "KAR", "TAF", "MAN", "AQB"];

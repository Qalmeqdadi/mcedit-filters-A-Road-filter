import type { GovId } from "@/types/census";

export interface SourceFile { url: string; retrieved: string; sha256: string }
export interface GovernorateLabour {
  fetchedAt: string;
  /** DoS PxWeb EMPALL / EMPALL1 — Jordanians 15+; counts OFFICIAL, rate DERIVED */
  annual: { label: string; updated: string; years: number[]; byGov: Record<GovId, { year: number; employed: number; unemployed: number; rate: number }[]>; sources: SourceFile[] };
  /** DoS quarterly Labour Force Survey releases — published rates by governorate (OFFICIAL) */
  quarterly: { period: string; total: { byGov: Record<GovId, number>; national: number | null }; jordanians: { byGov: Record<GovId, number>; national: number | null }; source: SourceFile }[];
}

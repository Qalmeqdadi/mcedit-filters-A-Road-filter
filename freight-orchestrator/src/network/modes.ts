// Transport modes and how each one sells space (2.3.1, 4.4.1, 3.2.2).
// Mode names match the `mode` enum in src/db/schema.ts.

export const MODES = ["ocean_fcl", "ocean_lcl", "air", "road", "rail"] as const;
export type Mode = (typeof MODES)[number];

/** The family a mode belongs to, for drawing and for hub compatibility. */
export type ModeFamily = "sea" | "air" | "road" | "rail";
export const FAMILY: Record<Mode, ModeFamily> = { ocean_fcl: "sea", ocean_lcl: "sea", air: "air", road: "road", rail: "rail" };

export type CapacityUnit = "teu" | "cbm" | "kg" | "pallet" | "wagon";

export interface ModeProfile {
  mode: Mode;
  label: string;
  /** What a departure's free space is counted in (2.3.1). */
  unit: CapacityUnit;
  unitLabel: string;
  /** How price is usually quoted, for normalisation (3.2.2). */
  priceBasis: "per_container" | "per_wm" | "per_kg" | "per_truck" | "per_container_rail";
  /** Cut-offs that apply to this mode (2.2.2). */
  cutoffs: string[];
}

export const MODE_PROFILES: Record<Mode, ModeProfile> = {
  ocean_fcl: { mode: "ocean_fcl", label: "Ocean FCL", unit: "teu", unitLabel: "TEU", priceBasis: "per_container", cutoffs: ["documentation", "vgm", "gate_in", "dangerous_goods"] },
  ocean_lcl: { mode: "ocean_lcl", label: "Ocean LCL", unit: "cbm", unitLabel: "m³", priceBasis: "per_wm", cutoffs: ["cfs_receiving", "documentation"] },
  air: { mode: "air", label: "Air", unit: "kg", unitLabel: "kg", priceBasis: "per_kg", cutoffs: ["acceptance", "screening", "dangerous_goods"] },
  road: { mode: "road", label: "Road", unit: "pallet", unitLabel: "pallets", priceBasis: "per_truck", cutoffs: ["loading_window", "border_documents"] },
  rail: { mode: "rail", label: "Rail", unit: "wagon", unitLabel: "wagons", priceBasis: "per_container_rail", cutoffs: ["gate_in", "documentation"] },
};

// ── Unit maths ───────────────────────────────────────────────────────────────

/** IATA volumetric divisor: 6,000 cm³ per kg, so 1 m³ counts as 166.67 kg. */
export const AIR_VOLUMETRIC_DIVISOR_CM3 = 6000;

/** Air chargeable weight: the greater of actual and volumetric weight, in kg. */
export function chargeableKg(grossKg: number, cbm: number): number {
  const volumetric = (cbm * 1_000_000) / AIR_VOLUMETRIC_DIVISOR_CM3;
  return round2(Math.max(grossKg, volumetric));
}

/** Ocean LCL weight-or-measure: 1 tonne or 1 m³, whichever is greater. */
export function revenueTons(grossKg: number, cbm: number): number {
  return round2(Math.max(grossKg / 1000, cbm));
}

/** Road loading metres for euro pallets (1.2 × 0.8 m) on a 2.4 m wide trailer: 3 across. */
export function loadingMetres(pallets: number, palletLengthM = 1.2, palletWidthM = 0.8, stackable = false): number {
  const perRow = Math.max(1, Math.floor(2.4 / palletWidthM + 1e-9));
  const floor = stackable ? Math.ceil(pallets / 2) : pallets;
  return round2(Math.ceil(floor / perRow) * palletLengthM);
}

/** A 13.6 m trailer takes 33 euro pallets on the floor. */
export const TRAILER_LOADING_METRES = 13.6;
export const trucksNeeded = (pallets: number, stackable = false) => Math.max(1, Math.ceil(loadingMetres(pallets, 1.2, 0.8, stackable) / TRAILER_LOADING_METRES));

const TEU: Record<string, number> = { "20GP": 1, "20RF": 1, "40GP": 2, "40HC": 2, "40RF": 2, "45HC": 2.25 };
/** TEU for an equipment code such as 40HC; unknown codes throw so a typo never prices as zero. */
export function teu(equipment: string): number {
  const k = equipment.replace(/['’\s]/g, "").toUpperCase().replace(/^(\d\d)HQ$/, "$1HC");
  const v = TEU[k];
  if (v === undefined) throw new Error(`unknown equipment ${equipment}`);
  return v;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

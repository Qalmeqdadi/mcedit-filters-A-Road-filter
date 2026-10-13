// Central demo configuration. Every number here is ILLUSTRATIVE and SYNTHETIC.
// Adjust these to re-tune the storyline without touching UI code.

export const DEMO = {
  plantName: "Intelligent Methanol Plant",
  /** Simulated plant clock at load: 06:58:20 (minutes after midnight). */
  simStartMinute: 6 * 60 + 58 + 20 / 60,
  /** Live data refresh interval (ms). */
  tickMs: 2500,
  productionTarget: 2550,
  availability: 97.2,
  /** Demo product specification (NOT a contractual or IMPCA limit). */
  purityLimit: 99.75,
  operator: { name: "Demo Shift Supervisor", role: "Shift Supervisor · Control Room", id: "usr-demo-ss01" },
};

export const ECONOMICS = {
  /**
   * Illustrative AED value attributed to one tonne of lost / recovered production.
   * The storyline figures in the brief (≈102 t/day ⇒ AED 1.0–1.2M/day) imply ≈ AED 11,000/t.
   * Replace with a validated margin per tonne before any real business case.
   */
  aedPerTonne: 11_000,
  gasPriceAedPerGj: 11.5,
  co2PerTonne: 0.56,
};

export const aedM = (tonnes: number) => (tonnes * ECONOMICS.aedPerTonne) / 1_000_000;

/** Exposure band ±8% around the point estimate, rounded to 0.1M. */
export const exposureBand = (tonnes: number): [number, number] => {
  const v = aedM(tonnes);
  return [Math.round(v * 0.92 * 10) / 10, Math.round(v * 1.08 * 10) / 10];
};

export const fmtAedM = (m: number) => (m >= 1 ? `AED ${m.toFixed(2).replace(/0$/, "")}M` : `AED ${Math.round(m * 1000)}K`);

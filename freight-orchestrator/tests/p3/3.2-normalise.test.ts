// 3.2 Normalise rates: one charge dictionary, one currency, one per-shipment basis.
import { describe, expect, it } from "vitest";
import { CHARGE_CODES, mapCharge, normaliseQuote, parseBreakdown } from "@/p3/charges";

describe("3.2.1 map charge names onto one dictionary", () => {
  it("codes are unique and every alias points at one code", () => {
    const codes = CHARGE_CODES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it.each([
    ["O/F", "OFR"],
    ["Basic Ocean Freight", "OFR"],
    ["BAF", "BAF"],
    ["THC origin", "THO"],
    ["DTHC", "THD"],
    ["B/L fee", "DOC"],
    ["Fuel surcharge", "FSC"],
    ["Linehaul", "RFR"],
    ["Border crossing", "BRD"],
  ])("%s → %s", (name, code) => {
    expect(mapCharge(name).code?.code).toBe(code);
  });

  it("is surer of an exact alias than a partial one", () => {
    expect(mapCharge("BAF").confidence).toBeGreaterThan(mapCharge("BAF (Q4 revised)").confidence);
  });

  it("never guesses an unknown charge", () => {
    expect(mapCharge("Congestion levy Z")).toEqual({ code: null, confidence: 0 });
  });
});

describe("3.2.2 convert currency and unit basis", () => {
  it("converts to the target currency and records the rate used", () => {
    const q = normaliseQuote([{ name: "O/F", amount: 1000, currency: "EUR" }], { containers: { "40HC": 1 } }, { currency: "USD", fx: { USD: 1, EUR: 1.1 } });
    expect(q.allIn).toBe(1100);
    expect(q.fxUsed).toEqual({ EUR: 1.1 });
  });

  it("multiplies per-container charges by the number of boxes", () => {
    const q = normaliseQuote([{ name: "O/F", amount: 1500, currency: "USD" }, { name: "B/L fee", amount: 60, currency: "USD" }], { containers: { "40HC": 2 } });
    expect(q.allIn).toBe(3060);
  });

  it("charges air freight on chargeable weight, not gross", () => {
    // 2 cbm at 6000 cm³/kg is 333.33 kg chargeable, above the 120 kg gross.
    const q = normaliseQuote([{ name: "Air freight", amount: 3, currency: "USD" }], { grossKg: 120, cbm: 2 });
    expect(q.lines[0]!.units).toBeCloseTo(333.33, 1);
    expect(q.allIn).toBeCloseTo(1000, 0);
  });

  it("resolves percentage charges after freight is known", () => {
    const q = normaliseQuote([{ name: "Linehaul", amount: 800, currency: "USD" }, { name: "Diesel surcharge", amount: 10, currency: "USD" }], { pallets: 10 });
    expect(q.allIn).toBe(880);
  });
});

describe("3.2.3 separate freight, surcharges, local charges and inland", () => {
  it("sums each category", () => {
    const q = normaliseQuote(parseBreakdown("O/F USD 1,850 + BAF 240 + THC origin 90 + DTHC 110 + Inland haulage 300"), { containers: { "40HC": 1 } });
    expect(q.byCategory).toMatchObject({ freight: 1850, surcharge: 240, origin: 90, destination: 110, inland: 300 });
    expect(q.allIn).toBe(2590);
  });
});

describe("3.2.4 record what is included and what is not", () => {
  it("keeps excluded lines out of the all-in but on the record", () => {
    const q = normaliseQuote([{ name: "O/F", amount: 1850, currency: "USD" }, { name: "DTHC", amount: 110, currency: "USD", included: false }], { containers: { "40HC": 1 } });
    expect(q.allIn).toBe(1850);
    expect(q.excluded.map((l) => l.code)).toEqual(["THD"]);
  });

  it("sends unknown charges and missing currencies to a person", () => {
    const q = normaliseQuote([{ name: "Congestion levy Z", amount: 50, currency: "USD" }, { name: "BAF", amount: 240 }], { containers: { "20GP": 1 } });
    expect(q.review.map((l) => l.review)).toEqual(['Unknown charge "Congestion levy Z": map it to a code', "Currency not stated"]);
  });
});

describe("parseBreakdown", () => {
  it("reads a one-line breakdown and carries the currency forward", () => {
    expect(parseBreakdown("O/F USD 1,850 + BAF 240 + THC origin 90").map((l) => [l.name, l.amount, l.currency])).toEqual([
      ["O/F", 1850, "USD"],
      ["BAF", 240, "USD"],
      ["THC origin", 90, "USD"],
    ]);
  });
});

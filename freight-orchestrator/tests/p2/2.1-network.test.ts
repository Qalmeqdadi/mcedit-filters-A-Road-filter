// 2.1 supply base, 11.1 master data and the 12.2 map lenses built on them.
import { beforeAll, describe, expect, it } from "vitest";
import type { Policy } from "@/governance/policy";
import {
  HUBS, JOBS, LANES, NETWORK_ACTORS as A, PANELS, PARTIES, SHIPMENTS,
  chargeableKg, distanceKm, findHub, hub, laneProblems, loadingMetres, networkFor, revenueTons, teu, trucksNeeded,
} from "@/network";
import { defaultPolicy } from "../support/fixtures";

let policy: Policy;
beforeAll(async () => {
  policy = (await defaultPolicy()).policy;
});

describe("11.1 master data", () => {
  it("hub codes are unique and coordinates are on the globe", () => {
    expect(new Set(HUBS.map((h) => h.code)).size).toBe(HUBS.length);
    for (const h of HUBS) {
      expect(Math.abs(h.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(h.lon)).toBeLessThanOrEqual(180);
    }
  });

  it("covers every mode in every pilot region", () => {
    const gcc = HUBS.filter((h) => h.region === "gcc").map((h) => h.kind);
    expect(new Set(gcc)).toEqual(new Set(["port", "airport", "rail", "truck"]));
    for (const r of ["europe", "east_asia", "south_asia", "africa", "americas"]) expect(HUBS.some((h) => h.region === r), r).toBe(true);
  });

  it("distances are sane (Jebel Ali to Shanghai is about 6,300 km great-circle)", () => {
    expect(distanceKm(hub("AEJEA"), hub("CNSHA"))).toBeGreaterThan(6000);
    expect(distanceKm(hub("AEJEA"), hub("CNSHA"))).toBeLessThan(6700);
  });

  it("finds hubs in free text, preferring the requested kind", () => {
    expect(findHub("ready at our supplier in Shanghai")?.code).toBe("CNSHA");
    expect(findHub("fly it from Shanghai", ["airport"])?.code).toBe("PVG");
    expect(findHub("deliver to our Riyadh warehouse", ["truck"])?.code).toBe("SARUH");
    expect(findHub("going to Jebel Ali")?.code).toBe("AEJEA");
    expect(findHub("nowhere in particular")).toBeUndefined();
  });
});

describe("2.1 supply base", () => {
  it("every lane uses hubs its mode can serve, run by a carrier that runs that mode", () => {
    expect(LANES.flatMap(laneProblems)).toEqual([]);
  });

  it("lane ids are unique", () => expect(new Set(LANES.map((l) => l.id)).size).toBe(LANES.length));

  it("the network has sea, air, road and rail carriers", () => {
    const modes = new Set(PARTIES.flatMap((p) => p.modes ?? []));
    for (const m of ["ocean_fcl", "air", "road", "rail"]) expect(modes.has(m as never), m).toBe(true);
  });

  it("panels only list carriers", () => {
    for (const ids of Object.values(PANELS)) for (const id of ids) expect(PARTIES.find((p) => p.id === id)?.type).toBe("carrier");
  });

  it("shipment legs chain and reference real lanes", () => {
    for (const s of SHIPMENTS) {
      expect(s.legs.length).toBeGreaterThan(0);
      for (const g of s.legs) if (g.laneId) expect(LANES.some((l) => l.id === g.laneId), `${s.id} ${g.laneId}`).toBe(true);
    }
  });
});

describe("capacity units per mode", () => {
  it("air chargeable weight is the greater of actual and volumetric (1 m³ = 166.67 kg)", () => {
    expect(chargeableKg(100, 1)).toBe(166.67);
    expect(chargeableKg(500, 1)).toBe(500);
  });
  it("LCL revenue tons are weight or measure", () => {
    expect(revenueTons(2500, 1.8)).toBe(2.5);
    expect(revenueTons(800, 3.4)).toBe(3.4);
  });
  it("33 euro pallets fill one 13.6 m trailer; 34 need two", () => {
    expect(loadingMetres(33)).toBe(13.2);
    expect(trucksNeeded(33)).toBe(1);
    expect(trucksNeeded(34)).toBe(2);
    expect(trucksNeeded(60, true)).toBe(1);
  });
  it("TEU per equipment code, and unknown codes are refused", () => {
    expect(teu("40HC")).toBe(2);
    expect(teu("40' HQ")).toBe(2);
    expect(teu("20GP")).toBe(1);
    expect(() => teu("53FT")).toThrow();
  });
});

describe("12.2 map lenses: each persona sees the network the permission matrix allows", () => {
  it("a desk sees the lanes of carriers on its panel, and only its own rates", () => {
    const v = networkFor(A.gulfwayAgent, policy);
    expect(v.lanes.length).toBeGreaterThan(30);
    for (const l of v.lanes) expect(PANELS["desk-gulfway"]!).toContain(l.carrierOrgId);
    for (const l of v.lanes) for (const r of l.rates) expect(r.deskOrgId).toBe("desk-gulfway");
    expect(v.lanes.some((l) => l.carrierOrgId === "car-silkrail")).toBe(false);
  });

  it("another desk sees its own panel and its own rates", () => {
    const v = networkFor(A.northseaAgent, policy);
    expect(v.lanes.every((l) => PANELS["desk-northsea"]!.includes(l.carrierOrgId))).toBe(true);
    expect(v.lanes.flatMap((l) => l.rates).every((r) => r.deskOrgId === "desk-northsea")).toBe(true);
    expect(v.shipments.every((s) => s.deskOrgId === "desk-northsea")).toBe(true);
  });

  it("a carrier sees only its own lanes, with the rates it gave each desk", () => {
    const v = networkFor(A.oceanlink, policy);
    expect(v.lanes.length).toBeGreaterThan(0);
    expect(v.lanes.every((l) => l.carrierOrgId === "car-oceanlink")).toBe(true);
    expect(v.lanes.find((l) => l.id === "L-OL-RTMJEA")?.rates.map((r) => r.deskOrgId).sort()).toEqual(["desk-gulfway", "desk-northsea"]);
  });

  it("a carrier sees shipments it carries, but not their legs or other carriers' shipments", () => {
    const v = networkFor(A.oceanlink, policy);
    expect(v.shipments.map((s) => s.id).sort()).toEqual(["SHP-2301", "SHP-2312", "SHP-2320"]);
    expect(v.shipments.every((s) => s.legs.length === 0)).toBe(true);
    expect(v.shipments.find((s) => s.id === "SHP-2301")?.main.laneId).toBe("L-OL-SHAJEA");
  });

  it("road, air and rail carriers each see their own network", () => {
    for (const [actor, org] of [[A.sahm, "car-sahm"], [A.falcon, "car-falcon"], [A.eastrail, "car-eastrail"]] as const) {
      const v = networkFor(actor, policy);
      expect(v.lanes.length, org).toBeGreaterThan(0);
      expect(v.lanes.every((l) => l.carrierOrgId === org)).toBe(true);
    }
  });

  it("a shipper sees no lanes and no rates, only its own shipments with their legs", () => {
    const v = networkFor(A.alNoor, policy);
    expect(v.lanes).toEqual([]);
    expect(v.shipments.map((s) => s.id).sort()).toEqual(["SHP-2301", "SHP-2310", "SHP-2312"]);
    expect(v.shipments.every((s) => s.legs.length > 0)).toBe(true);
    expect(v.jobs).toEqual([]);
    expect(v.parties.some((p) => p.id === "shp-kaizen")).toBe(false);
  });

  it("a partner sees only its own jobs and nothing commercial", () => {
    const v = networkFor(A.alSafa, policy);
    expect(v.jobs.map((j) => j.id)).toEqual(JOBS.filter((j) => j.partnerOrgId === "ptn-alsafa").map((j) => j.id));
    expect(v.lanes).toEqual([]);
    expect(v.shipments).toEqual([]);
  });

  it("every view reports the policy version it was built with", () => {
    expect(networkFor(A.gulfwayAgent, policy).checks.policyVersion).toBe(policy.version);
  });
});

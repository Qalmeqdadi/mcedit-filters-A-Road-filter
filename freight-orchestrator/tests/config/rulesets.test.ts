// Rule sets live in configuration: validated, versioned, permission-checked and audited (13.4).
import { describe, expect, it } from "vitest";
import { RULESET_KINDS } from "@/config/schema";
import { InMemoryConfigStore, loadDefaultRulesets, parseRuleset, RulesetValidationError } from "@/config/store";
import { publishRuleset } from "@/config/publish";
import { InMemoryAuditSink } from "@/governance/audit";
import { ForbiddenError, Policy } from "@/governance/policy";
import { ACTOR, ORG } from "../support/fixtures";

describe("default rule sets", () => {
  it("every rule set the document names exists and validates", () => {
    const d = loadDefaultRulesets();
    expect(Object.keys(d).sort()).toEqual([...RULESET_KINDS].sort());
    for (const k of ["carrier_selection", "margin", "approval", "ranking_weights", "confidence", "invoice_tolerance", "free_time", "notifications", "permissions"]) {
      expect(RULESET_KINDS).toContain(k);
    }
  });

  it("every permission grant and visibility rule names a declared role", () => {
    const p = loadDefaultRulesets().permissions;
    const roles = new Set(Object.keys(p.roles));
    for (const g of p.grants) expect(roles.has(g.role), g.role).toBe(true);
    for (const rules of Object.values(p.visibility)) for (const v of rules) expect(roles.has(v.role), v.role).toBe(true);
  });

  it("every field class used has a visibility rule", () => {
    const p = loadDefaultRulesets().permissions;
    for (const fields of Object.values(p.fields)) for (const cls of Object.values(fields)) expect(p.visibility[cls], cls).toBeDefined();
  });

  it("the ranking default names a real preset", () => {
    const r = loadDefaultRulesets().ranking_weights;
    expect(r.presets[r.deskDefault]).toBeDefined();
  });
});

describe("validation", () => {
  it("ranking weights must sum to 1", () => {
    expect(() => parseRuleset("ranking_weights", { presets: { x: { price: 0.5, transit: 0.5, reliability: 0.5, emissions: 0, risk: 0 } }, deskDefault: "x" })).toThrow(
      /weights must sum to 1/,
    );
  });
  it("confidence thresholds are between 0 and 1", () => {
    expect(() => parseRuleset("confidence", { defaultThreshold: 1.5, perField: {}, templateFlagAccuracy: 0.8 })).toThrow(RulesetValidationError);
  });
  it("margin floors are percentages", () => {
    expect(() => parseRuleset("margin", { currency: "USD", targetPct: 12, floorPct: -1, floorAbsolute: 0, roundTo: 5, customerAgreements: [] })).toThrow(RulesetValidationError);
  });
});

describe("versioning and desk overrides", () => {
  it("a desk override wins over the platform default; other desks keep the default", async () => {
    const s = InMemoryConfigStore.withDefaults();
    const base = loadDefaultRulesets().margin;
    await s.put("margin", { ...base, floorPct: 9 }, "u-desk-admin", ORG.desk);
    expect((await s.active("margin", ORG.desk)).body.floorPct).toBe(9);
    expect((await s.active("margin", ORG.desk)).id).toBe(`margin@1/${ORG.desk}`);
    expect((await s.active("margin", ORG.otherDesk)).body.floorPct).toBe(base.floorPct);
  });

  it("old versions stay readable for replay", async () => {
    const s = InMemoryConfigStore.withDefaults();
    const base = loadDefaultRulesets().margin;
    await s.put("margin", { ...base, targetPct: 15 }, "u");
    expect((await s.active("margin")).id).toBe("margin@2");
    expect((await s.get("margin", 1))!.body.targetPct).toBe(base.targetPct);
  });
});

describe("publishRuleset", () => {
  const setup = async () => {
    const config = InMemoryConfigStore.withDefaults();
    const audit = new InMemoryAuditSink();
    const policy = new Policy(await config.active("permissions"));
    return { config, audit, policy };
  };

  it("a desk admin can change its own desk's margin rules, and the change is audited", async () => {
    const deps = await setup();
    const body = { ...loadDefaultRulesets().margin, floorPct: 8 };
    const r = await publishRuleset(deps, ACTOR.deskAdmin, "margin", body, ORG.desk);
    expect(r.id).toBe(`margin@1/${ORG.desk}`);
    const [rec] = await deps.audit.list({ action: "config.publish" });
    expect(rec).toMatchObject({ outcome: "applied", process: "13.4", input: { from: "margin@1" }, output: { id: r.id } });
  });

  it("a desk agent cannot change rules; the attempt is audited", async () => {
    const deps = await setup();
    await expect(publishRuleset(deps, ACTOR.deskAgent, "margin", loadDefaultRulesets().margin, ORG.desk)).rejects.toThrow(ForbiddenError);
    expect((await deps.audit.list({ outcome: "denied" })).length).toBe(1);
  });

  it("a desk admin cannot change another desk's rules or the platform permission matrix", async () => {
    const deps = await setup();
    await expect(publishRuleset(deps, ACTOR.deskAdmin, "margin", loadDefaultRulesets().margin, ORG.otherDesk)).rejects.toThrow(ForbiddenError);
    await expect(publishRuleset(deps, ACTOR.deskAdmin, "permissions", loadDefaultRulesets().permissions, null)).rejects.toThrow(ForbiddenError);
  });

  it("an invalid rule set is refused and audited", async () => {
    const deps = await setup();
    await expect(publishRuleset(deps, ACTOR.platformAdmin, "confidence", { defaultThreshold: 2 })).rejects.toThrow(RulesetValidationError);
    expect((await deps.audit.list({ outcome: "refused" })).length).toBe(1);
  });
});

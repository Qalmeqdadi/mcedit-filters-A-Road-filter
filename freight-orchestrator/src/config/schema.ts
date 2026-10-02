// Schemas for every rule set the document says must live in configuration, not code.
// Rule sets are versioned: a change publishes a new version and is audited (12.3).
import { z } from "zod";

const pct = z.number().min(0).max(100);
const weight = z.number().min(0).max(1);

// ── 12.2 Permission matrix ───────────────────────────────────────────────────

export const PERSONAS = ["desk", "shipper", "carrier", "partner", "platform", "engine"] as const;
export const SCOPES = ["any", "desk", "shipper", "carrier", "partner", "self"] as const;

const condition = z.object({
  /** Attribute on the resource descriptor, e.g. "status" or "bookingConfirmed". */
  attr: z.string(),
  in: z.array(z.union([z.string(), z.number(), z.boolean()])).min(1),
});

const scoped = z.object({
  role: z.string(),
  scope: z.enum(SCOPES),
  when: z.array(condition).optional(),
});

export const permissionsSchema = z.object({
  roles: z.record(z.string(), z.object({ persona: z.enum(PERSONAS), label: z.string() })),
  /** Row-level: may this role perform this action on this resource? Default deny. */
  grants: z.array(scoped.extend({ actions: z.array(z.string()).min(1) })),
  /** Field-level: which sensitivity class each field belongs to. Unlisted fields are "general". */
  fields: z.record(z.string(), z.record(z.string(), z.string())),
  /** Who may see each sensitivity class. "general" is visible to anyone who may read the row. */
  visibility: z.record(z.string(), z.array(scoped)),
});

// ── 4.1.1 Carrier selection and 4.1.4 / 4.1.5 RFQ timing ────────────────────

export const carrierSelectionSchema = z.object({
  maxCarriersPerRfq: z.number().int().min(1),
  minReliabilityScore: z.number().min(0).max(100),
  requireLiveOnboarding: z.boolean(),
  excludeOnSanctionsHit: z.boolean(),
  /** Customer standing agreements (1.4.3) may name carriers to use or avoid. */
  honourCustomerAvoidList: z.boolean(),
});

export const rfqTimingSchema = z.object({
  /** 4.1.4: reply deadline is tied to the cut-off, not office hours. */
  replyDeadlineHoursBeforeCutoff: z.number().min(0),
  chaseAfterHours: z.number().min(0),
  maxChases: z.number().int().min(0),
});

// ── 4.7.1 Margin and 4.8.2 approval ─────────────────────────────────────────

export const marginSchema = z.object({
  currency: z.string().length(3),
  targetPct: pct,
  floorPct: pct,
  floorAbsolute: z.number().min(0),
  /** Round the sell price up to this step, in currency units. */
  roundTo: z.number().min(0),
  customerAgreements: z.array(z.object({ shipperOrgId: z.string(), targetPct: pct, floorPct: pct })),
});

export const approvalSchema = z.object({
  rules: z.array(
    z.object({
      id: z.string(),
      trigger: z.enum(["margin_below_floor", "sell_price_above", "cargo_value_above", "dangerous_goods", "feasibility_override"]),
      threshold: z.number().optional(),
      approverRole: z.string(),
    }),
  ),
});

// ── 4.6 Ranking weights ─────────────────────────────────────────────────────

const weights = z
  .object({ price: weight, transit: weight, reliability: weight, emissions: weight, risk: weight })
  .refine((w) => Math.abs(w.price + w.transit + w.reliability + w.emissions + w.risk - 1) < 1e-9, "weights must sum to 1");

export const rankingWeightsSchema = z.object({
  presets: z.record(z.string(), weights),
  deskDefault: z.string(),
});

// ── 4.3.2 / 4.3.3 Confidence thresholds ─────────────────────────────────────

export const confidenceSchema = z.object({
  defaultThreshold: z.number().min(0).max(1),
  perField: z.record(z.string(), z.number().min(0).max(1)),
  /** 4.3.5: below this accuracy a carrier's format is flagged as needing a template. */
  templateFlagAccuracy: z.number().min(0).max(1),
});

// ── 8.2.2 Invoice tolerances and 3.3.3 free time ────────────────────────────

export const invoiceToleranceSchema = z.object({
  absolute: z.number().min(0),
  pct: pct,
  perChargeCode: z.record(z.string(), z.object({ absolute: z.number().min(0), pct: pct })),
});

export const freeTimeSchema = z.object({
  defaultDemurrageDays: z.number().int().min(0),
  defaultDetentionDays: z.number().int().min(0),
});

// ── Notification triggers ───────────────────────────────────────────────────

export const notificationsSchema = z.object({
  triggers: z.array(
    z.object({
      /** "<machine>.<event>", e.g. "quote.publish". */
      on: z.string(),
      notify: z.array(z.enum(["desk", "shipper", "carrier", "partner"])).min(1),
      channels: z.array(z.enum(["portal", "email", "chat", "api"])).min(1),
    }),
  ),
});

// ── 1.5.1 Document requirements ─────────────────────────────────────────────

export const DOCUMENT_TYPES = [
  "purchase_order",
  "commercial_invoice",
  "packing_list",
  "certificate_of_origin",
  "dg_declaration",
  "safety_data_sheet",
  "export_licence",
  "photo",
] as const;

export const documentRequirementsSchema = z.object({
  rules: z.array(
    z.object({
      id: z.string(),
      when: z.object({
        mode: z.array(z.string()).optional(),
        dangerousGoods: z.boolean().optional(),
        incoterm: z.array(z.string()).optional(),
      }),
      required: z.array(z.enum(DOCUMENT_TYPES)).min(1),
      /** Needed before RFQ (to quote) or only before booking. */
      neededBy: z.enum(["rfq", "booking"]),
    }),
  ),
});

export const RULESET_SCHEMAS = {
  permissions: permissionsSchema,
  carrier_selection: carrierSelectionSchema,
  rfq_timing: rfqTimingSchema,
  margin: marginSchema,
  approval: approvalSchema,
  ranking_weights: rankingWeightsSchema,
  confidence: confidenceSchema,
  invoice_tolerance: invoiceToleranceSchema,
  free_time: freeTimeSchema,
  notifications: notificationsSchema,
  document_requirements: documentRequirementsSchema,
} as const;

export type RulesetKind = keyof typeof RULESET_SCHEMAS;
export type RulesetBody<K extends RulesetKind> = z.infer<(typeof RULESET_SCHEMAS)[K]>;
export const RULESET_KINDS = Object.keys(RULESET_SCHEMAS) as RulesetKind[];

export type Permissions = RulesetBody<"permissions">;
export type Scope = (typeof SCOPES)[number];
export type Persona = (typeof PERSONAS)[number];

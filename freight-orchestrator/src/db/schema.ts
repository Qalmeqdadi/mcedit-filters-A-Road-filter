// The core objects from the process document, plus the tables the added machines need.
// Status columns are Postgres enums generated from the state machines, and only
// src/state/apply.ts writes them.
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { MACHINES } from "../state/machines";

const statusEnum = <K extends keyof typeof MACHINES>(k: K) =>
  pgEnum(`${k}_status`, MACHINES[k].states as unknown as [(typeof MACHINES)[K]["states"][number], ...(typeof MACHINES)[K]["states"][number][]]);

export const requestStatus = statusEnum("request");
export const quoteStatus = statusEnum("quote");
export const bookingStatus = statusEnum("booking");
export const shipmentStatus = statusEnum("shipment");
export const chargeStatus = statusEnum("charge");
export const exceptionStatus = statusEnum("exception");
export const bidStatus = statusEnum("bid");
export const documentStatus = statusEnum("document");
export const capacityHoldStatus = statusEnum("capacity_hold");

export const partyType = pgEnum("party_type", ["desk", "shipper", "carrier", "partner", "platform"]);
export const mode = pgEnum("mode", ["ocean_fcl", "ocean_lcl", "air", "road", "rail"]);
export const channel = pgEnum("channel", ["email", "pdf", "chat", "api", "portal", "edi", "phone"]);
export const counterparty = pgEnum("counterparty", ["shipper", "carrier", "partner"]);
export const chargeCategory = pgEnum("charge_category", ["freight", "surcharge", "origin", "destination", "inland", "customs", "insurance"]);
export const rateKind = pgEnum("rate_kind", ["contract", "tender", "spot", "tariff"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const money = (name: string) => numeric(name, { precision: 14, scale: 2, mode: "number" });
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
/** Optimistic concurrency: bumped on every transition. */
const rowVersion = () => integer("row_version").notNull().default(0);

// ── Parties and people (1.4, 10, 12.1) ──────────────────────────────────────

export const party = pgTable("party", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: partyType("type").notNull(),
  country: text("country"),
  /** 2.1.2 / 10.4: sanctions, licence and insurance checks passed. */
  verified: boolean("verified").notNull().default(false),
  live: boolean("live").notNull().default(false),
  createdAt: created(),
});

/** A desk's relationships: its shippers (decision D), carrier panel and partners. */
export const deskRelationship = pgTable(
  "desk_relationship",
  {
    deskOrgId: text("desk_org_id").notNull().references(() => party.id),
    partyId: text("party_id").notNull().references(() => party.id),
    /** 1.4.3: carriers this shipper wants used or avoided are stored on the shipper side. */
    terms: jsonb("terms").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: created(),
  },
  (t) => [uniqueIndex("desk_relationship_pk").on(t.deskOrgId, t.partyId)],
);

export const appUser = pgTable("app_user", {
  id: text("id").primaryKey(),
  partyId: text("party_id").notNull().references(() => party.id),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(),
  createdAt: created(),
});

// ── Demand (1) ──────────────────────────────────────────────────────────────

export const request = pgTable(
  "request",
  {
    id: id(),
    ref: text("ref").notNull().unique(),
    deskOrgId: text("desk_org_id").notNull().references(() => party.id),
    shipperOrgId: text("shipper_org_id").notNull().references(() => party.id),
    status: requestStatus("status").notNull().default("draft"),
    sourceChannel: channel("source_channel").notNull(),
    /** 1.1.6: a revision points at the request it revises. */
    revisesRequestId: uuid("revises_request_id"),
    mode: mode("mode"),
    originLocode: text("origin_locode"),
    destinationLocode: text("destination_locode"),
    incoterm: text("incoterm"),
    readyDate: date("ready_date", { mode: "date" }),
    deliveryDeadline: date("delivery_deadline", { mode: "date" }),
    deadlineHard: boolean("deadline_hard").notNull().default(false),
    cargoValue: money("cargo_value"),
    cargoValueCurrency: text("cargo_value_currency"),
    targetPrice: money("target_price"),
    insuranceRequired: boolean("insurance_required").notNull().default(false),
    rankingPreset: text("ranking_preset"),
    createdAt: created(),
    rowVersion: rowVersion(),
  },
  (t) => [index("request_desk_idx").on(t.deskOrgId), index("request_shipper_idx").on(t.shipperOrgId)],
);

export const cargoItem = pgTable("cargo_item", {
  id: id(),
  requestId: uuid("request_id").notNull().references(() => request.id),
  description: text("description").notNull(),
  hsCode: text("hs_code"),
  pieces: integer("pieces").notNull(),
  packageType: text("package_type"),
  lengthCm: real("length_cm"),
  widthCm: real("width_cm"),
  heightCm: real("height_cm"),
  grossWeightKg: real("gross_weight_kg").notNull(),
  volumeM3: real("volume_m3"),
  stackable: boolean("stackable").notNull().default(true),
  dgClass: text("dg_class"),
  unNumber: text("un_number"),
  tempMinC: real("temp_min_c"),
  tempMaxC: real("temp_max_c"),
});

/** 1.5 / 6.2: documents in the shipper pack and, later, generated documents. */
export const document = pgTable("document", {
  id: id(),
  requestId: uuid("request_id").references(() => request.id),
  shipmentId: uuid("shipment_id"),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  shipperOrgId: text("shipper_org_id").references(() => party.id),
  type: text("type").notNull(),
  status: documentStatus("status").notNull().default("requested"),
  filename: text("filename"),
  storageKey: text("storage_key"),
  extracted: jsonb("extracted").$type<Record<string, unknown>>(),
  createdAt: created(),
  rowVersion: rowVersion(),
});

// ── Supply (2) ──────────────────────────────────────────────────────────────

export const schedule = pgTable("schedule", {
  id: id(),
  carrierOrgId: text("carrier_org_id").notNull().references(() => party.id),
  service: text("service").notNull(),
  vessel: text("vessel"),
  voyage: text("voyage"),
  originLocode: text("origin_locode").notNull(),
  destinationLocode: text("destination_locode").notNull(),
  etd: timestamp("etd", { withTimezone: true }).notNull(),
  eta: timestamp("eta", { withTimezone: true }).notNull(),
  /** 2.2.2: gate-in, documentation, VGM, dangerous goods cut-offs. */
  cutoffs: jsonb("cutoffs").$type<Record<string, string>>().notNull().default({}),
  blank: boolean("blank").notNull().default(false),
  receivedAt: created(),
});

export const capacitySlot = pgTable("capacity_slot", {
  id: id(),
  scheduleId: uuid("schedule_id").notNull().references(() => schedule.id),
  carrierOrgId: text("carrier_org_id").notNull().references(() => party.id),
  equipment: text("equipment").notNull(),
  freeUnits: integer("free_units").notNull(),
  asOf: timestamp("as_of", { withTimezone: true }).notNull(),
});

export const capacityHold = pgTable("capacity_hold", {
  id: id(),
  slotId: uuid("slot_id").notNull().references(() => capacitySlot.id),
  quoteId: uuid("quote_id").notNull(),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  carrierOrgId: text("carrier_org_id").notNull().references(() => party.id),
  units: integer("units").notNull(),
  status: capacityHoldStatus("status").notNull().default("held"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: created(),
  rowVersion: rowVersion(),
});

// ── Rates (3) ───────────────────────────────────────────────────────────────

/** 3.2.1: the charge-code dictionary every carrier's charge names map onto. */
export const chargeCode = pgTable("charge_code", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  category: chargeCategory("category").notNull(),
  /** per_container, per_bl, per_kg, per_cbm, per_shipment, pct_of_freight */
  basis: text("basis").notNull(),
  aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
});

export const rate = pgTable("rate", {
  id: id(),
  /** 3.5.1: rates belong to the desk that negotiated them. */
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  carrierOrgId: text("carrier_org_id").notNull().references(() => party.id),
  kind: rateKind("kind").notNull(),
  originLocode: text("origin_locode").notNull(),
  destinationLocode: text("destination_locode").notNull(),
  equipment: text("equipment").notNull(),
  validFrom: date("valid_from", { mode: "date" }).notNull(),
  validTo: date("valid_to", { mode: "date" }).notNull(),
  amount: money("amount").notNull(),
  currency: text("currency").notNull(),
  lines: jsonb("lines").$type<CostLineData[]>().notNull().default([]),
  /** 3.4.3: version history; a new version supersedes, never overwrites. */
  supersedesRateId: uuid("supersedes_rate_id"),
  createdAt: created(),
});

export interface CostLineData {
  chargeCode: string;
  description: string;
  amount: number;
  currency: string;
  basis: string;
  included: boolean;
}

// ── Quoting engine (4) ──────────────────────────────────────────────────────

export const rfq = pgTable("rfq", {
  id: id(),
  requestId: uuid("request_id").notNull().references(() => request.id),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  /** 4.1.2 / 1.5.5: exactly what was revealed to carriers (the redacted pack). */
  revealed: jsonb("revealed").$type<Record<string, unknown>>().notNull(),
  replyDeadline: timestamp("reply_deadline", { withTimezone: true }).notNull(),
  createdAt: created(),
});

export const bid = pgTable(
  "bid",
  {
    id: id(),
    rfqId: uuid("rfq_id").notNull().references(() => rfq.id),
    deskOrgId: text("desk_org_id").notNull().references(() => party.id),
    carrierOrgId: text("carrier_org_id").notNull().references(() => party.id),
    status: bidStatus("status").notNull().default("invited"),
    channel: channel("channel").notNull(),
    supersedesBidId: uuid("supersedes_bid_id"),
    rawReply: text("raw_reply"),
    price: money("price"),
    currency: text("currency"),
    costLines: jsonb("cost_lines").$type<CostLineData[]>(),
    chaseCount: integer("chase_count").notNull().default(0),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdAt: created(),
    rowVersion: rowVersion(),
  },
  (t) => [index("bid_rfq_idx").on(t.rfqId), index("bid_carrier_idx").on(t.carrierOrgId)],
);

/** 4.3.1 / 4.3.2: one row per extracted field, each with its own confidence. */
export const extractedField = pgTable("extracted_field", {
  id: id(),
  bidId: uuid("bid_id").references(() => bid.id),
  documentId: uuid("document_id").references(() => document.id),
  field: text("field").notNull(),
  value: jsonb("value"),
  confidence: real("confidence").notNull(),
  /** 4.3.3: where in the source the value came from, shown to the reviewer. */
  source: jsonb("source").$type<{ text: string; start?: number; end?: number; page?: number }>(),
  modelVersion: text("model_version").notNull(),
  createdAt: created(),
});

/** 4.3.3: low-confidence fields waiting for a person. Open while resolvedAt is null. */
export const reviewItem = pgTable("review_item", {
  id: id(),
  extractedFieldId: uuid("extracted_field_id").notNull().references(() => extractedField.id),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  threshold: real("threshold").notNull(),
  assignedTo: text("assigned_to"),
  resolvedValue: jsonb("resolved_value"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: created(),
});

/** 4.3.4 / 11.6: every correction becomes a labelled training example. */
export const trainingLabel = pgTable("training_label", {
  id: id(),
  extractedFieldId: uuid("extracted_field_id").notNull().references(() => extractedField.id),
  carrierOrgId: text("carrier_org_id").references(() => party.id),
  format: channel("format").notNull(),
  field: text("field").notNull(),
  predicted: jsonb("predicted"),
  corrected: jsonb("corrected"),
  wasCorrect: boolean("was_correct").notNull(),
  labelledBy: text("labelled_by").notNull(),
  modelVersion: text("model_version").notNull(),
  createdAt: created(),
});

export const option = pgTable("option", {
  id: id(),
  requestId: uuid("request_id").notNull().references(() => request.id),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  shipperOrgId: text("shipper_org_id").notNull().references(() => party.id),
  bidId: uuid("bid_id").references(() => bid.id),
  carrierOrgId: text("carrier_org_id").notNull().references(() => party.id),
  scheduleId: uuid("schedule_id").references(() => schedule.id),
  equipment: text("equipment").notNull(),
  transitDays: integer("transit_days"),
  carrierCost: money("carrier_cost").notNull(),
  sellPrice: money("sell_price"),
  currency: text("currency").notNull(),
  costLines: jsonb("cost_lines").$type<CostLineData[]>().notNull().default([]),
  /** 4.4.7: every check with pass/fail and reason. */
  feasibility: jsonb("feasibility").$type<{ check: string; process: string; ok: boolean; reason?: string }[]>().notNull().default([]),
  feasible: boolean("feasible").notNull().default(false),
  /** 4.6.3 / 4.6.4: score, weights and the explanation. */
  ranking: jsonb("ranking").$type<Record<string, unknown>>(),
  rank: integer("rank"),
  published: boolean("published").notNull().default(false),
  createdAt: created(),
});

export const quote = pgTable("quote", {
  id: id(),
  requestId: uuid("request_id").notNull().references(() => request.id),
  optionId: uuid("option_id").notNull().references(() => option.id),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  shipperOrgId: text("shipper_org_id").notNull().references(() => party.id),
  carrierOrgId: text("carrier_org_id").notNull().references(() => party.id),
  version: integer("version").notNull().default(1),
  supersedesQuoteId: uuid("supersedes_quote_id"),
  status: quoteStatus("status").notNull().default("issued"),
  carrierCost: money("carrier_cost").notNull(),
  margin: money("margin").notNull(),
  marginPct: real("margin_pct").notNull(),
  sellPrice: money("sell_price").notNull(),
  currency: text("currency").notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  /** 4.7.3: scope, exclusions, terms. */
  terms: jsonb("terms").$type<Record<string, unknown>>().notNull().default({}),
  approvalNotes: text("approval_notes"),
  createdAt: created(),
  rowVersion: rowVersion(),
});

// ── Execution (5 to 7) ──────────────────────────────────────────────────────

export const booking = pgTable("booking", {
  id: id(),
  quoteId: uuid("quote_id").notNull().references(() => quote.id),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  shipperOrgId: text("shipper_org_id").notNull().references(() => party.id),
  carrierOrgId: text("carrier_org_id").notNull().references(() => party.id),
  carrierRef: text("carrier_ref"),
  status: bookingStatus("status").notNull().default("requested"),
  createdAt: created(),
  rowVersion: rowVersion(),
});

export const shipment = pgTable("shipment", {
  id: id(),
  bookingId: uuid("booking_id").notNull().references(() => booking.id),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  shipperOrgId: text("shipper_org_id").notNull().references(() => party.id),
  carrierOrgId: text("carrier_org_id").notNull().references(() => party.id),
  status: shipmentStatus("status").notNull().default("planned"),
  createdAt: created(),
  rowVersion: rowVersion(),
});

export const leg = pgTable("leg", {
  id: id(),
  optionId: uuid("option_id").references(() => option.id),
  shipmentId: uuid("shipment_id").references(() => shipment.id),
  seq: integer("seq").notNull(),
  mode: mode("mode").notNull(),
  fromLocode: text("from_locode").notNull(),
  toLocode: text("to_locode").notNull(),
  carrierOrgId: text("carrier_org_id").references(() => party.id),
  etd: timestamp("etd", { withTimezone: true }),
  eta: timestamp("eta", { withTimezone: true }),
});

/** Container or other unit. */
export const unit = pgTable("unit", {
  id: id(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipment.id),
  equipment: text("equipment").notNull(),
  containerNo: text("container_no"),
  sealNo: text("seal_no"),
  vgmKg: real("vgm_kg"),
});

export const event = pgTable("event", {
  id: id(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipment.id),
  code: text("code").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull(),
  source: text("source").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  receivedAt: created(),
});

export const exception = pgTable("exception", {
  id: id(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipment.id),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  shipperOrgId: text("shipper_org_id").notNull().references(() => party.id),
  carrierOrgId: text("carrier_org_id").references(() => party.id),
  type: text("type").notNull(),
  status: exceptionStatus("status").notNull().default("detected"),
  ownerId: text("owner_id"),
  resolution: jsonb("resolution").$type<{ cause: string; cost?: number; absorbedBy?: string }>(),
  detectedAt: created(),
  rowVersion: rowVersion(),
});

/** 9.2: partner jobs (stub; Phase 6). Lifecycle tracked by timestamps until process 9 is designed. */
export const job = pgTable("job", {
  id: id(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipment.id),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  partnerOrgId: text("partner_org_id").notNull().references(() => party.id),
  serviceType: text("service_type").notNull(),
  documentIds: uuid("document_ids").array().notNull().default(sql`'{}'::uuid[]`),
  deadline: timestamp("deadline", { withTimezone: true }),
  offeredAt: created(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

// ── Settlement (8) ──────────────────────────────────────────────────────────

export const charge = pgTable("charge", {
  id: id(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipment.id),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  carrierOrgId: text("carrier_org_id").references(() => party.id),
  chargeCode: text("charge_code").notNull().references(() => chargeCode.code),
  cost: money("cost").notNull(),
  sell: money("sell"),
  currency: text("currency").notNull(),
  status: chargeStatus("status").notNull().default("expected"),
  createdAt: created(),
  rowVersion: rowVersion(),
});

export const invoice = pgTable("invoice", {
  id: id(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipment.id),
  deskOrgId: text("desk_org_id").notNull().references(() => party.id),
  counterparty: counterparty("counterparty").notNull(),
  partyOrgId: text("party_org_id").notNull().references(() => party.id),
  number: text("number").notNull(),
  total: money("total").notNull(),
  currency: text("currency").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
});

export const payment = pgTable("payment", {
  id: id(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoice.id),
  amount: money("amount").notNull(),
  currency: text("currency").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
  /** Decision E2: the platform routes money, it never holds it. */
  routedVia: text("routed_via").notNull(),
});

// ── Governance (12) ─────────────────────────────────────────────────────────

export const rulesetVersion = pgTable(
  "ruleset_version",
  {
    id: id(),
    kind: text("kind").notNull(),
    version: integer("version").notNull(),
    deskOrgId: text("desk_org_id").references(() => party.id),
    body: jsonb("body").notNull(),
    publishedAt: created(),
    publishedBy: text("published_by").notNull(),
  },
  (t) => [uniqueIndex("ruleset_version_uq").on(t.kind, t.deskOrgId, t.version)],
);

/** Append-only; a trigger in the migration rejects UPDATE and DELETE. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    actorKind: text("actor_kind").notNull(),
    actorId: text("actor_id").notNull(),
    actorRole: text("actor_role").notNull(),
    actorOrgId: text("actor_org_id"),
    actorVersion: text("actor_version"),
    action: text("action").notNull(),
    process: text("process"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    outcome: text("outcome").notNull(),
    input: jsonb("input"),
    output: jsonb("output"),
    ruleVersions: text("rule_versions").array().notNull().default(sql`'{}'::text[]`),
    modelVersion: text("model_version"),
    overrideOf: uuid("override_of"),
    overrideReason: text("override_reason"),
    deskOrgId: text("desk_org_id"),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_desk_idx").on(t.deskOrgId, t.at)],
);

/** Tables whose status column is owned by a state machine. */
export const STATEFUL_TABLES = {
  request,
  quote,
  booking,
  shipment,
  charge,
  exception,
  bid,
  document,
  capacity_hold: capacityHold,
} as const;

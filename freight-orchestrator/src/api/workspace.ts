// The server-side service behind the API: intake (1.1), reply extraction and review (4.3),
// normalisation (3.2) and the network view (2.1), all through the policy (12.2) and the
// append-only audit trail (12.3). State changes go through applyTransition; nothing here
// writes a status directly.
import { ClaudeReplyExtractor, extractRequestWithClaude, ReplyPipeline, type Parse } from "../ai/claude";
import type { ConfigStore } from "../config/memory";
import { model, rule, system, type Actor } from "../governance/actor";
import type { AuditRecord } from "../governance/audit";
import { ForbiddenError, Policy, type ResourceRef } from "../governance/policy";
import type { Fields } from "../extract/types";
import { networkFor } from "../network/view";
import { parseEmail, type ParsedEmail } from "../p1/email";
import { checkCompleteness, dedupe, extractRequest, knownFrom, missingInfoReply, requestSource, RULES_VERSION, type Completeness, type DedupeResult, type Known, type RequestDraft } from "../p1/intake";
import { route } from "../p1/mailbox";
import { normaliseQuote, type NormalisedQuote, type RawLine, type Shipment } from "../p3/charges";
import { accuracyByFormat, label, reviewQueue, type CarrierReply, type ReplyChannel, type ReviewItem, type TrainingLabel } from "../p4/replies";
import { party } from "../network/scenario";
import { applyTransition } from "../state/apply";
import { InMemoryUnitOfWork } from "../state/memory";

export type Via = "webhook" | "imap" | "upload" | "api";

export interface RequestRecord {
  id: string;
  deskOrgId: string;
  shipperOrgId: string | null;
  shipperName: string | null;
  from: string;
  subject: string;
  /** Subject, body and text attachments: what field sources point into. */
  source: string;
  receivedAt: string;
  via: Via;
  values: Omit<RequestDraft["values"], "cargoValue">;
  cargoValue: RequestDraft["values"]["cargoValue"] | null;
  fields: Fields;
  completeness: Completeness;
  dedupe: DedupeResult;
  /** Drafted for 1.1.5 when something is missing; a person sends it. */
  infoReply: string | null;
  extractedBy: string;
  fallbackReason?: string;
}

export interface ReplyRecord {
  id: string;
  deskOrgId: string;
  carrierOrgId: string;
  carrierName: string;
  requestId: string | null;
  channel: ReplyChannel;
  receivedAt: string;
  via: Via;
  rawReply: string;
  fields: Fields;
  price: number | null;
  costLines: NormalisedQuote | null;
  extractedBy: string;
  fallbackReason?: string;
}

export interface ReviewRecord extends ReviewItem {
  id: string;
  deskOrgId: string;
  resolved: null | { by: string; value: unknown; at: string; wasCorrect: boolean };
}

export interface IngestResult {
  kind: "request" | "reply" | "unroutable";
  id?: string;
  status?: string;
  reason?: string;
}

export interface WorkspaceOptions {
  config: ConfigStore;
  /** When set, Claude extracts and the rules are the fallback and second opinion. */
  parse?: Parse;
  now?: () => Date;
}

const iso = (d: Date) => d.toISOString();

export class Workspace {
  readonly uow = new InMemoryUnitOfWork();
  readonly requests = new Map<string, RequestRecord>();
  readonly replies = new Map<string, ReplyRecord>();
  readonly review = new Map<string, ReviewRecord>();
  readonly labels: TrainingLabel[] = [];
  private seq = { request: 0, reply: 0 };
  private readonly known: (Known & { deskOrgId: string })[] = [];
  private readonly now: () => Date;

  private constructor(readonly policy: Policy, private readonly opts: WorkspaceOptions) {
    this.now = opts.now ?? (() => new Date());
  }

  static async create(opts: WorkspaceOptions): Promise<Workspace> {
    return new Workspace(new Policy(await opts.config.active("permissions")), opts);
  }

  get modelEnabled() {
    return !!this.opts.parse;
  }

  private get audit() {
    return this.uow.audit;
  }

  // ── 1.1.1 Ingest ───────────────────────────────────────────────────────────

  /** `deskOrgId` pins the desk for a manual upload, whatever the To header says. */
  async ingestEmail(raw: string, via: Via, opts: { deskOrgId?: string } = {}): Promise<IngestResult> {
    const email = parseEmail(raw);
    const r = opts.deskOrgId ? route({ ...email, to: ["upload@desk"] }, { "upload@desk": opts.deskOrgId }) : route(email);
    if (r.kind === "unroutable") {
      await this.audit.append({ actor: system("1.1.1/mailbox"), action: "request.ingest", process: "1.1.1", entityType: "email", entityId: email.messageId ?? "unknown", outcome: "refused", input: { from: email.from, to: email.to, via }, output: { reason: r.reason } });
      return { kind: "unroutable", reason: r.reason };
    }
    if (r.kind === "reply") {
      return this.ingestReply({ deskOrgId: r.deskOrgId, carrierOrgId: r.carrierOrgId, channel: "email", text: [email.subject, email.text].filter(Boolean).join("\n\n"), receivedAt: email.date ?? this.now(), via, email });
    }
    return this.ingestRequest(raw, email, r.deskOrgId, r.shipperOrgId, via);
  }

  private async ingestRequest(raw: string, email: ParsedEmail, deskOrgId: string, shipperOrgId: string | null, via: Via): Promise<IngestResult> {
    const now = this.now();
    let draft: RequestDraft;
    let extractedBy = RULES_VERSION;
    let fallbackReason: string | undefined;
    if (this.opts.parse) {
      try {
        draft = await extractRequestWithClaude(raw, { parse: this.opts.parse, now: email.date ?? now });
        extractedBy = Object.values(draft.fields).find((f) => f.by !== RULES_VERSION)?.by ?? RULES_VERSION;
      } catch (e) {
        draft = extractRequest(email, email.date ?? now);
        fallbackReason = e instanceof Error ? e.message : String(e);
      }
    } else {
      draft = extractRequest(email, email.date ?? now);
    }

    const completeness = checkCompleteness(draft);
    const dup = dedupe(draft, this.known.filter((k) => k.deskOrgId === deskOrgId));
    const id = `REQ-${String(++this.seq.request).padStart(4, "0")}`;
    const { cargoValue = null, ...values } = draft.values;
    const shipperName = shipperOrgId ? party(shipperOrgId).name : draft.values.customer ?? (email.fromName || null);
    const rec: RequestRecord = {
      id,
      deskOrgId,
      shipperOrgId,
      shipperName,
      from: email.from,
      subject: email.subject,
      source: requestSource(email),
      receivedAt: iso(email.date ?? now),
      via,
      values,
      cargoValue,
      fields: draft.fields,
      completeness,
      dedupe: dup,
      infoReply: completeness.ok ? null : missingInfoReply(draft, completeness, party(deskOrgId).name),
      extractedBy,
      fallbackReason,
    };
    this.requests.set(id, rec);
    this.known.push({ ...knownFrom(id, draft), deskOrgId });
    this.uow.store.create("request", { id, deskOrgId, shipperOrgId });

    const extractor: Actor = extractedBy === RULES_VERSION ? rule("1.1.3/intake", RULES_VERSION) : model("1.1.3/extraction", extractedBy);
    await this.audit.append({
      actor: extractor,
      action: "request.extract",
      process: "1.1.3",
      entityType: "request",
      entityId: id,
      outcome: "applied",
      deskOrgId,
      input: { via, from: email.from, messageId: email.messageId },
      output: { values: draft.values, dedupe: dup, fallbackReason },
      modelVersion: extractor.kind === "model" ? extractedBy : undefined,
    });

    const applied = await applyTransition(
      { uow: this.uow, policy: this.policy },
      completeness.ok
        ? { actor: rule("1.1.4/completeness", "1"), machine: "request", id, event: "validate", ctx: { completeness } }
        : { actor: rule("1.1.4/completeness", "1"), machine: "request", id, event: "request_info", input: { missing: completeness.missing, unsure: completeness.unsure } },
    );
    return { kind: "request", id, status: applied.to };
  }

  // ── 4.3 Replies ────────────────────────────────────────────────────────────

  async ingestReply(a: { deskOrgId: string; carrierOrgId: string; channel: ReplyChannel; text: string; receivedAt?: Date; requestId?: string; via: Via; email?: ParsedEmail }): Promise<IngestResult> {
    const id = `RPL-${String(++this.seq.reply).padStart(4, "0")}`;
    const reply: CarrierReply = { id, carrierOrgId: a.carrierOrgId, channel: a.channel, text: a.text, receivedAt: a.receivedAt ?? this.now() };
    const pipeline = new ReplyPipeline(this.opts.parse ? new ClaudeReplyExtractor({ parse: this.opts.parse }) : undefined);
    const { fields, used, fallbackReason } = await pipeline.run(reply);

    const request = a.requestId ? this.requests.get(a.requestId) : undefined;
    const costLines = this.normalise(fields, request);
    const rec: ReplyRecord = {
      id,
      deskOrgId: a.deskOrgId,
      carrierOrgId: a.carrierOrgId,
      carrierName: party(a.carrierOrgId).name,
      requestId: request?.id ?? null,
      channel: a.channel,
      receivedAt: iso(reply.receivedAt),
      via: a.via,
      rawReply: a.text,
      fields,
      price: typeof fields.rate?.value === "number" ? fields.rate.value : null,
      costLines,
      extractedBy: used,
      fallbackReason,
    };
    this.replies.set(id, rec);
    this.uow.store.create("bid", { id, deskOrgId: a.deskOrgId, carrierOrgId: a.carrierOrgId });

    const confidence = await this.opts.config.active("confidence", a.deskOrgId);
    for (const item of reviewQueue(reply, fields, confidence.body)) {
      const rid = `${id}:${item.field}`;
      this.review.set(rid, { ...item, id: rid, deskOrgId: a.deskOrgId, resolved: null });
    }

    const extractor: Actor = used.startsWith("reply-rules") ? rule("4.3.1/reply-rules", used) : model("4.3.1/extraction", used);
    const applied = await applyTransition(
      { uow: this.uow, policy: this.policy },
      {
        actor: extractor,
        machine: "bid",
        id,
        event: "reply",
        modelVersion: extractor.kind === "model" ? used : undefined,
        ruleVersions: [confidence.id],
        input: { via: a.via, channel: a.channel, fallbackReason, review: [...this.review.values()].filter((r) => r.replyId === id).map((r) => `${r.action}:${r.field}`) },
      },
    );
    return { kind: "reply", id, status: applied.to };
  }

  private normalise(fields: Fields, request?: RequestRecord): NormalisedQuote | null {
    const lines = fields.lines?.value as RawLine[] | null;
    if (!lines?.length) return null;
    const eq = typeof fields.equipment?.value === "string" ? fields.equipment.value : undefined;
    const v = request?.values;
    const shipment: Shipment = {
      containers: v?.equipment ? { [v.equipment.type]: v.equipment.count } : eq ? { [eq]: 1 } : undefined,
      grossKg: v?.grossKg,
      cbm: v?.cbm,
      pallets: v?.packages?.type === "pallet" ? v.packages.count : undefined,
      stackable: v?.stackable,
    };
    try {
      return normaliseQuote(lines, shipment, { defaultCurrency: typeof fields.currency?.value === "string" ? fields.currency.value : undefined });
    } catch {
      return null;
    }
  }

  /** 4.3.3 and 4.3.4: a person confirms or corrects a field; the correction becomes a label. */
  async resolveReview(actor: Actor, reviewId: string, value: unknown, reason?: string): Promise<ReviewRecord> {
    const item = this.review.get(reviewId);
    if (!item) throw new NotFound(`review item ${reviewId}`);
    const resource: ResourceRef = { type: "review_item", id: reviewId, deskOrgId: item.deskOrgId, carrierOrgId: item.carrierOrgId };
    await this.guard(actor, "review_item.update", resource);
    const reply = this.replies.get(item.replyId)!;
    const field = reply.fields[item.field] ?? { field: item.field, value: null, confidence: 0, by: reply.extractedBy };
    const l = label({ id: reply.id, carrierOrgId: reply.carrierOrgId, channel: reply.channel, text: reply.rawReply, receivedAt: new Date(reply.receivedAt) }, field, value, actor.id, this.now());
    this.labels.push(l);
    reply.fields[item.field] = { ...field, value, confidence: 1, by: `person:${actor.id}`, note: l.wasCorrect ? "Confirmed" : `Corrected from ${JSON.stringify(field.value)}` };
    if (item.field === "rate" && typeof value === "number") reply.price = value;
    if (["lines", "currency", "equipment"].includes(item.field)) reply.costLines = this.normalise(reply.fields, reply.requestId ? this.requests.get(reply.requestId) : undefined);
    item.resolved = { by: actor.id, value, at: iso(this.now()), wasCorrect: l.wasCorrect };
    const extracted = (await this.audit.list({ entityType: "bid", entityId: reply.id, action: "bid.reply" }))[0];
    await this.audit.append({
      actor,
      action: "review_item.resolve",
      process: l.wasCorrect ? "4.3.3" : "4.3.4",
      entityType: "review_item",
      entityId: reviewId,
      outcome: "applied",
      deskOrgId: item.deskOrgId,
      input: { field: item.field, predicted: field.value, value },
      output: { wasCorrect: l.wasCorrect, modelVersion: l.modelVersion },
      override: l.wasCorrect ? undefined : { of: extracted?.id, reason: reason?.trim() || "Corrected against the source" },
    });
    return item;
  }

  // ── Reads, each through the policy ─────────────────────────────────────────

  async requestsFor(actor: Actor) {
    const rows = await Promise.all(
      [...this.requests.values()].map(async (r) => ({ resource: { type: "request", id: r.id, deskOrgId: r.deskOrgId, shipperOrgId: r.shipperOrgId } as ResourceRef, record: { ...r, status: await this.statusOf("request", r.id) } })),
    );
    return this.policy.readableMany(actor, rows);
  }

  async repliesFor(actor: Actor) {
    const rows = await Promise.all(
      [...this.replies.values()].map(async (r) => ({ resource: { type: "bid", id: r.id, deskOrgId: r.deskOrgId, carrierOrgId: r.carrierOrgId } as ResourceRef, record: { ...r, status: await this.statusOf("bid", r.id) } })),
    );
    return this.policy.readableMany(actor, rows);
  }

  reviewFor(actor: Actor, opts: { open?: boolean } = {}) {
    return this.policy.readableMany(
      actor,
      [...this.review.values()].filter((r) => !opts.open || !r.resolved).map((r) => ({ resource: { type: "review_item", id: r.id, deskOrgId: r.deskOrgId } as ResourceRef, record: { ...r } })),
    );
  }

  /** 4.3.5, per desk. Carriers see their own rows (scorecard.read, carrier scope). */
  async accuracyFor(actor: Actor) {
    const desks = [...new Set(this.labels.map((l) => this.replies.get(l.replyId)!.deskOrgId))];
    const out = [];
    for (const deskOrgId of desks) {
      const rules = (await this.opts.config.active("confidence", deskOrgId)).body;
      for (const a of accuracyByFormat(this.labels.filter((l) => this.replies.get(l.replyId)!.deskOrgId === deskOrgId), rules)) {
        if (this.policy.can(actor, "scorecard.read", { type: "scorecard", deskOrgId, carrierOrgId: a.carrierOrgId }).allowed) out.push({ ...a, deskOrgId });
      }
    }
    return out;
  }

  async auditFor(actor: Actor): Promise<AuditRecord[]> {
    const all = await this.audit.list();
    return all.filter((r) => this.policy.can(actor, "audit.read", { type: "audit", deskOrgId: r.deskOrgId ?? null }).allowed);
  }

  networkFor(actor: Actor) {
    return networkFor(actor, this.policy);
  }

  private async statusOf(machine: "request" | "bid", id: string) {
    return (await this.uow.store.load(machine, id))?.status ?? "unknown";
  }

  private async guard(actor: Actor, action: string, r: ResourceRef) {
    const d = this.policy.can(actor, action, r);
    if (!d.allowed) {
      await this.audit.append({ actor, action, entityType: r.type, entityId: r.id ?? "", outcome: "denied", deskOrgId: r.deskOrgId, output: { reason: d.reason } });
      throw new ForbiddenError(actor, action, r, d.reason);
    }
  }
}

export class NotFound extends Error {}

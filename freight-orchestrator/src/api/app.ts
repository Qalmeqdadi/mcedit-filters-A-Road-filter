// HTTP routes over the workspace, framework-free so tests call them directly.
// Sign-in is a demo stand-in: the x-actor header names one of the pilot personas. Every read and
// write still goes through the policy, so swapping in real sessions changes only actorOf().
import { timingSafeEqual } from "node:crypto";
import { CLAUDE_MODEL } from "../ai/claude";
import type { Actor } from "../governance/actor";
import { ForbiddenError, type ResourceRef } from "../governance/policy";
import { NETWORK_ACTORS } from "../network/view";
import { party } from "../network/scenario";
import type { ReplyChannel } from "../p4/replies";
import { NotFound, type Workspace } from "./workspace";

export interface ApiRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string | undefined>;
  body: string;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export interface ApiOptions {
  /** Shared secret the inbound-email webhook must present in x-inbound-secret. Unset disables the webhook. */
  inboundSecret?: string;
  actors?: Record<string, Actor>;
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const CHANNELS: ReplyChannel[] = ["email", "pdf", "chat", "portal", "api", "edi", "phone"];

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

function json(body: string): Record<string, unknown> {
  try {
    const v = JSON.parse(body || "{}");
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
    /* fall through */
  }
  throw new HttpError(400, "body must be a JSON object");
}

/** Raw MIME from a webhook: a text/plain body, JSON {raw}, or the form field providers use (body-mime, email). */
function rawMime(req: ApiRequest): string {
  const type = (req.headers["content-type"] ?? "").toLowerCase();
  if (type.includes("application/json")) {
    const raw = json(req.body).raw;
    if (typeof raw !== "string") throw new HttpError(400, "JSON body needs a raw field with the MIME source");
    return raw;
  }
  if (type.includes("application/x-www-form-urlencoded")) {
    const f = new URLSearchParams(req.body);
    const raw = f.get("body-mime") ?? f.get("email");
    if (raw) return raw;
    // curl --data-binary sends raw MIME labelled as a form; take it as it is.
    if (!/^[A-Za-z-]+:\s/m.test(req.body)) throw new HttpError(400, "form body needs body-mime or email");
  }
  if (!req.body.trim()) throw new HttpError(400, "empty body");
  return req.body;
}

export function createApi(ws: Workspace, opts: ApiOptions = {}) {
  const actors: Record<string, Actor> = opts.actors ?? NETWORK_ACTORS;

  const actorOf = (req: ApiRequest): Actor => {
    const key = req.headers["x-actor"];
    const a = key ? actors[key] : undefined;
    if (!a) throw new HttpError(401, `sign in: set x-actor to one of ${Object.keys(actors).join(", ")}`);
    return a;
  };

  const allow = (actor: Actor, action: string, r: ResourceRef) => {
    const d = ws.policy.can(actor, action, r);
    if (!d.allowed) throw new ForbiddenError(actor, action, r, d.reason);
  };

  type Handler = (req: ApiRequest, params: string[]) => Promise<unknown>;
  const routes: [string, RegExp, Handler][] = [
    ["GET", /^\/api\/health$/, async () => ({ ok: true, extraction: ws.modelEnabled ? `${CLAUDE_MODEL} with rules as fallback` : "rules only (set ANTHROPIC_API_KEY to enable Claude)", policy: ws.policy.version })],

    ["GET", /^\/api\/actors$/, async () =>
      Object.entries(actors).map(([key, a]) => ({ key, id: a.id, role: a.role, orgId: a.orgId, orgName: a.orgId ? party(a.orgId).name : null }))],

    ["GET", /^\/api\/network$/, async (req) => ws.networkFor(actorOf(req))],

    // 1.1.1 Inbound email from a mail provider's webhook.
    ["POST", /^\/api\/inbound\/email$/, async (req) => {
      const given = req.headers["x-inbound-secret"] ?? "";
      if (!opts.inboundSecret) throw new HttpError(404, "inbound webhook is not configured (set INBOUND_SECRET)");
      if (!sameSecret(given, opts.inboundSecret)) throw new HttpError(401, "bad inbound secret");
      return ws.ingestEmail(rawMime(req), "webhook");
    }],

    // 1.1.1 A desk agent drops in an .eml file (or pastes the source).
    ["POST", /^\/api\/inbox\/upload$/, async (req) => {
      const actor = actorOf(req);
      allow(actor, "request.create", { type: "request", deskOrgId: actor.orgId });
      return ws.ingestEmail(rawMime(req), "upload", { deskOrgId: actor.orgId! });
    }],

    // 4.3 A reply that arrived by chat, PDF or phone, recorded by the desk or sent by the carrier.
    ["POST", /^\/api\/replies$/, async (req) => {
      const actor = actorOf(req);
      const b = json(req.body);
      const channel = String(b.channel ?? "chat") as ReplyChannel;
      if (!CHANNELS.includes(channel)) throw new HttpError(400, `channel must be one of ${CHANNELS.join(", ")}`);
      if (typeof b.text !== "string" || !b.text.trim()) throw new HttpError(400, "text is required");
      const persona = ws.policy.body.roles[actor.role]?.persona;
      let deskOrgId: string, carrierOrgId: string;
      if (persona === "carrier") {
        deskOrgId = String(b.deskOrgId ?? "");
        carrierOrgId = actor.orgId!;
        allow(actor, "bid.reply", { type: "bid", deskOrgId, carrierOrgId });
      } else {
        deskOrgId = actor.orgId!;
        carrierOrgId = String(b.carrierOrgId ?? "");
        allow(actor, "rfq.update", { type: "rfq", deskOrgId });
      }
      try {
        party(carrierOrgId);
        party(deskOrgId);
      } catch {
        throw new HttpError(400, "unknown carrierOrgId or deskOrgId");
      }
      return ws.ingestReply({ deskOrgId, carrierOrgId, channel, text: b.text, requestId: typeof b.requestId === "string" ? b.requestId : undefined, via: "api" });
    }],

    ["GET", /^\/api\/requests$/, async (req) => ws.requestsFor(actorOf(req))],
    ["GET", /^\/api\/replies$/, async (req) => ws.repliesFor(actorOf(req))],
    ["GET", /^\/api\/review$/, async (req) => ws.reviewFor(actorOf(req), { open: req.query.get("open") === "1" })],

    ["POST", /^\/api\/review\/([^/]+)$/, async (req, [id]) => {
      const b = json(req.body);
      if (!("value" in b)) throw new HttpError(400, "value is required (the confirmed or corrected value)");
      return ws.resolveReview(actorOf(req), decodeURIComponent(id!), b.value, typeof b.reason === "string" ? b.reason : undefined);
    }],

    ["GET", /^\/api\/accuracy$/, async (req) => ws.accuracyFor(actorOf(req))],
    ["GET", /^\/api\/audit$/, async (req) => ws.auditFor(actorOf(req))],
  ];

  return async function handle(req: ApiRequest): Promise<ApiResponse> {
    try {
      const matches = routes.filter(([, re]) => re.test(req.path));
      if (!matches.length) return { status: 404, body: { error: "not found" } };
      const hit = matches.find(([m]) => m === req.method);
      if (!hit) return { status: 405, body: { error: `use ${matches.map(([m]) => m).join(" or ")}` } };
      const params = hit[1].exec(req.path)!.slice(1);
      return { status: 200, body: await hit[2](req, params) };
    } catch (e) {
      if (e instanceof HttpError) return { status: e.status, body: { error: e.message } };
      if (e instanceof ForbiddenError) return { status: 403, body: { error: e.message } };
      if (e instanceof NotFound) return { status: 404, body: { error: `${e.message} not found` } };
      return { status: 500, body: { error: e instanceof Error ? e.message : String(e) } };
    }
  };
}

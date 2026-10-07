// Runs the API on node:http. Configuration comes from the environment:
//   PORT              default 8787
//   INBOUND_SECRET    enables POST /api/inbound/email for a mail provider's inbound webhook
//   IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASSWORD, IMAP_MAILBOX, IMAP_TLS (default true), IMAP_INTERVAL_S
//                     polls a desk mailbox
//   ANTHROPIC_API_KEY enables Claude extraction; without it the rule extractors run alone
//   CORS_ORIGIN       default *
import { createServer, type IncomingMessage, type Server } from "node:http";
import { pathToFileURL } from "node:url";
import { modelConfigured } from "../ai/claude";
import { InMemoryConfigStore } from "../config/store";
import { startImapPoller } from "../p1/imap";
import { createApi, type ApiOptions } from "./app";
import { Workspace } from "./workspace";

const MAX_BODY = 25 * 1024 * 1024;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function serve(ws: Workspace, opts: ApiOptions & { port?: number; corsOrigin?: string } = {}): Server {
  const handle = createApi(ws, opts);
  const cors = {
    "access-control-allow-origin": opts.corsOrigin ?? "*",
    "access-control-allow-headers": "content-type, x-actor, x-inbound-secret",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  };
  const server = createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors).end();
      return;
    }
    const url = new URL(req.url ?? "/", "http://localhost");
    let body = "";
    try {
      body = await readBody(req);
    } catch (e) {
      res.writeHead(413, { ...cors, "content-type": "application/json" }).end(JSON.stringify({ error: (e as Error).message }));
      return;
    }
    const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v]));
    const out = await handle({ method: req.method ?? "GET", path: url.pathname, query: url.searchParams, headers, body });
    res.writeHead(out.status, { ...cors, "content-type": "application/json" }).end(JSON.stringify(out.body));
  });
  server.listen(opts.port ?? 8787);
  return server;
}

async function main() {
  const env = process.env;
  let parse;
  if (modelConfigured()) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    parse = ((p: never) => client.beta.messages.parse(p)) as never;
  }
  const ws = await Workspace.create({ config: InMemoryConfigStore.withDefaults(), parse });
  const port = Number(env.PORT ?? 8787);
  serve(ws, { port, inboundSecret: env.INBOUND_SECRET, corsOrigin: env.CORS_ORIGIN });
  console.log(`Freight Orchestrator API on http://localhost:${port}/api/health`);
  console.log(`  extraction: ${ws.modelEnabled ? "Claude, with the rules as fallback" : "rules only"}`);
  console.log(`  inbound webhook: ${env.INBOUND_SECRET ? "POST /api/inbound/email" : "off (set INBOUND_SECRET)"}`);
  if (env.IMAP_HOST && env.IMAP_USER && env.IMAP_PASSWORD) {
    const cfg = { host: env.IMAP_HOST, port: env.IMAP_PORT ? Number(env.IMAP_PORT) : undefined, user: env.IMAP_USER, password: env.IMAP_PASSWORD, mailbox: env.IMAP_MAILBOX, tls: env.IMAP_TLS !== "false" };
    startImapPoller(cfg, async (raw) => void (await ws.ingestEmail(raw, "imap")), {
      intervalMs: Number(env.IMAP_INTERVAL_S ?? 60) * 1000,
      onResult: (r) => (r instanceof Error ? console.error(`imap: ${r.message}`) : r.fetched || r.failed.length ? console.log(`imap: ${r.fetched} taken in, ${r.failed.length} failed`) : undefined),
    });
    console.log(`  imap: polling ${cfg.user}@${cfg.host}`);
  } else console.log("  imap: off (set IMAP_HOST, IMAP_USER, IMAP_PASSWORD)");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) void main();

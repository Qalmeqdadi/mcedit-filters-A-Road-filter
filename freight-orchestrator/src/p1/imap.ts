// 1.1.1 Ingest from a desk mailbox over IMAP. A small client with no dependencies: LOGIN, SELECT,
// UID SEARCH UNSEEN, UID FETCH BODY.PEEK[], then UID STORE \Seen once the message is safely taken in.
// A message whose handler throws is left unseen, so the next poll retries it.
import { connect as netConnect, type Socket } from "node:net";
import { connect as tlsConnect } from "node:tls";

export interface ImapConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  /** Implicit TLS (port 993). Default true. Plain connections are for local tests only. */
  tls?: boolean;
  mailbox?: string;
  /** Per-command timeout. */
  timeoutMs?: number;
}

export interface PollResult {
  fetched: number;
  failed: { uid: number; error: string }[];
}

interface Response {
  line: string;
  literals: Buffer[];
}

class ImapError extends Error {}

const quote = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

class Connection {
  private buf = Buffer.alloc(0);
  private wake: (() => void) | null = null;
  private failure: Error | null = null;
  private tag = 0;

  constructor(private readonly sock: Socket, private readonly timeoutMs: number) {
    sock.on("data", (d: Buffer) => {
      this.buf = Buffer.concat([this.buf, d]);
      this.wake?.();
    });
    const fail = (e: Error) => {
      this.failure ??= e;
      this.wake?.();
    };
    sock.on("error", fail);
    sock.on("close", () => fail(new ImapError("connection closed")));
  }

  private async until(ready: () => boolean): Promise<void> {
    const deadline = Date.now() + this.timeoutMs;
    while (!ready()) {
      if (this.failure) throw this.failure;
      const left = deadline - Date.now();
      if (left <= 0) throw new ImapError("timed out waiting for the server");
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, left);
        this.wake = () => {
          clearTimeout(t);
          resolve();
        };
      });
      this.wake = null;
    }
  }

  private async readLine(): Promise<string> {
    let i = -1;
    await this.until(() => (i = this.buf.indexOf("\r\n")) >= 0);
    const line = this.buf.subarray(0, i).toString("utf8");
    this.buf = this.buf.subarray(i + 2);
    return line;
  }

  private async readBytes(n: number): Promise<Buffer> {
    await this.until(() => this.buf.length >= n);
    const out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    return Buffer.from(out);
  }

  /** One server response, with any {n} literals it carries. */
  async read(): Promise<Response> {
    let line = "";
    const literals: Buffer[] = [];
    for (;;) {
      const part = await this.readLine();
      line += part;
      const m = /\{(\d+)\}$/.exec(part);
      if (!m) return { line, literals };
      literals.push(await this.readBytes(Number(m[1])));
    }
  }

  async command(cmd: string): Promise<Response[]> {
    const tag = `A${++this.tag}`;
    this.sock.write(`${tag} ${cmd}\r\n`);
    const untagged: Response[] = [];
    for (;;) {
      const r = await this.read();
      if (r.line.startsWith(`${tag} `)) {
        const status = r.line.slice(tag.length + 1).split(" ")[0];
        if (status !== "OK") throw new ImapError(`${cmd.split(" ")[0]} failed: ${r.line.slice(tag.length + 1)}`);
        return untagged;
      }
      untagged.push(r);
    }
  }

  close() {
    this.sock.destroy();
  }
}

async function open(cfg: ImapConfig): Promise<Connection> {
  const useTls = cfg.tls ?? true;
  const port = cfg.port ?? (useTls ? 993 : 143);
  const sock = await new Promise<Socket>((resolve, reject) => {
    const s = useTls ? tlsConnect({ host: cfg.host, port, servername: cfg.host }, () => resolve(s)) : netConnect({ host: cfg.host, port }, () => resolve(s));
    s.once("error", reject);
  });
  const c = new Connection(sock, cfg.timeoutMs ?? 15000);
  const greeting = await c.read();
  if (!greeting.line.startsWith("* OK")) {
    c.close();
    throw new ImapError(`unexpected greeting: ${greeting.line}`);
  }
  return c;
}

/** Fetches every unseen message once, hands it to onMessage, and marks it seen only if that succeeded. */
export async function pollOnce(cfg: ImapConfig, onMessage: (raw: string, uid: number) => Promise<void>): Promise<PollResult> {
  const c = await open(cfg);
  const result: PollResult = { fetched: 0, failed: [] };
  try {
    await c.command(`LOGIN ${quote(cfg.user)} ${quote(cfg.password)}`);
    await c.command(`SELECT ${quote(cfg.mailbox ?? "INBOX")}`);
    const search = await c.command("UID SEARCH UNSEEN");
    const uids = search.flatMap((r) => (r.line.startsWith("* SEARCH") ? r.line.slice(8).trim().split(/\s+/).filter(Boolean).map(Number) : []));
    for (const uid of uids) {
      const fetched = await c.command(`UID FETCH ${uid} BODY.PEEK[]`);
      const raw = fetched.find((r) => r.literals.length)?.literals[0]?.toString("utf8");
      if (raw === undefined) {
        result.failed.push({ uid, error: "no message body returned" });
        continue;
      }
      try {
        await onMessage(raw, uid);
        await c.command(`UID STORE ${uid} +FLAGS.SILENT (\\Seen)`);
        result.fetched++;
      } catch (e) {
        result.failed.push({ uid, error: e instanceof Error ? e.message : String(e) });
      }
    }
    await c.command("LOGOUT").catch(() => undefined);
  } finally {
    c.close();
  }
  return result;
}

/** Polls on an interval. Errors are reported, never thrown, so one bad poll does not stop intake. */
export function startImapPoller(cfg: ImapConfig, onMessage: (raw: string, uid: number) => Promise<void>, opts: { intervalMs?: number; onResult?: (r: PollResult | Error) => void } = {}) {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  const tick = async () => {
    try {
      opts.onResult?.(await pollOnce(cfg, onMessage));
    } catch (e) {
      opts.onResult?.(e instanceof Error ? e : new Error(String(e)));
    }
    if (!stopped) timer = setTimeout(tick, opts.intervalMs ?? 60000);
  };
  void tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

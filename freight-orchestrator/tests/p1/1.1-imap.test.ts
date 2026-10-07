// 1.1.1 IMAP polling against a scripted server: fetch unseen, mark seen only after intake succeeds.
import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { pollOnce } from "@/p1/imap";

interface Msg {
  uid: number;
  raw: string;
  seen: boolean;
}

function fakeImap(msgs: Msg[], opts: { password?: string } = {}) {
  const log: string[] = [];
  const server: Server = createServer((sock) => {
    sock.write("* OK fake IMAP ready\r\n");
    let buf = "";
    sock.on("data", (d) => {
      buf += d.toString();
      let i: number;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const [tag, ...rest] = line.split(" ");
        const cmd = rest.join(" ");
        log.push(cmd.startsWith("LOGIN") ? "LOGIN ***" : cmd);
        if (cmd.startsWith("LOGIN")) {
          const ok = !opts.password || cmd.includes(`"${opts.password}"`);
          sock.write(ok ? `${tag} OK logged in\r\n` : `${tag} NO [AUTHENTICATIONFAILED] invalid credentials\r\n`);
        } else if (cmd.startsWith("SELECT")) {
          sock.write(`* ${msgs.length} EXISTS\r\n${tag} OK [READ-WRITE] selected\r\n`);
        } else if (cmd === "UID SEARCH UNSEEN") {
          sock.write(`* SEARCH ${msgs.filter((m) => !m.seen).map((m) => m.uid).join(" ")}\r\n${tag} OK search done\r\n`);
        } else if (cmd.startsWith("UID FETCH")) {
          const m = msgs.find((x) => x.uid === Number(cmd.split(" ")[2]))!;
          const body = Buffer.from(m.raw);
          sock.write(`* ${m.uid} FETCH (UID ${m.uid} BODY[] {${body.length}}\r\n`);
          sock.write(body);
          sock.write(`)\r\n${tag} OK fetch done\r\n`);
        } else if (cmd.startsWith("UID STORE")) {
          msgs.find((x) => x.uid === Number(cmd.split(" ")[2]))!.seen = true;
          sock.write(`${tag} OK stored\r\n`);
        } else if (cmd === "LOGOUT") {
          sock.write(`* BYE\r\n${tag} OK bye\r\n`);
          sock.end();
        } else sock.write(`${tag} BAD unknown\r\n`);
      }
    });
  });
  return new Promise<{ port: number; server: Server; log: string[] }>((resolve) => server.listen(0, "127.0.0.1", () => resolve({ port: (server.address() as { port: number }).port, server, log })));
}

let server: Server | undefined;
afterEach(() => server?.close());

describe("pollOnce", () => {
  it("fetches unseen messages byte for byte, including non-ASCII, and marks them seen", async () => {
    const msgs: Msg[] = [
      { uid: 7, raw: "From: a@x.example\r\nSubject: one\r\n\r\nShanghai → Jebel Ali, 18 pallets\r\n", seen: false },
      { uid: 8, raw: "From: b@x.example\r\nSubject: old\r\n\r\nalready read", seen: true },
      { uid: 9, raw: "From: c@x.example\r\nSubject: two\r\n\r\n{5}\r\nnot a literal", seen: false },
    ];
    const f = await fakeImap(msgs);
    server = f.server;
    const got: [number, string][] = [];
    const r = await pollOnce({ host: "127.0.0.1", port: f.port, user: "quotes@gulfway.example", password: "pw", tls: false }, async (raw, uid) => void got.push([uid, raw]));
    expect(r).toEqual({ fetched: 2, failed: [] });
    expect(got).toEqual([
      [7, msgs[0]!.raw],
      [9, msgs[2]!.raw],
    ]);
    expect(msgs.map((m) => m.seen)).toEqual([true, true, true]);
    expect(f.log).toEqual(["LOGIN ***", 'SELECT "INBOX"', "UID SEARCH UNSEEN", "UID FETCH 7 BODY.PEEK[]", "UID STORE 7 +FLAGS.SILENT (\\Seen)", "UID FETCH 9 BODY.PEEK[]", "UID STORE 9 +FLAGS.SILENT (\\Seen)", "LOGOUT"]);
  });

  it("leaves a message unseen when intake fails, so the next poll retries it", async () => {
    const msgs: Msg[] = [{ uid: 1, raw: "Subject: x\r\n\r\nbody", seen: false }];
    const f = await fakeImap(msgs);
    server = f.server;
    const r = await pollOnce({ host: "127.0.0.1", port: f.port, user: "u", password: "p", tls: false }, async () => {
      throw new Error("database down");
    });
    expect(r).toEqual({ fetched: 0, failed: [{ uid: 1, error: "database down" }] });
    expect(msgs[0]!.seen).toBe(false);
  });

  it("reports a failed login", async () => {
    const f = await fakeImap([], { password: "right" });
    server = f.server;
    await expect(pollOnce({ host: "127.0.0.1", port: f.port, user: "u", password: "wrong", tls: false }, async () => undefined)).rejects.toThrow(/LOGIN failed: NO/);
  });
});

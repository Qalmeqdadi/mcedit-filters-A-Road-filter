// 1.1 Receive the requirement: ingest, extract, check completeness, ask, deduplicate.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { daysBetween, findDates } from "@/extract/dates";
import { locate } from "@/extract/types";
import { decodeWords, parseEmail } from "@/p1/email";
import { checkCompleteness, dedupe, extractRequest, knownFrom, missingInfoReply, RULES_VERSION } from "@/p1/intake";

const eml = readFileSync(join(import.meta.dirname, "../fixtures/email/alnoor-request.eml"), "utf8");
const NOW = new Date("2026-09-16T08:00:00Z");

describe("1.1.1 ingest email", () => {
  const e = parseEmail(eml);

  it("reads the headers", () => {
    expect(e.from).toBe("sara.haddad@alnoor-home.example");
    expect(e.fromName).toBe("Sara Haddad");
    expect(e.subject).toBe("Need a rate for next week's Shanghai shipment");
    expect(e.date?.toISOString()).toBe("2026-09-16T05:58:00.000Z");
    expect(e.messageId).toBeTruthy();
  });

  it("takes the plain-text body of a multipart message", () => {
    expect(e.text).toContain("18 pallets");
    expect(e.text).not.toContain("<html");
  });

  it("decodes encoded words", () => {
    expect(decodeWords("=?UTF-8?B?Q2Fmw6k=?=")).toBe("Café");
    expect(decodeWords("=?utf-8?Q?Jebel_Ali_=E2=80=93_urgent?=")).toBe("Jebel Ali – urgent");
  });

  it("decodes a quoted-printable body and lists attachments", () => {
    const raw = [
      "From: Omar <omar@example.com>",
      "Subject: test",
      'Content-Type: multipart/mixed; boundary="b1"',
      "",
      "--b1",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      "Weight 1=2C200 kg, soft=",
      "break here",
      "--b1",
      'Content-Type: application/pdf; name="packing-list.pdf"',
      'Content-Disposition: attachment; filename="packing-list.pdf"',
      "Content-Transfer-Encoding: base64",
      "",
      "JVBERi0xLjQK",
      "--b1--",
    ].join("\r\n");
    const p = parseEmail(raw);
    expect(p.text).toContain("Weight 1,200 kg, softbreak here");
    expect(p.attachments.map((a) => a.filename)).toEqual(["packing-list.pdf"]);
  });
});

describe("1.1.3 extract fields and normalise", () => {
  const d = extractRequest(eml, NOW);

  it("reads Sara's request into normalised values", () => {
    expect(d.values).toMatchObject({
      commodity: "household appliances",
      origin: "CNSHA",
      destination: "AEJEA",
      packages: { count: 18, type: "pallet" },
      dimsCm: { l: 120, w: 100, h: 160 },
      grossKg: 21400,
      cbm: 34.6,
      stackable: false,
      readyDate: "2026-09-20",
      deliverBy: "2026-10-20",
      hardDeadline: true,
    });
  });

  it("scores every field and shows where it came from", () => {
    for (const f of Object.values(d.fields)) {
      expect(f.confidence).toBeGreaterThanOrEqual(0);
      expect(f.confidence).toBeLessThanOrEqual(1);
      expect(f.by).toBe(RULES_VERSION);
    }
    expect(d.fields.grossKg?.source?.text).toBe("21.4 tons");
    expect(d.fields.origin?.source?.text).toBe("Shanghai");
  });

  it("marks an inferred mode as unsure rather than guessing confidently", () => {
    expect(d.values.mode).toBe("ocean_fcl");
    expect(d.fields.mode!.confidence).toBeLessThan(0.7);
  });

  it("reads a short air enquiry and flags a city without the right kind of hub", () => {
    const s = extractRequest("Hi, need a price to fly 3 cartons of phone parts from Shenzhen to Riyadh, 45 kg. Ready Monday 5 Oct.\nRegards, Omar", NOW);
    expect(s.values).toMatchObject({ commodity: "phone parts", destination: "RUH", mode: "air", grossKg: 45, readyDate: "2026-10-05", packages: { count: 3, type: "carton" } });
    expect(s.fields.origin!.confidence).toBeLessThan(0.7);
    expect(s.fields.origin!.note).toBeTruthy();
  });

  it("reads dangerous goods", () => {
    const s = extractRequest("Please quote 1x20GP Jebel Ali to Hamburg, lithium batteries UN3480 class 9, 8 tons, ready 2026-10-12", NOW);
    expect(s.values).toMatchObject({ origin: "AEJEA", destination: "DEHAM", unNumber: "UN3480", dgClass: "9", equipment: { count: 1, type: "20GP" }, grossKg: 8000 });
  });
});

describe("1.1.4 completeness and 1.1.5 asking for what is missing", () => {
  it("Sara's request can be quoted, with the inferred mode left for a person", () => {
    const c = checkCompleteness(extractRequest(eml, NOW));
    expect(c).toEqual({ ok: true, missing: [], unsure: ["mode"] });
  });

  it("asks for size and confirmation in one message", () => {
    const d = extractRequest("need a price to fly 3 cartons of phone parts from Shenzhen to Riyadh, 45 kg. Ready 5 Oct", NOW);
    const c = checkCompleteness(d);
    expect(c.ok).toBe(false);
    expect(c.missing).toContain("size");
    const reply = missingInfoReply(d, c, "Gulfway Logistics");
    expect(reply).toMatch(/dimensions/);
    expect(reply).toMatch(/Shenzhen/);
    expect(reply).toMatch(/Gulfway Logistics$/);
  });
});

describe("1.1.6 deduplicate", () => {
  const d = extractRequest(eml, NOW);
  const known = [knownFrom("REQ-1", d)];

  it("the same email twice is a duplicate", () => {
    expect(dedupe(extractRequest(eml, NOW), known)).toEqual({ kind: "duplicate", of: "REQ-1" });
  });

  it("a changed weight in the thread is a revision", () => {
    const rev = extractRequest(
      ["From: Sara Haddad <sara.haddad@alnoor-home.example>", `In-Reply-To: ${d.email.messageId}`, "Subject: Re: rate", "", "Update: Shanghai to Jebel Ali, 18 pallets, now 23,000 kg, ready 20 September."].join("\n"),
      NOW,
    );
    expect(dedupe(rev, known)).toEqual({ kind: "revision", of: "REQ-1", changed: ["grossKg"] });
  });

  it("the same lane a month later is a new shipment", () => {
    const later = extractRequest("From: s@alnoor-home.example\nSubject: next one\n\nShanghai to Jebel Ali again, 18 pallets 21,400 kg, ready 25 October", NOW);
    expect(dedupe(later, known)).toEqual({ kind: "new" });
  });
});

describe("dates and spans", () => {
  it("reads the ways people write dates", () => {
    const ref = new Date("2026-09-16T00:00:00Z");
    const got = findDates("ETD 2026-10-05, cut-off 25-Sep-2026, valid Sep 30, 2026, ready 20 September, then 24/09 and the twenty fourth", ref);
    expect(got.map((d) => d.date)).toEqual(["2026-10-05", "2026-09-25", "2026-09-30", "2026-09-20", "2026-09-24", "2026-09-24"]);
    expect(got.at(-1)!.confidence).toBeLessThan(0.8);
  });

  it("only trusts day-first slashes when the day cannot be a month", () => {
    const ref = new Date("2026-09-16T00:00:00Z");
    expect(findDates("24/09", ref)[0]!.confidence).toBeGreaterThan(0.9);
    expect(findDates("05/10", ref)[0]!.confidence).toBeLessThan(0.85);
  });

  it("moves a year-less date in the past into next year", () => {
    expect(findDates("ready 10 January", new Date("2026-12-01T00:00:00Z"))[0]!.date).toBe("2027-01-10");
  });

  it("locates quotes case-insensitively", () => {
    const src = "Rate is all in USD 2,180 per box";
    expect(locate(src, "all in usd 2,180")?.text).toBe("all in USD 2,180");
    expect(locate(src, "not there")).toBeUndefined();
    expect(daysBetween("2026-09-20", "2026-10-20")).toBe(30);
  });
});

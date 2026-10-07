// Screens on the global map. The world view reads networkFor() through the real policy for the
// chosen person; Inbox, Reply lab and Audit drive the backend's own API workspace in the page.
import type { ReplyRecord, RequestRecord } from "@fo/api/workspace";
import type { AuditRecord } from "@fo/governance/audit";
import type { ExtractedField } from "@fo/extract/types";
import { hub } from "@fo/network/hubs";
import { MODE_PROFILES, type ModeFamily } from "@fo/network/modes";
import type { ReviewRecord } from "@fo/api/workspace";
import { useMemo, useState, type ReactNode } from "react";
import sara from "@fo-fixtures/email/alnoor-request.eml?raw";
import oceanlinkReply from "@fo-fixtures/replies/oceanlink-email.txt?raw";
import meridianReply from "@fo-fixtures/replies/meridian-pdf.txt?raw";
import blueharborReply from "@fo-fixtures/replies/blueharbor-whatsapp.txt?raw";
import { CONFIDENCE, DEFAULT_LENS, LENSES, LENS_KEYS, useRead, viewFor, write, type LensKey } from "../../live/engine";
import { FAMILY_ICON } from "../../globe/GlobeLabels";
import { FAMILY_LABEL, orgName, useMapModel, type DrawLane } from "../../globe/model";
import { frame } from "../../globe/routes";
import { REGIONS, flyTo, flyToFit } from "../../globe/state";
import { useStore, type Family, type View } from "../../store";
import { Card, HBar, Head, Meter, Pill } from "../bits";

const usd = (n: number) => `USD ${n.toLocaleString("en-US", { maximumFractionDigits: n < 20 ? 2 : 0 })}`;

// ── Lens picker ──────────────────────────────────────────────────────────────

const GROUPS: [string, (k: LensKey) => boolean][] = [
  ["Forwarder desks", (k) => LENSES[k].persona === "fwd"],
  ["Shippers", (k) => LENSES[k].persona === "shp"],
  ["Carriers", (k) => LENSES[k].persona === "car"],
  ["Service partners", (k) => LENSES[k].persona === "par"],
];

export function LensPicker() {
  const lens = useStore((s) => s.lens);
  const setLens = useStore((s) => s.setLens);
  const L = LENSES[lens];
  return (
    <div className="lens">
      <span className="avatar" style={{ background: L.color }}>{L.person.split(" ").map((w) => w[0]).join("")}</span>
      <label className="min0">
        <span className="muted sm">Viewing as</span>
        <select value={lens} onChange={(e) => setLens(e.target.value as LensKey)} aria-label="Person whose view of the network to show">
          {GROUPS.map(([g, f]) => (
            <optgroup key={g} label={g}>
              {LENS_KEYS.filter(f).map((k) => <option key={k} value={k}>{LENSES[k].person} · {LENSES[k].org} ({LENSES[k].role})</option>)}
            </optgroup>
          ))}
        </select>
      </label>
    </div>
  );
}

// ── World ────────────────────────────────────────────────────────────────────

const WHY: Record<"fwd" | "shp" | "car" | "par", string> = {
  fwd: "Lanes run by carriers on this desk's panel, with the rates this desk negotiated. Another desk's rates never reach this view. Shipments are the desk's own, with every leg and partner job.",
  shp: "Only this shipper's own shipments and their legs. Carrier schedules and rates belong to the forwarder, so none are drawn.",
  car: "This carrier's own services and the rates it gave each desk, plus shipments where it runs the main leg. Other carriers' legs stay hidden.",
  par: "Jobs offered to this partner, at the hub where the work happens. Nothing else of the network is shared.",
};

const BOARD_FOR: Partial<Record<LensKey, [View, string]>> = {
  gulfwayAgent: ["dash", "Open the Jebel Ali desk board"],
  alNoor: ["sh_home", "Open Al Noor's shipments board"],
  oceanlink: ["c_home", "Open Oceanlink's terminal board"],
  alSafa: ["p_jobs", "Open Al Safa's job board"],
};

function fitLane(l: DrawLane) {
  const f = frame(l.path.points);
  flyToFit(f.center, f.radius);
}

export function WorldView() {
  const model = useMapModel();
  const lens = useStore((s) => s.lens);
  const pick = useStore((s) => s.pick);
  const set = useStore((s) => s.set);
  const open = useStore((s) => s.open);
  const L = LENSES[lens];
  const { view } = model;
  const rates = view.lanes.reduce((a, l) => a + l.rates.length, 0);
  const byFamily = useMemo(() => {
    const m = new Map<ModeFamily, DrawLane[]>();
    for (const l of model.lanes) m.set(l.family, [...(m.get(l.family) ?? []), l]);
    return [...m.entries()];
  }, [model]);
  const board = BOARD_FOR[lens];

  return (
    <>
      <Head title="Global network" sub="Ports, airports, rail terminals and truck hubs, with every lane and shipment this person is allowed to see." />
      <LensPicker />
      <div className="statrow sp">
        <div><b>{view.lanes.length}</b><span>lanes</span></div>
        <div><b>{view.shipments.length}</b><span>moving now</span></div>
        <div><b>{rates}</b><span>rates visible</span></div>
        <div className="hid"><b>{view.checks.denied}</b><span>records withheld</span></div>
      </div>
      <p className="why sp"><b>Why this view:</b> {WHY[L.persona]} <span className="muted">Every row was checked against <code>{view.checks.policyVersion}</code>: {view.checks.allowed} allowed, {view.checks.denied} refused.</span></p>

      {pick && <PickCard />}

      {board && (
        <button type="button" className="cta-row sp" onClick={() => open(board[0])}>
          <span><b>{board[1]}</b><span className="muted sm">Zoom from the globe into the site, on the isometric board</span></span>
          <span aria-hidden>→</span>
        </button>
      )}

      {view.shipments.length > 0 && (
        <Card className="sp" title="Moving now" sub={L.persona === "car" ? "Where you run the main leg" : "Click one to follow it"}>
          {model.shipments.map((s) => (
            <button key={s.s.id} type="button" className="lrow" aria-current={pick?.id === s.s.id} onClick={() => {
              set({ pick: { kind: "shipment", id: s.s.id } });
              const f = frame(s.paths.flatMap((p) => p.points));
              flyToFit(f.center, f.radius);
            }}>
              <span className={`fam f-${s.family}`}>{FAMILY_ICON[s.family]}</span>
              <div className="min0"><b>{s.s.id}</b> <span className="muted sm">{s.legLabel}</span><div className="muted sm ellip">{s.s.cargo}</div></div>
              {s.s.exception ? <Pill tone={s.s.exception.kind === "delay" ? "warn" : "bad"}>{s.s.exception.kind}</Pill> : <span className="num muted sm">ETA {s.s.eta}</span>}
            </button>
          ))}
        </Card>
      )}

      {view.jobs.length > 0 && (
        <Card className="sp" title="Jobs offered to you" sub="Customs, insurance and warehousing work attached to live shipments">
          {view.jobs.map((j) => (
            <button key={j.id} type="button" className="lrow" onClick={() => flyTo(hub(j.hub).lat, hub(j.hub).lon, 1.6)}>
              <div className="min0"><b>{j.service}</b><div className="muted sm">{j.shipmentId} · {hub(j.hub).name}</div></div>
              <Pill tone={j.status === "offered" ? "warn" : "ok"}>{j.status}</Pill>
              <span className="num sm">USD {j.fee}</span>
            </button>
          ))}
        </Card>
      )}

      {byFamily.map(([fam, lanes]) => (
        <Card key={fam} className="sp" title={<span className="row-i">{FAMILY_ICON[fam as Family]} {FAMILY_LABEL[fam as Family]} lanes</span>} sub={`${lanes.length} services · free space counted in ${MODE_PROFILES[lanes[0]!.lane.mode].unitLabel}`}>
          {lanes.map((l) => {
            const prof = MODE_PROFILES[l.lane.mode];
            const mine = l.lane.rates.find((r) => r.deskOrgId === L.actor.orgId) ?? l.lane.rates[0];
            const per = l.lane.mode === "air" ? "/kg" : l.lane.mode === "road" ? "/truck" : l.lane.mode === "rail" ? "/box" : l.lane.mode === "ocean_lcl" ? "/W·M" : "/FEU";
            return (
              <button key={l.lane.id} type="button" className="lrow" aria-current={pick?.id === l.lane.id} onClick={() => {
                set({ pick: { kind: "lane", id: l.lane.id } });
                fitLane(l);
              }}>
                <div className="min0">
                  <b>{orgName(l.lane.carrierOrgId)}</b> <span className="muted sm">{l.lane.service}</span>
                  <div className="muted sm ellip">{hub(l.lane.from).city} → {l.lane.via.length ? l.lane.via.map((v) => hub(v).city).join(" → ") + " → " : ""}{hub(l.lane.to).city} · {l.lane.transitDays} d · {l.lane.perWeek}×/wk</div>
                  <Meter v={100 - (l.lane.freeUnits / l.lane.totalUnits) * 100} tone={l.lane.freeUnits / l.lane.totalUnits < 0.1 ? "over" : undefined} />
                </div>
                <div className="num sm right">
                  {mine ? <b>{usd(mine.amount)}{per}</b> : <span className="muted">index {usd(l.lane.benchmark)}{per}</span>}
                  <div className="muted">{l.lane.freeUnits.toLocaleString()} {prof.unitLabel} free</div>
                </div>
              </button>
            );
          })}
        </Card>
      ))}
      {model.filteredOut > 0 && <p className="muted sm sp">{model.filteredOut} lanes hidden by the mode filter on the map.</p>}

      <Card className="sp" title="Regions" sub="GCC to Asia and GCC to Europe are the pilot; the rest of the world is drawn and ready">
        <div className="pad row">
          {(Object.entries(REGIONS) as [keyof typeof REGIONS, (typeof REGIONS)["gcc"]][]).map(([k, r]) => (
            <button key={k} type="button" className={`btn ghost sm${k === "gcc" ? " pilot" : ""}`} onClick={() => {
              set({ pick: k === "world" ? null : { kind: "region", id: k } });
              flyTo(r.at[0], r.at[1], r.dist);
            }}>{r.label}</button>
          ))}
        </div>
      </Card>
    </>
  );
}

function PickCard() {
  const model = useMapModel();
  const pick = useStore((s) => s.pick)!;
  const set = useStore((s) => s.set);
  const close = <button type="button" className="btn ghost sm" onClick={() => set({ pick: null })}>Clear</button>;
  if (pick.kind === "hub") {
    const h = hub(pick.id);
    const lanes = model.lanes.filter((l) => [l.lane.from, ...l.lane.via, l.lane.to].includes(h.code));
    return (
      <Card className="sp pickcard" title={`${h.name} · ${h.code}`} sub={`${h.city}, ${h.country} · ${h.kind === "truck" ? "truck hub" : h.kind}`} right={close}>
        {lanes.length ? lanes.map((l) => (
          <button key={l.lane.id} type="button" className="lrow" onClick={() => { set({ pick: { kind: "lane", id: l.lane.id } }); fitLane(l); }}>
            <span className={`fam f-${l.family}`}>{FAMILY_ICON[l.family]}</span>
            <div className="min0"><b>{orgName(l.lane.carrierOrgId)}</b> <span className="muted sm">{l.lane.service}</span><div className="muted sm">{hub(l.lane.from).city} → {hub(l.lane.to).city}</div></div>
          </button>
        )) : <p className="pad muted sm">No lanes you can see call here.</p>}
      </Card>
    );
  }
  if (pick.kind === "lane") {
    const l = model.lanes.find((x) => x.lane.id === pick.id);
    if (!l) return null;
    const prof = MODE_PROFILES[l.lane.mode];
    return (
      <Card className="sp pickcard" title={`${orgName(l.lane.carrierOrgId)} · ${l.lane.service}`} sub={`${prof.label} · ${[l.lane.from, ...l.lane.via, l.lane.to].join(" → ")}`} right={close}>
        <div className="pad kv">
          <span>Transit</span><b>{l.lane.transitDays} days</b>
          <span>Departures</span><b>{l.lane.perWeek} a week</b>
          <span>Free on next</span><b>{l.lane.freeUnits.toLocaleString()} of {l.lane.totalUnits.toLocaleString()} {prof.unitLabel}</b>
          <span>Cut-offs</span><b>{prof.cutoffs.map((c) => c.replace("_", " ")).join(", ")}</b>
          <span>Lane index</span><b>{usd(l.lane.benchmark)} ({prof.priceBasis.replace(/_/g, " ")})</b>
          {l.lane.rates.map((r) => <><span key={r.deskOrgId + "l"}>Rate · {orgName(r.deskOrgId)}</span><b key={r.deskOrgId}>{usd(r.amount)}</b></>)}
        </div>
      </Card>
    );
  }
  if (pick.kind === "shipment") {
    const s = model.shipments.find((x) => x.s.id === pick.id);
    if (!s) return null;
    return (
      <Card className="sp pickcard" title={`${s.s.id} · ${s.s.cargo}`} sub={`ETA ${s.s.eta}`} right={close}>
        {s.s.exception && <p className={`pad alertline ${s.s.exception.kind}`}>{s.s.exception.text}</p>}
        {s.s.legs.length ? s.s.legs.map((g) => (
          <div key={g.seq} className="lrow">
            <span className={`fam f-${({ ocean_fcl: "sea", ocean_lcl: "sea", air: "air", road: "road", rail: "rail" } as const)[g.mode]}`}>{FAMILY_ICON[({ ocean_fcl: "sea", ocean_lcl: "sea", air: "air", road: "road", rail: "rail" } as const)[g.mode]]}</span>
            <div className="min0"><b>{hub(g.from).city} → {hub(g.to).city}</b> <span className="muted sm">{orgName(g.carrierOrgId)}</span><Meter v={g.progress * 100} /></div>
            <span className="num sm">{Math.round(g.progress * 100)}%</span>
          </div>
        )) : <p className="pad muted sm">Main leg {Math.round(s.s.main.progress * 100)}% done. Other carriers' legs are not shared with you.</p>}
      </Card>
    );
  }
  const r = REGIONS[pick.id as keyof typeof REGIONS];
  const hubs = model.hubs.filter((h) => h.region === pick.id);
  return (
    <Card className="sp pickcard" title={r?.label ?? pick.id} sub={`${hubs.length} hubs in this view`} right={close}>
      <div className="pad row">{hubs.map((h) => <button key={h.code} type="button" className="chip" onClick={() => { set({ pick: { kind: "hub", id: h.code } }); flyTo(h.lat, h.lon, 1.5); }}>{h.code} · {h.city}</button>)}</div>
    </Card>
  );
}

// ── Inbox: 1.1 live ──────────────────────────────────────────────────────────

const header = (from: string, to: string, subject: string, extra = "") => `From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}\r\nDate: Wed, 16 Sep 2026 11:20:00 +0400\r\n${extra}\r\n`;

const SAMPLES: { key: string; who: string; what: string; raw: string }[] = [
  { key: "sara", who: "Sara Haddad · Al Noor", what: "Ocean, Shanghai to Jebel Ali, complete", raw: sara },
  { key: "omar", who: "Omar · unknown trader", what: "Air, Shenzhen to Riyadh, size missing", raw: header("Omar <omar@trader-mail.example>", "quotes@gulfway.example", "price pls") + "Hi, need a price to fly 3 cartons of phone parts from Shenzhen to Riyadh, 45 kg. Ready Monday 5 Oct.\r\nRegards, Omar" },
  { key: "kaizen", who: "Priya · Kaizen Auto", what: "Dangerous goods to Hamburg", raw: header("Priya Nair <priya@kaizen-auto.example>", "quotes@gulfway.example", "DG shipment to Hamburg") + "Hello,\r\nPlease quote 1x20GP Jebel Ali to Hamburg, lithium batteries UN3480 class 9, 8 tons on 10 pallets, ready 2026-10-12. FOB.\r\nThanks,\r\nPriya\r\nKaizen Auto Parts" },
  { key: "rev", who: "Sara Haddad · Al Noor", what: "Revision in the same thread", raw: header("Sara Haddad <sara.haddad@alnoor-home.example>", "quotes@gulfway.example", "Re: Need a rate for next week's Shanghai shipment", "In-Reply-To: <rq-0142@alnoor-home.example>\r\n") + "Small update: Shanghai to Jebel Ali, still 18 pallets 120x100x160 cm, but the weight is now 23,000 kg. Ready 20 September.\r\nSara" },
  { key: "ol", who: "Lin Wei · Oceanlink", what: "A carrier's reply (goes to Reply lab)", raw: header("Lin Wei <rates@oceanlink.example>", "rates@gulfway.example", "RE: RFQ SHA-JEA 1x40HC") + oceanlinkReply },
  { key: "ns", who: "Jonas · Nordlicht", what: "Mail for another desk", raw: header("Jonas Weber <jonas@nordlicht-home.example>", "quotes@northsea.example", "Hamburg to Jebel Ali, kitchens") + "Hi Eva, please quote 2x40HC kitchen furniture Hamburg to Jebel Ali, 19 tons, ready 1 October.\r\nJonas" },
];

const FIELD_LABEL: Record<string, string> = {
  customer: "Customer", commodity: "Commodity", origin: "Origin", destination: "Destination", mode: "Mode", packages: "Packages", dims: "Dimensions",
  grossKg: "Gross weight", cbm: "Volume", stackable: "Stackable", readyDate: "Ready", deliverBy: "Deliver by", incoterm: "Incoterm",
  dangerousGoods: "Dangerous goods", unNumber: "UN number", dgClass: "DG class", tempC: "Temperature", cargoValue: "Cargo value", equipment: "Equipment",
  rate: "All-in rate", currency: "Currency", transitDays: "Transit", routing: "Routing", cutoff: "Cut-off", validity: "Valid until", conditions: "Conditions", lines: "Breakdown",
};

function show(field: string, v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (field === "grossKg") return `${Number(v).toLocaleString()} kg`;
  if (field === "cbm") return `${v} m³`;
  if (field === "transitDays") return `${v} days`;
  if ((field === "origin" || field === "destination") && typeof v === "string") {
    try {
      const h = hub(v);
      return `${h.code} · ${h.name}`;
    } catch {
      return v;
    }
  }
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" && x ? `${(x as { name: string }).name} ${(x as { amount: number }).amount}` : String(x))).join(" · ");
  if (typeof v === "object") {
    const o = v as Record<string, number | string>;
    if ("l" in o) return `${o.l}×${o.w}×${o.h} cm`;
    if ("count" in o) return `${o.count} × ${o.type}`;
    if ("amount" in o) return `${o.currency} ${Number(o.amount).toLocaleString()}`;
    if ("min" in o) return `${o.min} to ${o.max} °C`;
    return JSON.stringify(v);
  }
  return String(v);
}

/** The message text with every field's source marked; the hovered field stands out. */
function SourceText({ text, fields, hot }: { text: string; fields: ExtractedField[]; hot: string | null }) {
  const spans = fields.filter((f) => f.source && f.source.end > f.source.start).map((f) => ({ ...f.source!, field: f.field })).sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let at = 0;
  for (const s of spans) {
    if (s.start < at) continue;
    out.push(text.slice(at, s.start));
    out.push(<mark key={s.field + s.start} className={s.field === hot ? "hot" : ""} title={FIELD_LABEL[s.field] ?? s.field}>{text.slice(s.start, s.end)}</mark>);
    at = s.end;
  }
  out.push(text.slice(at));
  return <pre className="srctext">{out}</pre>;
}

function FieldRows({ fields, thresholds, onHover }: { fields: ExtractedField[]; thresholds?: Record<string, number>; onHover: (f: string | null) => void }) {
  return (
    <div className="ftable">
      {fields.map((f) => {
        const th = thresholds?.[f.field] ?? 0.7;
        const low = f.value !== null && f.confidence < th;
        return (
          <div key={f.field} className={`frow${low ? " low" : ""}${f.value === null ? " none" : ""}`} onMouseEnter={() => onHover(f.field)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(f.field)} tabIndex={0}>
            <span className="muted sm">{FIELD_LABEL[f.field] ?? f.field}</span>
            <b className="ellip">{show(f.field, f.value)}</b>
            <span className="conf" title={`${Math.round(f.confidence * 100)}% confident · needs ${Math.round(th * 100)}%`}><Meter v={f.confidence * 100} tone={low ? "warn" : undefined} /><span className="num sm">{Math.round(f.confidence * 100)}</span></span>
            {f.note && <span className="fnote muted sm">{f.note}</span>}
          </div>
        );
      })}
    </div>
  );
}

function DeskOnly({ children }: { children: ReactNode }) {
  const lens = useStore((s) => s.lens);
  const setLens = useStore((s) => s.setLens);
  if (LENSES[lens].persona === "fwd") return <>{children}</>;
  return (
    <Card className="sp" pad title="This is the desk's workspace">
      <p className="muted">{LENSES[lens].org} has no access to a forwarder's mailbox or review queue. The permission matrix refuses it, and so does this screen.</p>
      <button type="button" className="btn sm sp" onClick={() => setLens(DEFAULT_LENS.fwd)}>View as the Gulfway desk</button>
    </Card>
  );
}

export function InboxView() {
  const lens = useStore((s) => s.lens);
  const actor = LENSES[lens].actor;
  const set = useStore((s) => s.set);
  const toast = useStore((s) => s.toastMsg);
  const open = useStore((s) => s.open);
  const requests = useRead((ws) => ws.requestsFor(actor), [lens], [] as Partial<RequestRecord & { status: string }>[]);
  const [sel, setSel] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const r = requests.find((x) => x.id === sel) ?? requests[requests.length - 1];
  const mailbox = actor.orgId === "desk-northsea" ? "quotes@northsea.example" : "quotes@gulfway.example";

  const focus = (rec: Partial<RequestRecord>) => {
    const o = rec.values?.origin, d = rec.values?.destination;
    if (o && d) {
      set({ enquiry: { from: o, to: d, mode: rec.values?.mode, label: rec.id ?? "Request" } });
      const f = frame([[hub(o).lat, hub(o).lon], [hub(d).lat, hub(d).lon]]);
      flyToFit(f.center, f.radius);
    }
  };

  const deliver = async (raw: string, how: "webhook" | "upload", label: string) => {
    setBusy(true);
    try {
      const res = await write((ws) => (how === "upload" ? ws.ingestEmail(raw, "upload", { deskOrgId: actor.orgId! }) : ws.ingestEmail(raw, "webhook")));
      if (res.kind === "request") {
        const all = await write((ws) => ws.requestsFor(actor));
        const rec = all.find((x) => x.id === res.id);
        if (rec) {
          setSel(res.id!);
          focus(rec);
          toast(`${label}: ${res.id} is ${res.status === "validated" ? "ready to quote" : "waiting for information"}`);
        } else toast(`${label} went to another desk's mailbox. ${LENSES[lens].org} cannot see it.`);
      } else if (res.kind === "reply") toast(`${label} is a carrier reply: it is in the Reply lab`);
      else toast(`Not delivered: ${res.reason}`);
    } finally {
      setBusy(false);
    }
  };

  const fields = r?.fields ? Object.values(r.fields) : [];
  return (
    <DeskOnly>
      <Head title="Inbox" sub={<>Requests arriving at <b>{mailbox}</b>, read into fields as they land. The extraction, completeness check, deduplication, state machine and audit are the server's own code.</>} />
      <Card className="sp" title="Deliver a message" sub="Each one goes through the inbound-email webhook, exactly as a mail provider would post it">
        {SAMPLES.map((s) => (
          <button key={s.key} type="button" className="lrow" disabled={busy} onClick={() => deliver(s.raw, "webhook", s.who.split(" · ")[0]!)}>
            <div className="min0"><b>{s.who}</b><div className="muted sm">{s.what}</div></div>
            <span className="btn ghost sm" aria-hidden>Deliver</span>
          </button>
        ))}
        <div className="pad">
          <textarea className="paste" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Or paste any email source (headers and body) or plain text, then take it in. It lands on your desk." aria-label="Email source" />
          <div className="row sp">
            <button type="button" className="btn sm" disabled={!paste.trim() || busy} onClick={() => deliver(paste.includes("\n\n") || /^[\w-]+:/m.test(paste) ? paste : `Subject: pasted\r\n\r\n${paste}`, "upload", "Your message").then(() => setPaste(""))}>Take it in</button>
            <label className="btn ghost sm filebtn">Upload .eml<input type="file" accept=".eml,message/rfc822,text/plain" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await deliver(await f.text(), "upload", f.name);
              e.target.value = "";
            }} /></label>
          </div>
        </div>
      </Card>

      {requests.length > 0 && (
        <Card className="sp" title="Requests" sub={`${requests.length} on this desk`}>
          {requests.map((x) => (
            <button key={x.id} type="button" className="lrow" aria-current={x.id === r?.id} onClick={() => { setSel(x.id!); focus(x); }}>
              <div className="min0"><b>{x.id}</b> <span className="muted sm">{x.shipperName ?? x.from}</span><div className="muted sm ellip">{x.subject}</div></div>
              {x.dedupe && x.dedupe.kind !== "new" && <Pill tone="warn">{x.dedupe.kind} of {x.dedupe.of}</Pill>}
              <Pill tone={x.status === "validated" ? "ok" : "warn"} dot>{x.status === "validated" ? "ready to quote" : "awaiting info"}</Pill>
            </button>
          ))}
        </Card>
      )}

      {r && (
        <>
          <Card className="sp" title={`${r.id} · what was read`} sub={<>Hover a field to see where it came from. Read by <code>{r.extractedBy}</code>{r.fallbackReason ? ` (model unavailable: ${r.fallbackReason})` : ""}.</>} right={<Pill tone={r.completeness?.ok ? "ok" : "warn"}>{r.completeness?.ok ? "complete" : `missing ${r.completeness?.missing.join(", ")}`}</Pill>}>
            <FieldRows fields={fields} onHover={setHot} />
          </Card>
          <Card className="sp" title="The message" sub={`${r.from} · via ${r.via}`}>
            <SourceText text={r.source ?? ""} fields={fields} hot={hot} />
          </Card>
          {r.infoReply && (
            <Card className="sp" title="Reply drafted for the shipper" sub="1.1.5 · a person reviews and sends it; the request waits in awaiting_info" right={<button type="button" className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(r.infoReply!).then(() => toast("Reply copied"))}>Copy</button>}>
              <pre className="srctext">{r.infoReply}</pre>
            </Card>
          )}
          <button type="button" className="cta-row sp" onClick={() => open("audit")}><span><b>See the audit trail</b><span className="muted sm">Every extraction and state change, with the rule or model version</span></span><span aria-hidden>→</span></button>
        </>
      )}
    </DeskOnly>
  );
}

// ── Reply lab: 4.3 and 3.2 live ──────────────────────────────────────────────

const REPLY_SAMPLES = [
  { key: "ol", carrier: "car-oceanlink", channel: "email" as const, label: "Oceanlink · email", text: oceanlinkReply },
  { key: "mc", carrier: "car-meridian", channel: "pdf" as const, label: "Meridian · PDF quotation", text: meridianReply },
  { key: "bh", carrier: "car-blueharbor", channel: "chat" as const, label: "BlueHarbor · WhatsApp and voice note", text: blueharborReply },
];

export function RepliesView() {
  const lens = useStore((s) => s.lens);
  const actor = LENSES[lens].actor;
  const toast = useStore((s) => s.toastMsg);
  const replies = useRead((ws) => ws.repliesFor(actor), [lens], [] as Partial<ReplyRecord & { status: string }>[]);
  const review = useRead((ws) => ws.reviewFor(actor), [lens], [] as Partial<ReviewRecord>[]);
  const accuracy = useRead((ws) => ws.accuracyFor(actor), [lens], [] as Awaited<ReturnType<import("@fo/api/workspace").Workspace["accuracyFor"]>>);
  const thresholds = CONFIDENCE;
  const [sel, setSel] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [paste, setPaste] = useState({ text: "", carrier: "car-gulfstar", channel: "chat" as "chat" | "email" | "pdf" | "phone" });
  const r = replies.find((x) => x.id === sel) ?? replies[replies.length - 1];
  const items = review.filter((i) => i.replyId === r?.id);

  const send = async (carrierOrgId: string, channel: "email" | "pdf" | "chat" | "phone", text: string) => {
    const res = await write((ws) => ws.ingestReply({ deskOrgId: actor.orgId!, carrierOrgId, channel, text, via: "api" }));
    setSel(res.id!);
    const n = (await write((ws) => Promise.resolve(ws.reviewFor(actor)))).filter((i) => i.replyId === res.id && !i.resolved).length;
    toast(`${res.id} read: ${n ? `${n} field${n > 1 ? "s" : ""} for a person to check` : "nothing to check"}`);
  };

  const resolve = async (i: Partial<ReviewRecord>, value: unknown) => {
    await write((ws) => ws.resolveReview(actor, i.id!, value, edit[i.id! + ":why"]));
    setEdit((e) => ({ ...e, [i.id!]: "" }));
  };

  const fields = r?.fields ? Object.values(r.fields).filter((f) => f.field !== "lines") : [];
  const thr = { ...Object.fromEntries(fields.map((f) => [f.field, thresholds.defaultThreshold])), ...thresholds.perField };
  const priced = replies.filter((x) => x.costLines?.allIn || x.price).map((x) => ({ x, v: x.costLines?.allIn || x.price || 0 })).sort((a, b) => a.v - b.v);

  return (
    <DeskOnly>
      <Head title="Reply lab" sub="Carrier replies in any format become fields with their own confidence (4.3), then one comparable all-in per shipment (3.2). Low-confidence fields wait for a person; every answer becomes a training label." />
      <Card className="sp" title="Bring in a reply">
        {REPLY_SAMPLES.map((s) => (
          <button key={s.key} type="button" className="lrow" onClick={() => send(s.carrier, s.channel, s.text)}>
            <div className="min0"><b>{s.label}</b><div className="muted sm ellip">{s.text.split("\n").find((l) => l.trim().length > 12)}</div></div>
            <span className="btn ghost sm" aria-hidden>Read it</span>
          </button>
        ))}
        <div className="pad">
          <textarea className="paste" rows={3} value={paste.text} onChange={(e) => setPaste({ ...paste, text: e.target.value })} placeholder="Or paste a reply as it arrived: an email, text copied from a PDF, a chat thread" aria-label="Reply text" />
          <div className="row sp">
            <select value={paste.carrier} onChange={(e) => setPaste({ ...paste, carrier: e.target.value })} aria-label="Carrier">
              {deskCarriers(actor.orgId!).map((c) => <option key={c} value={c}>{orgName(c)}</option>)}
            </select>
            <select value={paste.channel} onChange={(e) => setPaste({ ...paste, channel: e.target.value as typeof paste.channel })} aria-label="Channel">
              <option value="chat">Chat</option><option value="email">Email</option><option value="pdf">PDF text</option><option value="phone">Phone note</option>
            </select>
            <button type="button" className="btn sm" disabled={!paste.text.trim()} onClick={() => send(paste.carrier, paste.channel, paste.text).then(() => setPaste({ ...paste, text: "" }))}>Read it</button>
          </div>
        </div>
      </Card>

      {priced.length > 0 && (
        <Card className="sp" title="Comparable all-in" sub="Per shipment, in USD, after mapping every charge to one dictionary" pad>
          {priced.map(({ x, v }) => <HBar key={x.id} label={<button type="button" className="linkish" onClick={() => setSel(x.id!)}>{x.carrierName?.split(" ")[0]} · {x.channel}</button>} v={v} max={priced[priced.length - 1]!.v * 1.08} right={usd(v)} color={x.id === r?.id ? "var(--signal)" : undefined} />)}
        </Card>
      )}

      {r && (
        <>
          <Card className="sp" title={`${r.id} · ${r.carrierName}`} sub={<>Read by <code>{r.extractedBy}</code> from {r.channel}{r.fallbackReason ? ` · model unavailable: ${r.fallbackReason}` : ""}</>} right={<Pill tone={items.some((i) => !i.resolved) ? "warn" : "ok"}>{items.filter((i) => !i.resolved).length ? `${items.filter((i) => !i.resolved).length} to check` : "clean"}</Pill>}>
            <FieldRows fields={fields} thresholds={thr} onHover={setHot} />
          </Card>
          <Card className="sp" title="As it arrived">
            <SourceText text={r.rawReply ?? ""} fields={fields} hot={hot} />
          </Card>
          {items.length > 0 && (
            <Card className="sp" title="For a person" sub="4.3.3 · confirm what is shaky, ask the carrier for what is missing. Corrections are audited as overrides.">
              {items.map((i) => (
                <div key={i.id} className={`lrow review${i.resolved ? " done" : ""}`}>
                  <div className="min0">
                    <b>{FIELD_LABEL[i.field!] ?? i.field}</b> <span className="muted sm">{i.action === "ask" ? "not stated" : `read "${i.source?.text ?? show(i.field!, i.value)}" · ${Math.round((i.confidence ?? 0) * 100)}% < ${Math.round((i.threshold ?? 0) * 100)}%`}</span>
                    {i.resolved ? <div className="sm teal">{i.resolved.wasCorrect ? "Confirmed" : `Corrected to ${show(i.field!, i.resolved.value)}`} by {i.resolved.by}</div> : (
                      <div className="row sp">
                        {i.action === "confirm" && <button type="button" className="btn sm" onClick={() => resolve(i, i.value)}>Confirm {show(i.field!, i.value)}</button>}
                        <input className="inp" value={edit[i.id!] ?? ""} onChange={(e) => setEdit({ ...edit, [i.id!]: e.target.value })} placeholder={i.action === "ask" ? "Value from the carrier" : "Correct value"} aria-label={`Correct ${i.field}`} />
                        <button type="button" className="btn ghost sm" disabled={!edit[i.id!]?.trim()} onClick={() => resolve(i, parseValue(i.field!, edit[i.id!]!))}>{i.action === "ask" ? "Record" : "Correct"}</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
          {r.costLines && (
            <Card className="sp" title="Normalised" sub={`3.2 · ${r.costLines.lines.length} lines mapped to the charge dictionary, in ${r.costLines.currency}`} right={<b className="num">{usd(r.costLines.allIn)}</b>}>
              {r.costLines.lines.map((l, k) => (
                <div key={k} className="lrow">
                  <span className="chip">{l.code ?? "?"}</span>
                  <div className="min0"><b>{l.raw.name}</b> <span className="muted sm">→ {l.name} · {l.category} · {l.basis.replace(/_/g, " ")} × {Math.round(l.units * 100) / 100}</span>{l.review && <div className="sm red">{l.review}</div>}</div>
                  <span className={`num sm${l.included ? "" : " muted strike"}`}>{usd(l.total)}</span>
                </div>
              ))}
              <div className="pad">{Object.entries(r.costLines.byCategory).filter(([, v]) => v).map(([k, v]) => <HBar key={k} label={k} v={v} max={r.costLines!.allIn} right={usd(v)} />)}</div>
            </Card>
          )}
        </>
      )}

      {accuracy.length > 0 && (
        <Card className="sp" title="Accuracy by carrier and format" sub="4.3.5 · from every confirmation and correction. Below 80%, the format is flagged for a template.">
          {accuracy.map((a) => (
            <div key={a.carrierOrgId + a.format} className="lrow">
              <div className="min0"><b>{orgName(a.carrierOrgId)}</b> <span className="muted sm">{a.format} · {a.labels} labels</span><Meter v={a.accuracy * 100} tone={a.needsTemplate ? "over" : undefined} /></div>
              <span className="num sm">{Math.round(a.accuracy * 100)}%</span>
              {a.needsTemplate && <Pill tone="bad">needs template</Pill>}
            </div>
          ))}
        </Card>
      )}
    </DeskOnly>
  );
}

const parseValue = (field: string, s: string): unknown => (["rate", "transitDays"].includes(field) && !Number.isNaN(Number(s.replace(/,/g, ""))) ? Number(s.replace(/,/g, "")) : s.trim());

/** Carriers on this desk's panel, for recording a reply that arrived by chat or phone. */
function deskCarriers(deskOrgId: string): string[] {
  const lens = LENS_KEYS.find((k) => LENSES[k].actor.orgId === deskOrgId) ?? DEFAULT_LENS.fwd;
  return [...new Set(viewFor(lens).lanes.map((l) => l.carrierOrgId))];
}

// ── Audit ────────────────────────────────────────────────────────────────────

const KIND_ICON: Record<string, string> = { user: "Person", rule: "Rule", model: "Model", system: "System" };

export function AuditView() {
  const lens = useStore((s) => s.lens);
  const actor = LENSES[lens].actor;
  const open = useStore((s) => s.open);
  const recs = useRead((ws) => ws.auditFor(actor), [lens], [] as AuditRecord[]);
  const [proc, setProc] = useState("all");
  const shown = [...recs].reverse().filter((r) => proc === "all" || (r.process ?? "").startsWith(proc) || (proc === "denied" && r.outcome === "denied"));
  return (
    <DeskOnly>
      <Head title="Audit trail" sub="12.3 · append-only. Who or what acted, on which record, with which rule set or model version. Corrections point at the decision they overrode." />
      <div className="row sp">
        {[["all", "Everything"], ["1.1", "1.1 Intake"], ["4.2", "4.2 Replies"], ["4.3", "4.3 Review"], ["denied", "Refusals"]].map(([k, l]) => (
          <button key={k} type="button" className={`chip${proc === k ? " on" : ""}`} aria-pressed={proc === k} onClick={() => setProc(k!)}>{l}</button>
        ))}
      </div>
      {!recs.length ? (
        <Card className="sp" pad title="Nothing yet">
          <p className="muted">Deliver an email in the Inbox or read a reply in the Reply lab, and each step lands here.</p>
          <div className="row sp"><button type="button" className="btn sm" onClick={() => open("inbox")}>Open the Inbox</button><button type="button" className="btn ghost sm" onClick={() => open("replies")}>Open the Reply lab</button></div>
        </Card>
      ) : (
        <Card className="sp">
          {shown.map((r) => (
            <div key={r.id} className="lrow audit">
              <span className={`akind k-${r.actor.kind}`}>{KIND_ICON[r.actor.kind]}</span>
              <div className="min0">
                <b>{r.action}</b> <span className="muted sm">{r.entityType} {r.entityId}{r.process ? ` · ${r.process}` : ""}</span>
                <div className="muted sm ellip">{r.actor.id}{r.actor.version ? `@${r.actor.version}` : ""}{r.modelVersion && r.modelVersion !== r.actor.version ? ` · ${r.modelVersion}` : ""}{r.ruleVersions?.length ? ` · ${r.ruleVersions.join(", ")}` : ""}</div>
                {r.override && <div className="sm">Override: “{r.override.reason}”</div>}
                {r.outcome === "applied" && (r.output as { from?: string; to?: string })?.to && <div className="sm teal">{(r.output as { from: string }).from} → {(r.output as { to: string }).to}</div>}
              </div>
              <Pill tone={r.outcome === "applied" ? "ok" : r.outcome === "denied" ? "bad" : "warn"}>{r.outcome}</Pill>
              <span className="num muted sm w48">{new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
          ))}
        </Card>
      )}
    </DeskOnly>
  );
}

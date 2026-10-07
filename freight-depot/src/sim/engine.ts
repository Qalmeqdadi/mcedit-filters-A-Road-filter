// Rules for the carrier module: capacity maths, cut-offs, feasibility (4.4) and the sim tick.
import { COMMODITIES, DESKS, DG_INCOMPATIBLE, LANES, LANE_ORDER, TRAILERS, alloc, nextId } from "./data";
import type { Check, Departure, Feed, FeedStatus, Hold, LaneId, LogEvent, Rfq } from "./types";

export const CUTOFF = { gateIn: 45, docs: 60, dgDocs: 120 };

export const effDepart = (d: Departure) => d.departsAt + d.delayMin;
export const gateInCutoff = (d: Departure) => effDepart(d) - CUTOFF.gateIn;

export const liveHolds = (d: Departure) => d.holds.filter((x) => x.state === "live");
export const bookedPallets = (d: Departure) => d.bookings.reduce((s, b) => s + b.pallets, 0);
export const heldPallets = (d: Departure) => liveHolds(d).reduce((s, b) => s + b.pallets, 0);
export const freePallets = (d: Departure) => Math.max(0, d.slots - bookedPallets(d) - heldPallets(d));
export const usedKg = (d: Departure) =>
  d.bookings.reduce((s, b) => s + b.weightKg, 0) + liveHolds(d).reduce((s, b) => s + b.weightKg, 0);

export const dgOnBoard = (d: Departure) =>
  [...d.bookings, ...liveHolds(d)].map((a) => a.dgClass).filter((c): c is string => !!c);

export const isSellable = (d: Departure, now: number) =>
  (d.status === "open" || d.status === "planned" || d.status === "inbound") && !d.stopSell && now < gateInCutoff(d);

export function feedStatus(f: Feed, now: number): FeedStatus {
  const age = now - f.lastUpdate;
  if (age <= f.cadenceMin * 1.25) return "fresh";
  if (age <= f.cadenceMin * 3) return "lagging";
  return "stale";
}

/** 4.4 test feasibility: pure rules, every rejection carries its reason. */
export function feasibility(rfq: Rfq, d: Departure, now: number): Check[] {
  const lane = LANES[d.lane];
  const free = freePallets(d);
  const kgLeft = d.payloadKg - usedKg(d);
  const checks: Check[] = [];
  checks.push({
    id: "open", address: "2.4.3", label: "Departure open for sale",
    ok: isSellable(d, now),
    detail: d.stopSell ? "Stop-sell is on" : now >= gateInCutoff(d) ? "Gate-in cut-off has passed" : "Accepting holds",
  });
  checks.push({
    id: "fit", address: "4.4.1", label: "Physical fit",
    ok: rfq.pallets <= free, detail: `${rfq.pallets} pallets requested, ${free} of ${d.slots} slots free`,
  });
  checks.push({
    id: "weight", address: "4.4.2", label: "Payload",
    ok: rfq.weightKg <= kgLeft,
    detail: `${(rfq.weightKg / 1000).toFixed(1)} t requested, ${(kgLeft / 1000).toFixed(1)} t left of ${(d.payloadKg / 1000).toFixed(1)} t`,
  });
  if (rfq.dgClass) {
    const clash = dgOnBoard(d).find((c) => DG_INCOMPATIBLE.some(([a, b]) => (a === c && b === rfq.dgClass) || (b === c && a === rfq.dgClass)));
    const laneBan = lane.id === "MCT" && rfq.dgClass.startsWith("1");
    checks.push({
      id: "dg", address: "4.4.3", label: `Dangerous goods class ${rfq.dgClass}`,
      ok: d.dgAllowed && !clash && !laneBan,
      detail: !d.dgAllowed ? "Reefer trailers carry no DG on this network"
        : clash ? `Class ${clash} already on board, must be segregated from ${rfq.dgClass}`
        : laneBan ? "Hatta crossing bans class 1" : `${rfq.un} accepted, no segregation conflict`,
    });
  }
  if (rfq.tempRange) {
    const [lo, hi] = rfq.tempRange;
    const ok = d.trailer === "reefer" && !!d.tempRange && d.tempRange[0] <= lo && d.tempRange[1] >= hi;
    checks.push({
      id: "temp", address: "4.4.4", label: `Temperature ${lo} to ${hi} °C`,
      ok, detail: d.trailer !== "reefer" ? "Ambient trailer" : ok ? `Reefer set ${d.tempRange![0]} to ${d.tempRange![1]} °C` : `Reefer set ${d.tempRange![0]} to ${d.tempRange![1]} °C`,
    });
  }
  const arrive = effDepart(d) + lane.transitH * 60;
  checks.push({
    id: "ready", address: "4.4.5", label: "Cargo ready before gate-in",
    ok: rfq.readyAt <= gateInCutoff(d), detail: `Ready ${clock(rfq.readyAt)}, gate-in closes ${clock(gateInCutoff(d))}`,
  });
  checks.push({
    id: "arrive", address: "4.4.5", label: "Arrives before the deadline",
    ok: arrive <= rfq.deliverBy, detail: `ETA ${dayClock(arrive)}, needed by ${dayClock(rfq.deliverBy)}`,
  });
  return checks;
}

export const feasible = (checks: Check[]) => checks.every((c) => c.ok);

/** Estimated chance the desk picks this reply, from the anonymised lane benchmark (11.2). */
export function winChance(rfq: Rfq, rate: number) {
  const ratio = rate / LANES[rfq.lane].benchmark;
  let p = 1 / (1 + Math.exp(11 * (ratio - 1.03)));
  if (rfq.targetRate && rate <= rfq.targetRate) p += 0.08;
  return Math.min(0.95, Math.max(0.04, p));
}

export const suggestedRate = (rfq: Rfq) => {
  const b = LANES[rfq.lane].benchmark;
  const premium = rfq.dgClass ? 1.12 : rfq.tempRange ? 1.08 : 1;
  return Math.round((b * premium * 0.99) / 5) * 5;
};

// ---------- time formatting ----------
const pad = (n: number) => String(n).padStart(2, "0");
export const clock = (t: number) => `${pad(Math.floor(((t % 1440) + 1440) % 1440 / 60))}:${pad(((Math.floor(t) % 60) + 60) % 60)}`;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const dayLabel = (t: number) => {
  const day = Math.floor(t / 1440);
  return `${DAYS[day % 7]} ${4 + day} Oct`;
};
export const dayClock = (t: number) => `${dayLabel(t).split(" ")[0]} ${clock(t)}`;
export const until = (t: number, now: number) => {
  const m = Math.round(t - now);
  if (m <= 0) return "now";
  if (m < 60) return `${m} min`;
  const hh = Math.floor(m / 60);
  return m % 60 && hh < 10 ? `${hh} h ${m % 60} min` : `${hh} h`;
};

// ---------- world ----------
export interface World {
  now: number;
  departures: Departure[];
  rfqs: Rfq[];
  feeds: Feed[];
  events: LogEvent[];
  nextRfqAt: number;
  nextAllotmentAt: number;
  rngSeed: number;
}

function rand(w: World) {
  // mulberry32, so a run is repeatable from the same seed
  let t = (w.rngSeed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(w: World, xs: T[]) => xs[Math.floor(rand(w) * xs.length)];
const between = (w: World, lo: number, hi: number) => Math.round(lo + rand(w) * (hi - lo));

export function log(w: World, kind: LogEvent["kind"], address: string, text: string) {
  w.events.unshift({ id: nextId("EV"), t: w.now, kind, address, text });
  if (w.events.length > 80) w.events.length = 80;
}

export const depLabel = (d: Departure) => `${d.dock ? `D${d.dock} ` : ""}${d.lane} ${clock(effDepart(d))}`;

function releaseHold(w: World, d: Departure, hld: Hold, state: "released" | "expired", why: string) {
  hld.state = state;
  log(w, "hold", "2.4.2", `${hld.ref} ${state === "expired" ? "expired" : "released"} on ${depLabel(d)}: ${hld.pallets} slots back on sale. ${why}`);
}

function convertHold(w: World, d: Departure, hld: Hold) {
  hld.state = "converted";
  const ref = nextId("BKG");
  d.bookings.push({ ...hld, id: nextId("AL"), ref });
  log(w, "booking", "2.4.2", `${hld.ref} converted to booking ${ref}: ${hld.pallets} pallets ${hld.commodity} on ${depLabel(d)}`);
}

export function tick(w: World, dt: number) {
  w.now += dt;
  const now = w.now;

  for (const d of w.departures) {
    // trailer reaches its dock
    if (d.status === "inbound" && d.positionedAt !== undefined && now >= d.positionedAt) {
      d.status = "open";
      log(w, "departure", "5.2.1", `Trailer positioned at D${d.dock} for ${LANES[d.lane].city}, departs ${dayClock(effDepart(d))}`);
    }
    // gate-in cut-off: live holds lapse, departure closes for sale
    if ((d.status === "open" || d.status === "planned") && now >= gateInCutoff(d) && d.dock) {
      for (const hld of liveHolds(d)) releaseHold(w, d, hld, "expired", "Gate-in cut-off reached.");
      d.status = "closed";
      log(w, "departure", "5.3.1", `Gate-in closed for ${depLabel(d)}: ${bookedPallets(d)}/${d.slots} pallets loading`);
    }
    // hold expiry
    for (const hld of liveHolds(d)) {
      if (now >= hld.expiresAt) releaseHold(w, d, hld, "expired", "Quote validity ran out.");
    }
    // departure
    if (d.status === "closed" && now >= effDepart(d)) {
      d.status = "departed";
      d.departedAt = now;
      const lf = Math.round((bookedPallets(d) / d.slots) * 100);
      log(w, "departure", "7.1.1", `${depLabel(d)} gated out for ${LANES[d.lane].city}: ${bookedPallets(d)}/${d.slots} pallets, ${(usedKg(d) / 1000).toFixed(1)} t, load factor ${lf}%`);
      rollLane(w, d);
    }
  }
  // keep finished departures for a while for the board, then drop them
  w.departures = w.departures.filter((d) => d.status !== "departed" || now - (d.departedAt ?? now) < 90);

  // RFQ lifecycle
  for (const r of w.rfqs) {
    if (r.state === "new" && now >= r.replyBy) {
      r.state = "expired";
      log(w, "rfq", "4.1.5", `${r.id} from ${r.desk} missed its reply deadline. The desk dropped us from this request.`);
    }
    if (r.state === "replied" && r.reply && now >= r.reply.decisionAt) decide(w, r);
  }
  w.rfqs = w.rfqs.filter((r) => r.state === "new" || r.state === "replied" || now - r.receivedAt < 240);

  if (now >= w.nextRfqAt) {
    spawnRfq(w);
    w.nextRfqAt = now + between(w, 16, 34);
  }
  if (now >= w.nextAllotmentAt) {
    allotmentCall(w);
    w.nextAllotmentAt = now + between(w, 30, 55);
  }

  // supply health (2.5)
  for (const f of w.feeds) {
    const before = feedStatus(f, now - dt);
    if ((!f.failing || f.fallback) && now - f.lastUpdate >= f.cadenceMin) f.lastUpdate = now;
    if (f.id === "F2" && !f.failing && !f.fallback && now >= 6 * 60 + 25 && now < 6 * 60 + 25 + dt + 0.001) f.failing = true;
    const after = feedStatus(f, now);
    if (after === "stale" && before !== "stale") {
      log(w, "feed", "2.5.1", `${f.name} feed (${f.channel}) is stale: last update ${Math.round(now - f.lastUpdate)} min ago`);
    }
  }
}

function decide(w: World, r: Rfq) {
  const rep = r.reply!;
  const d = w.departures.find((x) => x.id === rep.departureId);
  const hld = d?.holds.find((x) => x.id === rep.holdId);
  if (!d || !hld || hld.state !== "live") {
    r.state = "lost";
    r.outcome = "Hold lapsed before the desk confirmed";
    return;
  }
  if (rand(w) < rep.winChance) {
    r.state = "won";
    r.outcome = `Won at AED ${rep.ratePerPallet}/pallet`;
    log(w, "rfq", "4.8.1", `${r.desk} accepted ${r.id}. Customer quote approved.`);
    convertHold(w, d, hld);
  } else {
    r.state = "lost";
    const gap = Math.round(between(w, 4, 14));
    r.outcome = `Lost on price: winning offer about ${gap}% lower`;
    log(w, "rfq", "4.8.4", `${r.desk} chose another carrier for ${r.id}. Recorded reason: price, gap about ${gap}%.`);
    releaseHold(w, d, hld, "released", "Desk chose another option.");
  }
}

function rollLane(w: World, gone: Departure) {
  // the planned departure on this lane takes the dock; plan another one a day later
  const next = w.departures
    .filter((d) => d.lane === gone.lane && d.status === "planned")
    .sort((a, b) => a.departsAt - b.departsAt)[0];
  if (next) {
    next.dock = gone.dock;
    next.status = "inbound";
    next.positionedAt = w.now + 18;
  }
  const base = next ?? gone;
  const t = TRAILERS[base.trailer];
  const departsAt = base.departsAt + 1440;
  w.departures.push({
    ...base,
    id: `DEP-${base.lane}-${clock(departsAt).replace(":", "")}-${Math.floor(departsAt / 1440) + 4}`,
    dock: null, status: "planned", departsAt, delayMin: 0, delayReason: undefined, positionedAt: undefined, departedAt: undefined,
    stopSell: false, slots: t.slots, payloadKg: t.payloadKg, holds: [],
    bookings: [alloc(pick(w, DESKS), between(w, 3, 8), base.trailer === "reefer" ? "Fresh dairy" : pick(w, ["Ceramic tiles", "Garments", "Auto spare parts", "Packaged snacks"]), LANES[base.lane].benchmark)],
  });
}

function allotmentCall(w: World) {
  // 2.3.3 contracted allotments: desks call off space without an RFQ
  const open = w.departures.filter((d) => isSellable(d, w.now) && d.dock && freePallets(d) >= 3);
  if (!open.length) return;
  const d = pick(w, open);
  const options = COMMODITIES.filter((c) => (d.trailer === "reefer" ? !!c.tempRange && c.tempRange[0] >= 0 : !c.tempRange && !c.dgClass));
  const c = pick(w, options);
  const n = Math.min(freePallets(d) - 1, between(w, 2, 5));
  if (n < 1 || usedKg(d) + n * c.kgPerPallet > d.payloadKg) return;
  const a = alloc(pick(w, DESKS), n, c.name, LANES[d.lane].benchmark);
  d.bookings.push(a);
  log(w, "booking", "2.3.3", `Allotment call-off ${a.ref} from ${a.desk}: ${n} pallets ${c.name} on ${depLabel(d)}`);
}

function spawnRfq(w: World) {
  if (w.rfqs.filter((r) => r.state === "new").length >= 5) return;
  const lane: LaneId = pick(w, LANE_ORDER);
  const deps = w.departures.filter((d) => d.lane === lane && isSellable(d, w.now)).sort((a, b) => effDepart(a) - effDepart(b));
  const target = deps[0];
  const reefer = target?.trailer === "reefer";
  const pool = COMMODITIES.filter((c) => (reefer ? !!c.tempRange : true));
  const c = pick(w, pool);
  const pallets = between(w, 2, 9);
  const gate = target ? gateInCutoff(target) : w.now + 300;
  const r: Rfq = {
    id: nextId("RFQ"),
    desk: pick(w, DESKS),
    channel: pick(w, ["API", "Email", "Portal", "EDI"] as const),
    lane,
    receivedAt: w.now,
    replyBy: Math.min(gate - 10, w.now + between(w, 30, 70)),
    readyAt: Math.min(gate - 15, w.now + between(w, 40, 160)),
    deliverBy: (target ? effDepart(target) : w.now + 300) + LANES[lane].transitH * 60 + between(w, 120, 900),
    pallets,
    weightKg: Math.round(pallets * c.kgPerPallet * (0.9 + rand(w) * 0.2)),
    commodity: c.name, hs: c.hs, dgClass: c.dgClass, un: c.un, tempRange: c.tempRange,
    targetRate: rand(w) < 0.5 ? Math.round(LANES[lane].benchmark * (0.94 + rand(w) * 0.08)) : undefined,
    state: "new",
  };
  if (r.replyBy <= w.now + 8) r.replyBy = w.now + 25;
  w.rfqs.unshift(r);
  log(w, "rfq", "4.1.3", `${r.id} from ${r.desk} via ${r.channel}: ${pallets} pallets ${c.name} to ${LANES[lane].city}, reply by ${clock(r.replyBy)}`);
}

// ---------- carrier actions ----------
export function replyToRfq(w: World, rfqId: string, departureId: string, rate: number, validityMin: number) {
  const r = w.rfqs.find((x) => x.id === rfqId);
  const d = w.departures.find((x) => x.id === departureId);
  if (!r || !d || r.state !== "new") return;
  const c = COMMODITIES.find((x) => x.name === r.commodity);
  const hld: Hold = {
    id: nextId("AL"), ref: nextId("HLD"), desk: r.desk, pallets: r.pallets, weightKg: r.weightKg, commodity: r.commodity,
    dgClass: c?.dgClass, ratePerPallet: rate, rfqId: r.id, createdAt: w.now,
    expiresAt: Math.min(w.now + validityMin, gateInCutoff(d)), state: "live",
  };
  d.holds.push(hld);
  const chance = winChance(r, rate);
  r.state = "replied";
  r.reply = { departureId: d.id, ratePerPallet: rate, holdId: hld.id, winChance: chance, decisionAt: w.now + between(w, 8, 26) };
  log(w, "rfq", "4.2.1", `Replied to ${r.id}: AED ${rate}/pallet on ${depLabel(d)}, valid to ${clock(hld.expiresAt)}`);
  log(w, "hold", "2.4.1", `Soft hold ${hld.ref}: ${r.pallets} slots on ${depLabel(d)} until ${clock(hld.expiresAt)}`);
}

export function declineRfq(w: World, rfqId: string, reason: string) {
  const r = w.rfqs.find((x) => x.id === rfqId);
  if (!r || r.state !== "new") return;
  r.state = "declined";
  r.outcome = reason;
  log(w, "rfq", "4.2.4", `Declined ${r.id} for ${r.desk}: ${reason}`);
}

export function releaseHoldById(w: World, depId: string, holdId: string) {
  const d = w.departures.find((x) => x.id === depId);
  const hld = d?.holds.find((x) => x.id === holdId);
  if (d && hld && hld.state === "live") releaseHold(w, d, hld, "released", "Released by the carrier.");
}

export function extendHold(w: World, depId: string, holdId: string, mins: number) {
  const d = w.departures.find((x) => x.id === depId);
  const hld = d?.holds.find((x) => x.id === holdId);
  if (!d || !hld || hld.state !== "live") return;
  hld.expiresAt = Math.min(hld.expiresAt + mins, gateInCutoff(d));
  log(w, "hold", "2.4.1", `${hld.ref} extended to ${clock(hld.expiresAt)}`);
}

export function delayDeparture(w: World, depId: string, mins: number, reason: string) {
  const d = w.departures.find((x) => x.id === depId);
  if (!d || d.status === "departed") return;
  d.delayMin += mins;
  d.delayReason = reason;
  if (d.status === "closed" && w.now < gateInCutoff(d)) d.status = "open";
  const desks = new Set([...d.bookings, ...liveHolds(d)].map((a) => a.desk)).size;
  log(w, "service", "2.2.3", `${d.lane} ${clock(d.departsAt)} delayed ${mins} min (${reason}). New departure ${clock(effDepart(d))}`);
  log(w, "service", "7.5.2", `Proactive warning sent to ${desks} desk${desks === 1 ? "" : "s"} with cargo on this departure`);
}

export function toggleStopSell(w: World, depId: string) {
  const d = w.departures.find((x) => x.id === depId);
  if (!d) return;
  d.stopSell = !d.stopSell;
  log(w, "departure", "2.4.3", `${d.stopSell ? "Stop-sell on" : "Back on sale"}: ${depLabel(d)}`);
}

export function fallbackFeed(w: World, feedId: string) {
  const f = w.feeds.find((x) => x.id === feedId);
  if (!f) return;
  f.fallback = true;
  f.lastUpdate = w.now;
  log(w, "feed", "2.5.2", `${f.name} switched to portal fallback. Capacity re-read from the carrier portal.`);
}

export function restoreFeed(w: World, feedId: string) {
  const f = w.feeds.find((x) => x.id === feedId);
  if (!f) return;
  f.failing = false;
  f.fallback = false;
  f.lastUpdate = w.now;
  log(w, "feed", "2.5.1", `${f.name} ${f.channel} feed restored`);
}

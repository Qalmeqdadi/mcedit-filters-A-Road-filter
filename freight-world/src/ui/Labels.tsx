// Labels that float over the world. Each one is plain DOM, positioned every frame by the scene.
import { useEffect, type ReactNode } from "react";
import * as THREE from "three";
import { BOXES, C, CARRIERS, SAILINGS, SCORE_EXTRA, usd } from "../data";
import { labelEls, targets } from "../scene/anchors";
import { BERTHS, PLACES, SITES } from "../scene/geo";
import { ranked, selectedCarrier, useStore, type View } from "../store";

interface Spec {
  id: string;
  /** a registered target id, or a fixed world position */
  at: string | [number, number, number];
  lift?: number;
  kind?: "place" | "chip" | "alert" | "big";
  tone?: string;
  onClick?: () => void;
  children: ReactNode;
}

const Y = 1.3;
const site = (k: keyof typeof SITES, y: number): [number, number, number] => [SITES[k].p[0], y, SITES[k].p[1]];

const CLOSE: View[] = ["setup", "trust", "sh_home", "sh_docs", "p_jobs"];

function useSpecs(): Spec[] {
  const st = useStore();
  const { view, step } = st;
  const out: Spec[] = [];
  const flowAt = (n: number) => view === "flow" && step === n;
  const nearDubai = CLOSE.includes(view) || flowAt(5);
  const atShanghai = view === "carriers" || (view === "flow" && step >= 2 && step <= 4);
  const atOL = view.startsWith("c_");

  // place names on the wide views
  if (!nearDubai && !atShanghai && !atOL && !flowAt(1) && view !== "opt") {
    for (const [k, p] of Object.entries(PLACES)) {
      if ((k === "DMM" || k === "RUH") && view !== "multi") continue;
      if (k === "SHA" && (view === "dash" || view === "analytics" || view === "ship" || view === "net" || flowAt(6))) continue;
      out.push({ id: `place:${k}`, at: [p.p[0], Y, p.p[1]], kind: "place", children: p.n });
    }
  }

  // party buildings
  if (nearDubai) {
    out.push({ id: "site:desk", at: site("desk", 17), kind: "chip", tone: "signal", onClick: () => st.open("dash"), children: <><b>Gulfway Logistics</b><span>Forwarder desk</span></> });
    out.push({ id: "site:noor", at: site("noor", 6), kind: "chip", tone: "teal", onClick: () => st.open("sh_home"), children: <><b>Al Noor warehouse</b><span>Shipper</span></> });
    out.push({ id: "site:customs", at: site("customs", 7), kind: "chip", tone: "purple", onClick: () => st.open("p_jobs"), children: <><b>Al Safa Customs</b><span>{view === "p_jobs" ? `${3 - Object.keys(st.jobs).length} jobs waiting` : "Partner"}</span></> });
    out.push({ id: "site:bank", at: site("bank", 6), kind: "chip", children: <><b>Bank</b><span>Escrow</span></> });
  } else if (view === "dash" || view === "analytics" || view === "ship" || view === "net" || flowAt(6)) {
    out.push({ id: "site:desk", at: site("desk", 17), kind: "chip", tone: "signal", children: <><b>Gulfway desk</b><span>Jebel Ali</span></> });
    out.push({ id: "site:sha", at: [117, 6, -36], kind: "chip", children: <><b>Shanghai quay</b><span>6 carriers</span></> });
  }

  // the Shanghai quay
  if (atShanghai) {
    const list = ranked(st);
    const sel = selectedCarrier(st);
    for (const [i, c] of CARRIERS.entries()) {
      const got = st.rfqGot.includes(c.id);
      let body: ReactNode;
      let tone = "";
      if (view === "carriers") body = <><b>{c.id} · {c.rel}% on time</b><span>{SCORE_EXTRA[c.id][2]} median reply</span></>;
      else if (step === 2) {
        body = got ? <><b>{c.id} · {usd(c.price)}</b><span>{c.eq} · {c.reply} min</span></> : <><b>{c.id}</b><span>Waiting…</span></>;
        tone = got ? "teal" : "";
      } else if (step === 3) {
        const flagged = ["OL", "MC", "BH"].includes(c.id);
        body = <><b>{c.id} · {usd(c.price)}</b><span>{flagged ? (c.id === "BH" ? "Voice note to check" : "Read · hover fields") : "Read, no issues"}</span></>;
        tone = flagged ? "signal" : "teal";
      } else {
        const r = list.findIndex((x) => x.id === c.id);
        body = c.fit ? <><b>#{r + 1} {c.id} · {list[r].score}</b><span>{usd(c.price)} · {c.days} d</span></> : <><b>{c.id} · ruled out</b><span>{c.reason?.split(" ").slice(0, 4).join(" ")}…</span></>;
        tone = !c.fit ? "red" : c.id === sel.id ? "signal" : "";
      }
      out.push({ id: `berth:${c.id}`, at: [BERTHS[c.id][0], 5 + (i % 2) * 4, BERTHS[c.id][1]], kind: "chip", tone, onClick: () => (step === 4 && c.fit ? st.set({ selected: c.id }) : step === 3 && ["OL", "MC", "BH"].includes(c.id) ? st.set({ src: c.id }) : undefined), children: body });
    }
  }

  // Oceanlink's own vessels
  if (atOL) {
    out.push({ id: "site:ol", at: site("olTerm", 7), kind: "chip", tone: "blue", children: <><b>Oceanlink terminal</b><span>Lin Wei's desk</span></> });
    for (const s of SAILINGS) out.push({ id: `ol:${s.k}`, at: `ol:${s.k}`, lift: 5, kind: "chip", tone: st.cSailing === s.k && view === "c_home" ? "signal" : "", children: <><b>{s.v.replace("OL ", "")}</b><span>{st.cap[s.k]} TEU free · {s.date}</span></> });
  }

  // step 1: the fit bay
  if (flowAt(1)) {
    const [x, z] = SITES.fitBay.p;
    BOXES.forEach((b, i) => {
      out.push({ id: `fit:${b.key}`, at: [x - 10 + b.lenM / 2, 5, z - 6 + i * 6], kind: "chip", tone: st.filled ? (b.ok ? "teal" : "red") : "", children: <><b>{b.name}</b><span>{st.filled ? (b.ok ? `Fits · ${b.cols * 2} spots` : `${18 - b.cols * 2} pallets left over`) : "Waiting for the request"}</span></> });
    });
    out.push({ id: "site:noorfar", at: site("noor", 6), kind: "chip", tone: "teal", children: <><b>Al Noor</b><span>Sara's email</span></> });
  }
  if (view === "opt") {
    const [x, z] = SITES.fitBay.p;
    out.push({ id: "fit:plan", at: [x - 4, 5.5, z], kind: "chip", tone: st.aiPlan ? "teal" : "red", onClick: () => st.set({ aiPlan: !st.aiPlan }), children: <><b>40' HC · {st.aiPlan ? "AI plan" : "Standard plan"}</b><span>{st.aiPlan ? "32 of 32 pallets" : "20 of 32 pallets, 12 left over"}</span></> });
  }

  // the booked voyage
  if (st.approved && (flowAt(6) || view === "sh_home")) {
    const c = selectedCarrier(st);
    out.push({ id: "voyage", at: "voyage", lift: 5, kind: "big", tone: "signal", children: <><b>{c.name} · SHP-2301</b><span>Al Noor's 18 pallets · ETA {C(c.id).days} days</span></> });
  }

  // exceptions
  if (view === "ship") {
    if (!st.alerts.a1) out.push({ id: "alert:a1", at: "ship:SHP-2291", lift: 5, kind: "alert", tone: "signal", onClick: () => st.set({ shipTab: "track" }), children: <><b>SHP-2291 · delay risk</b><span>Port Klang congestion</span></> });
    if (!st.alerts.a2) out.push({ id: "alert:a2", at: "ship:SHP-2284", lift: 5, kind: "alert", tone: "red", onClick: () => st.set({ shipTab: "track" }), children: <><b>SHP-2284 · document missing</b><span>Certificate of origin</span></> });
    out.push({ id: "ship:2301", at: "ship:SHP-2301", lift: 5, kind: "chip", tone: "teal", children: <><b>SHP-2301</b><span>Al Noor · sailed</span></> });
  }
  if (view === "sh_home" && !st.approved) out.push({ id: "ship:2301", at: "ship:SHP-2301", lift: 5, kind: "chip", tone: "teal", children: <><b>SHP-2301</b><span>On time · ETA 14 Oct</span></> });

  if (view === "multi") {
    out.push({ id: "mm:train", at: "train", lift: 3, kind: "chip", tone: "purple", children: <><b>Block train</b><span>38 wagons free</span></> });
    out.push({ id: "mm:plane", at: "plane", lift: 3, kind: "chip", tone: "teal", children: <><b>FC 882</b><span>6,800 kg free</span></> });
    out.push({ id: "mm:feeder", at: "feeder", lift: 4, kind: "chip", children: <><b>Gulf feeder</b><span>96 TEU free</span></> });
    out.push({ id: "mm:truck", at: "truck:ruh", lift: 3, kind: "chip", children: <><b>Truck pool</b><span>42 trucks free</span></> });
  }
  if (view === "opt") {
    out.push({ id: "risk:typhoon", at: [110, 6, -6], kind: "alert", tone: "signal", children: <><b>Typhoon season</b><span>Sailings may slip 1–2 days</span></> });
    out.push({ id: "risk:pkg", at: [PLACES.PKG.p[0], 4, PLACES.PKG.p[1]], kind: "alert", tone: "signal", children: <><b>Port Klang</b><span>2.1 day yard wait</span></> });
  }
  if (view === "trust") out.push({ id: "ledger", at: [-66, 31, -12], kind: "big", tone: "signal", children: <><b>Shared ledger</b><span>{st.esc} of 6 records</span></> });
  if (view === "trust") out.push({ id: "site:olship", at: "jea:ship", lift: 5, kind: "chip", tone: "blue", children: <><b>Oceanlink</b><span>Carrier</span></> });

  return out;
}

function Label({ s }: { s: Spec }) {
  const fixed = Array.isArray(s.at) ? s.at.join(",") : null;
  const key = `L-${s.id}`;
  useEffect(() => {
    if (!fixed) return;
    const [x, y, z] = fixed.split(",").map(Number);
    targets.set(key, new THREE.Vector3(x, y, z));
    return () => {
      targets.delete(key);
    };
  }, [key, fixed]);
  const Tag = s.onClick ? "button" : "div";
  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        if (el) labelEls.set(s.id, el);
        else labelEls.delete(s.id);
      }}
      type={s.onClick ? "button" : undefined}
      onClick={s.onClick}
      data-target={fixed ? key : (s.at as string)}
      data-lift={s.lift ?? 0}
      className={`wl wl-${s.kind ?? "chip"}${s.tone ? " t-" + s.tone : ""}`}
      style={{ visibility: "hidden" }}
    >
      {s.children}
    </Tag>
  );
}

export function Labels() {
  const specs = useSpecs();
  return (
    <div className="wlabels" aria-hidden>
      {specs.map((s) => <Label key={s.id} s={s} />)}
    </div>
  );
}

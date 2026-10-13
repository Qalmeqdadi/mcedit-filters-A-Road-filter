"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as Slider from "@radix-ui/react-slider";
import * as Icons from "lucide-react";
import { BookOpen, CheckCircle2, Loader2, Lock, Play, Printer, RotateCcw, Send, ShieldAlert, ShieldCheck, Sparkles, Ban } from "lucide-react";
import { useApp } from "@/lib/store";
import { AREAS, TAG, TAGS, clockLabel, fmtTag } from "@/lib/sim/plant";
import { AGENT, AGENTS, ALLOWED_CAPABILITIES, APPROVAL_GATES, DATA_DOMAINS, PROHIBITED } from "@/lib/governance";
import { SCENARIOS } from "@/lib/scenarios";
import { DOCS, answerKnowledge, type KnowledgeAnswer } from "@/lib/knowledge";
import { ECONOMICS, fmtAedM, aedM } from "@/config/demo";
import equipmentJson from "@/data/equipment.json";
import energyJson from "@/data/energy.json";
import labJson from "@/data/lab-results.json";
import { Badge, Btn, Dot, Headline, Meter, Panel, SimTag, Sparkline, cn, toneColor } from "../ui";

const tip = { contentStyle: { background: "#04152D", border: "1px solid rgba(86,199,255,.3)", fontSize: 12 } };
const LOAD = (msgs: string[], ms = 700) => msgs.map((m, i) => ({ m, at: i * ms }));

function useStaged(msgs: string[], ms = 700) {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [i, setI] = useState(0);
  const run = () => {
    setState("running");
    setI(0);
    LOAD(msgs, ms).forEach((x, k) => setTimeout(() => setI(k), x.at));
    setTimeout(() => setState("done"), msgs.length * ms);
  };
  return { state, msg: msgs[i], run, reset: () => setState("idle") };
}

// ───────────────────────────────────────────────────────────── 02 Live Plant
export function LivePlant() {
  const tags = useApp((s) => s.tags);
  const areas = useApp((s) => s.areas);
  const sel = useApp((s) => s.selectedArea);
  const setArea = useApp((s) => s.setArea);
  const area = AREAS.find((a) => a.id === sel)!;
  const list = TAGS.filter((t) => t.area === sel);
  return (
    <div className="space-y-5">
      <Headline lead="Live" accent="Plant" sub="Synthetic process overview. Values refresh every 2.5 s from the deterministic simulator. Deviations are highlighted without turning the screen into an alarm wall." />
      <Panel className="overflow-x-auto">
        <div className="flex min-w-[900px] items-stretch gap-0">
          {AREAS.map((a, i) => {
            const st = areas[a.id];
            const c = toneColor[st.status];
            const active = a.id === sel;
            return (
              <div key={a.id} className="flex flex-1 items-center">
                <button onClick={() => setArea(a.id)} className={cn("flex-1 rounded-xl border p-3 text-left transition", active ? "bg-cyan-400/[0.07]" : "bg-ink-800/40 hover:bg-ink-800/80")} style={{ borderColor: active ? "#2FD6F5" : `${c}55` }}>
                  <div className="flex items-center justify-between"><span className="text-[12px] font-semibold">{a.short}</span><Dot tone={st.status} pulse={st.status !== "normal"} /></div>
                  <div className="mt-1 text-[16px] font-semibold tabular-nums">{fmtTag(a.throughputTag, tags[a.throughputTag].value)}</div>
                  <div className="text-[10.5px] text-fg-dim">health {st.health}</div>
                </button>
                {i < AREAS.length - 1 && (
                  <svg width="34" height="14" className="shrink-0"><line x1="2" y1="7" x2="32" y2="7" stroke="#2FD6F5" strokeOpacity=".6" strokeWidth="2" strokeDasharray="5 4" className="animate-dash-flow" /></svg>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel eyebrow={`Area · ${area.name}`} title={area.description} right={<SimTag>Live · simulated</SimTag>}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((t) => {
            const live = tags[t.id];
            const c = toneColor[live.status];
            const dev = live.deviationPct;
            return (
              <div key={t.id} className="rounded-xl border bg-ink-800/40 p-3" style={{ borderColor: live.status === "normal" ? "rgba(86,179,255,.14)" : `${c}66`, borderLeftWidth: 3, borderLeftColor: c }}>
                <div className="flex items-center justify-between"><span className="font-mono text-[10.5px] text-cyan-300">{t.id}</span>{live.status !== "normal" && <Badge tone={live.status}>{dev >= 0 ? "+" : ""}{dev.toFixed(1)}% vs model</Badge>}</div>
                <div className="text-[11.5px] text-fg-muted">{t.name}</div>
                <div className="mt-1 text-[22px] font-semibold tabular-nums" style={{ color: live.status === "normal" ? undefined : c }}>{fmtTag(t.id, live.value, false)} <span className="text-[12px] font-normal text-fg-muted">{t.unit}</span></div>
                <Sparkline data={live.history} color={live.status === "normal" ? "#2FD6F5" : c} height={44} window={150} />
                <div className="mt-1 flex justify-between text-[10px] text-fg-dim"><span>band {fmtTag(t.id, t.low, false)}–{fmtTag(t.id, t.high, false)}</span><span>24 h</span></div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── 05 Production Optimization
const OPT_INPUTS = [
  ["Feed flow", "64,650 Nm³/h", "64,900 Nm³/h"], ["Feed composition", "CH₄ 92.3 mol%", "unchanged"], ["Reformer load", "98.6 %", "99.4 %"], ["Steam/carbon ratio", "2.82", "2.78"],
  ["Compressor constraints", "C-201 92 % load", "C-201 ≤ 97 % after recovery"], ["Synthesis conversion", "per-pass 6.1 %", "6.4 %"], ["Recycle flow", "3,840 Nm³/h", "4,020 Nm³/h"], ["Distillation duty", "38.2 MW", "38.9 MW"],
  ["Product specification", "≥ 99.75 wt% (demo)", "≥ 99.75 wt%"], ["Energy price", `AED ${ECONOMICS.gasPriceAedPerGj}/GJ`, "—"], ["Production target", "2,550 t/day", "2,528 t/day achievable"],
];
export function ProductionOptimization() {
  const r = useStaged(["Loading current operating point…", "Checking operating envelope…", "Solving constrained optimisation (simulated)…", "Validating with HSE Agent…", "Preparing advisory envelope…"], 650);
  const gain = 78;
  const value = aedM(gain) - (gain * 28.4 * ECONOMICS.gasPriceAedPerGj) / 1e6 + (0.014 * 2450 * 28.4 * ECONOMICS.gasPriceAedPerGj) / 1e6;
  const chart = [
    { k: "Production t/d", cur: 2450, rec: 2528 },
    { k: "Recycle ×10 Nm³/h", cur: 384, rec: 402 },
    { k: "Energy GJ/t ×100", cur: 2840, rec: 2800 },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Headline lead="Production" accent="Optimization" sub="An AI-recommended operating envelope. It is advisory only: any change is made by operators through the DCS, under MOC where required." />
        <Btn id="run-opt" onClick={r.run} disabled={r.state === "running"}>{r.state === "running" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run optimization simulation</Btn>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Panel eyebrow="Inputs" title="Current operating point vs AI-recommended envelope">
          <table className="w-full text-[12.5px]">
            <thead className="text-left text-fg-dim"><tr><th className="pb-2">Variable</th><th className="pb-2">Current</th><th className="pb-2 text-cyan-300">AI envelope</th></tr></thead>
            <tbody>{OPT_INPUTS.map(([a, b, c]) => <tr key={a} className="border-t border-line"><td className="py-1.5 text-fg-muted">{a}</td><td className="tabular-nums">{b}</td><td className={cn("tabular-nums", r.state === "done" ? "text-cyan-300" : "text-fg-dim")}>{r.state === "done" ? c : "—"}</td></tr>)}</tbody>
          </table>
        </Panel>
        <Panel eyebrow="Result" title={r.state === "done" ? "Before / after (advisory)" : r.state === "running" ? r.msg : "Run the simulation to compute the envelope"} right={<SimTag>Illustrative</SimTag>}>
          {r.state === "running" && <div className="shimmer-text py-10 text-center text-[14px]">{r.msg}</div>}
          {r.state === "done" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="grid grid-cols-2 gap-3">
                {[["Throughput improvement", "+3.2%", "ok"], ["Potential production", `+${gain} t/day`, "ok"], ["Energy impact", "−1.4%", "ok"], ["Economic opportunity", `${fmtAedM(value)}/day`, "warn"]].map(([l, v, t]) => (
                  <div key={l} className="rounded-lg border border-line bg-ink-800/50 p-3"><div className="eyebrow">{l}</div><div className="text-[22px] font-bold" style={{ color: toneColor[t as "ok"] }}>{v}</div></div>
                ))}
              </div>
              <div className="mt-3 h-[150px]"><ResponsiveContainer><BarChart data={chart} margin={{ left: -10 }}><CartesianGrid vertical={false} /><XAxis dataKey="k" tickLine={false} /><YAxis hide /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="cur" name="Current" fill="#4C9BFF" radius={4} /><Bar dataKey="rec" name="Recommended" fill="#2FD6F5" radius={4} /></BarChart></ResponsiveContainer></div>
              <div className="mt-2 rounded-lg border border-warn/40 bg-warn/10 p-2 text-[11.5px] text-warn">Advisory only. The binding constraint is C-201 throughput, so the gain depends on closing INV-26-0412. Net of extra feed gas, at an assumed value per tonne.</div>
            </motion.div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── 06 Asset Health
const WF = ["Detect", "Diagnose", "Review history", "Check maintenance strategy", "Identify spare requirements", "Propose intervention", "Human approval"];
export function AssetHealth() {
  const [sel, setSel] = useState("C-201");
  const [step, setStep] = useState(-1);
  const [approved, setApproved] = useState(false);
  const log = useApp((s) => s.log);
  const scenarioId = useApp((s) => s.scenarioId);
  const eqs = equipmentJson.equipment.map((e) => (e.id === "C-201" && scenarioId === "B" ? { ...e, health: 62, risk: "High" } : e));
  const eq = eqs.find((e) => e.id === sel)!;
  const tone = (h: number) => (h < 75 ? "alert" : h < 85 ? "watch" : "normal");
  const runWf = () => { setApproved(false); setStep(0); WF.forEach((_, i) => setTimeout(() => setStep(i), i * 650)); };
  const trend = Array.from({ length: 30 }, (_, i) => ({ d: i - 29, h: eq.health + Math.round((29 - i) * (eq.health < 80 ? 0.55 : 0.08) + Math.sin(i) * 0.8) }));
  return (
    <div className="space-y-5">
      <Headline lead="Asset" accent="Health" sub="Condition, risk and AI prediction for critical equipment, with an agent workflow that ends in human approval." />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Panel eyebrow="Critical equipment" title="Health score (0–100)">
          <div className="space-y-2">
            {eqs.map((e) => (
              <button key={e.id} onClick={() => { setSel(e.id); setStep(-1); }} className={cn("flex w-full items-center gap-3 rounded-lg border p-2.5 text-left", sel === e.id ? "border-cyan-400/60 bg-cyan-400/5" : "border-line bg-ink-800/30 hover:bg-ink-800/60")}>
                <div className="grid h-10 w-10 place-items-center rounded-lg text-[14px] font-bold" style={{ color: toneColor[tone(e.health)], background: `${toneColor[tone(e.health)]}18` }}>{e.health}</div>
                <div className="flex-1"><div className="text-[12.5px] font-semibold">{e.id} · {e.name}</div><div className="text-[11px] text-fg-dim">{e.prediction}</div></div>
                <Badge tone={tone(e.health)}>{e.risk}</Badge>
              </button>
            ))}
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel eyebrow={`${eq.id} · ${eq.type}`} title={eq.name} right={<Badge tone={tone(eq.health)}>Risk: {eq.risk}</Badge>}>
            <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
              <div>
                <div className="text-[13px] text-fg">AI prediction: <b>{eq.prediction}</b></div>
                <div className="mt-1 text-[12px] text-fg-muted">{eq.outlook}</div>
                <div className="mt-3 grid grid-cols-2 gap-2">{eq.signals.map((s) => <div key={s.label} className="rounded-lg border border-line p-2"><div className="text-[10.5px] text-fg-dim">{s.label}</div><div className="text-[15px] font-semibold">{s.value}</div><div className="text-[11px]" style={{ color: toneColor[s.tone as "ok"] }}>{s.delta}</div></div>)}</div>
              </div>
              <div>
                <div className="eyebrow">Health trend · 30 days</div>
                <div className="h-[150px]"><ResponsiveContainer><LineChart data={trend} margin={{ left: -20 }}><CartesianGrid vertical={false} /><XAxis dataKey="d" tickLine={false} /><YAxis domain={[50, 100]} tickLine={false} /><Tooltip {...tip} /><Line dataKey="h" stroke={toneColor[tone(eq.health)]} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
                <div className="text-[11.5px] text-fg-muted"><b className="text-fg">Last maintenance:</b> {eq.lastMaintenance}</div>
                <div className="text-[11.5px] text-fg-muted"><b className="text-fg">Strategy:</b> {eq.strategy}</div>
              </div>
            </div>
          </Panel>
          <Panel eyebrow="Asset Agent workflow" title="From detection to human approval" right={<Btn onClick={runWf} variant="outline"><Play size={13} /> Run workflow</Btn>}>
            <div className="flex flex-wrap items-center gap-1.5">
              {WF.map((w, i) => (
                <div key={w} className="flex items-center gap-1.5">
                  <div className={cn("rounded-lg border px-2.5 py-1.5 text-[11.5px] transition", i < step || (i === step && i < WF.length - 1) ? "border-cyan-400/60 bg-cyan-400/10 text-fg" : i === step ? "border-warn bg-warn/10 text-warn" : "border-line text-fg-dim")}>
                    {i < step ? <CheckCircle2 size={12} className="mr-1 inline text-cyan-400" /> : null}{w}
                  </div>
                  {i < WF.length - 1 && <span className="text-fg-dim">›</span>}
                </div>
              ))}
            </div>
            {step === WF.length - 1 && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div><div className="eyebrow">Spare requirements</div>{eq.spares.length ? eq.spares.map((s) => <div key={s.item} className="flex justify-between border-b border-line py-1 text-[12px]"><span>{s.item}</span><span className="text-fg-muted">{s.stock} · {s.lead}</span></div>) : <div className="text-[12px] text-fg-dim">No critical spares identified</div>}</div>
                <div>
                  <div className="eyebrow">Proposed intervention</div>
                  <div className="text-[12.5px]">{eq.id === "C-201" ? "Engineering review within 7 days. Urgent oil sample and spectrum analysis. Prepare a targeted inspection option for the next low-demand window." : "Continue the condition-based strategy and review in the next monthly cycle."}</div>
                  <div className="mt-3">{approved ? <Badge tone="ok">Approved by Demo Maintenance Planner · CMMS draft created</Badge> : <Btn variant="human" onClick={() => { setApproved(true); log({ actorType: "human", actor: "Demo Maintenance Planner", action: "Approved maintenance review", detail: `${eq.id} · draft notification (not submitted to CMMS)`, outcome: "approved" }); }}>Approve maintenance review</Btn>}</div>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── 07 Energy & Steam
export function EnergySteam() {
  const [inc, setInc] = useState(0);
  const tags = useApp((s) => s.tags);
  const x = inc;
  const prod = 2450 * (1 + x / 100);
  const ei = 28.4 + 0.05 * x + 0.035 * x * x;
  const steam = 420 * (1 + 0.009 * x);
  const c201 = 92 + 2.2 * x;
  const cost = (prod * ei * ECONOMICS.gasPriceAedPerGj) / 1000;
  const co2 = prod * ECONOMICS.co2PerTonne * (ei / 28.4);
  const S = energyJson.flows;
  const total = S.sources.reduce((a, b) => a + b.gjh, 0);
  return (
    <div className="space-y-5">
      <Headline lead="Energy &" accent="Steam" sub="Where the energy goes, what it costs and how to recover it. The Energy Agent reconciles the balance continuously." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-9">
        {energyJson.metrics.map((m) => <div key={m.id} className="panel p-3"><div className="eyebrow leading-tight">{m.label}</div><div className="mt-1 text-[20px] font-semibold tabular-nums">{m.id === "ei" ? tags["EN-INT"].value.toFixed(1) : m.value.toLocaleString()} <span className="text-[11px] font-normal text-fg-muted">{m.unit}</span></div><div className="text-[11px]" style={{ color: toneColor[m.tone as "ok"] }}>{m.delta}</div></div>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Panel eyebrow="Energy flow" title="Plant energy balance (GJ/h)" right={<SimTag />}>
          <svg viewBox="0 0 700 300" className="w-full">
            {(() => {
              let ys = 20; let yt = 20; const H = 260; const out: React.ReactNode[] = [];
              const sinkTotal = S.sinks.reduce((a, b) => a + b.gjh, 0);
              const srcPos = S.sources.map((s) => { const h = (s.gjh / total) * H; const p = { ...s, y: ys, h }; ys += h + 6; return p; });
              const sinkPos = S.sinks.map((s) => { const h = (s.gjh / sinkTotal) * H; const p = { ...s, y: yt, h }; yt += h + 6; return p; });
              srcPos.forEach((s) => out.push(<path key={s.id} d={`M150 ${s.y + s.h / 2} C 260 ${s.y + s.h / 2}, 260 150, 340 150`} stroke="#4C9BFF" strokeOpacity=".45" strokeWidth={Math.max(2, s.h)} fill="none" />));
              sinkPos.forEach((s) => out.push(<path key={s.id} d={`M360 150 C 440 150, 440 ${s.y + s.h / 2}, 550 ${s.y + s.h / 2}`} stroke={s.id === "product" ? "#3DD9A4" : "#F4B740"} strokeOpacity=".45" strokeWidth={Math.max(2, s.h)} fill="none" />));
              srcPos.forEach((s) => out.push(<g key={`l${s.id}`}><rect x="140" y={s.y} width="10" height={Math.max(2, s.h)} fill="#4C9BFF" /><text x="134" y={s.y + s.h / 2 + 4} textAnchor="end" fontSize="11" fill="#93A9CC">{s.label} · {s.gjh}</text></g>));
              sinkPos.forEach((s) => out.push(<g key={`r${s.id}`}><rect x="550" y={s.y} width="10" height={Math.max(2, s.h)} fill={s.id === "product" ? "#3DD9A4" : "#F4B740"} /><text x="566" y={s.y + s.h / 2 + 4} fontSize="11" fill="#93A9CC">{s.label} · {s.gjh}</text></g>));
              out.push(<g key="mid"><rect x="335" y="120" width="30" height="60" rx="6" fill="#071D3B" stroke="#2FD6F5" /><text x="350" y="200" textAnchor="middle" fontSize="11" fill="#E7F0FF">Methanol plant</text></g>);
              return out;
            })()}
          </svg>
        </Panel>
        <Panel eyebrow="Energy Agent insight" title={`${tags["EN-INT"].value.toFixed(1)} GJ/t → 27.6 GJ/t optimised potential (−2.8%)`}>
          <div className="space-y-2">
            {energyJson.opportunities.map((o) => <div key={o.title} className="rounded-lg border border-line bg-ink-800/40 p-2.5"><div className="flex justify-between text-[12.5px] font-medium"><span>{o.title}</span><span className="text-ok">−{o.saving}</span></div><div className="text-[11.5px] text-fg-muted">{o.detail}</div></div>)}
          </div>
        </Panel>
      </div>
      <Panel eyebrow="Scenario" title={`Increase production target: +${x.toFixed(1)}%`} right={<SimTag>Model estimate</SimTag>}>
        <Slider.Root className="relative flex h-6 w-full touch-none items-center" value={[x]} max={5} step={0.1} onValueChange={(v) => setInc(v[0])}>
          <Slider.Track className="relative h-1.5 grow rounded-full bg-white/10"><Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-electric-500 to-cyan-400" /></Slider.Track>
          <Slider.Thumb aria-label="Production increase" className="block h-5 w-5 rounded-full border-2 border-cyan-400 bg-ink-900 shadow-glow" />
        </Slider.Root>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
          {[["Production", `${Math.round(prod).toLocaleString()} t/d`, "info"], ["Energy intensity", `${ei.toFixed(2)} GJ/t`, ei > 28.8 ? "warn" : "ok"], ["Steam demand", `${steam.toFixed(0)} t/h`, "info"], ["C-201 load", `${c201.toFixed(1)} %`, c201 >= 100 ? "critical" : c201 > 97 ? "warn" : "ok"], ["Energy cost", `AED ${cost.toFixed(0)}K/day`, "info"], ["CO₂ (est.)", `${co2.toFixed(0)} t/day`, "info"]].map(([l, v, t]) => (
            <div key={l} className="rounded-lg border border-line bg-ink-800/40 p-2.5"><div className="eyebrow">{l}</div><div className="text-[17px] font-semibold" style={{ color: toneColor[t as "ok"] }}>{v}</div></div>
          ))}
        </div>
        {c201 >= 97 && <div className="mt-3 rounded-lg border border-alarm/40 bg-alarm/10 p-2 text-[12px] text-alarm">Compressor constraint: C-201 reaches its practical limit at about +2.3% in its current degraded state. Restoring its performance (INV-26-0412) is the prerequisite for higher rates.</div>}
      </Panel>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── 08 Quality Intelligence
export function QualityIntelligence() {
  const tags = useApp((s) => s.tags);
  const sim = useApp((s) => s.qualitySim);
  const setSim = useApp((s) => s.setQualitySim);
  const dev = sim === "deviation";
  const simulate = () => { setSim("running"); setTimeout(() => setSim("deviation"), 1800); };
  const purity = tags["MEOH-PURITY"].history.slice(-150).map((p) => ({ t: p.t, v: p.v }));
  const pred = dev ? 99.74 : 99.78;
  const risk = dev ? 68 : 12;
  const kpis = [["Methanol purity", tags["MEOH-PURITY"].value.toFixed(2), "wt%"], ["Water content", fmtTag("MEOH-H2O", tags["MEOH-H2O"].value, false), "ppm"], ["Ethanol", fmtTag("MEOH-ETOH", tags["MEOH-ETOH"].value, false), "mg/kg"], ["Higher alcohols", fmtTag("MEOH-HA", tags["MEOH-HA"].value, false), "mg/kg"], ["Acetone", fmtTag("MEOH-ACET", tags["MEOH-ACET"].value, false), "mg/kg"], ["Distillation stability", dev ? "Unstable" : "Stable", ""]];
  const contrib = [{ v: "Reflux ratio deviation", w: 41 }, { v: "Column temperature profile", w: 26 }, { v: "Reboiler duty swings", w: 19 }, { v: "Feed composition change", w: 14 }];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Headline lead="Quality" accent="Intelligence" sub={`The Methanol Quality Agent predicts purity 60 minutes ahead against the demo spec limit (${labJson.limits.purity} wt%). This limit is not a contractual specification.`} />
        {sim === "deviation" ? <Btn variant="outline" onClick={() => setSim("normal")}><RotateCcw size={13} /> Reset quality scenario</Btn> : <Btn id="sim-distill" onClick={simulate} disabled={sim === "running"}>{sim === "running" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Simulate distillation deviation</Btn>}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">{kpis.map(([l, v, u]) => <div key={l} className="panel p-3"><div className="eyebrow">{l}</div><div className="mt-1 text-[20px] font-semibold">{v} <span className="text-[11px] font-normal text-fg-muted">{u}</span></div></div>)}</div>
      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <Panel eyebrow="Quality Agent" title="Prediction">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-line p-3"><div className="eyebrow">Current</div><div className="text-[24px] font-bold">{tags["MEOH-PURITY"].value.toFixed(2)}%</div></div>
            <div className="rounded-lg border border-line p-3"><div className="eyebrow">Predicted 60 min</div><div className="text-[24px] font-bold" style={{ color: dev ? toneColor.alert : undefined }}>{pred.toFixed(2)}%</div></div>
            <div className="rounded-lg border p-3" style={{ borderColor: dev ? toneColor.critical : "rgba(86,179,255,.14)" }}><div className="eyebrow">Off-spec risk</div><motion.div key={risk} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-[24px] font-bold" style={{ color: dev ? toneColor.critical : toneColor.ok }}>{risk}%</motion.div></div>
          </div>
          {sim === "running" && <div className="shimmer-text mt-4 text-center">Querying LIMS · evaluating column profile · running purity model…</div>}
          {dev && (
            <div className="mt-4 space-y-3">
              <div className="eyebrow">Contributing variables</div>
              {contrib.map((c) => <div key={c.v}><div className="flex justify-between text-[12px]"><span>{c.v}</span><span className="text-fg-muted">{c.w}%</span></div><Meter value={c.w * 2} color="#9A8CFF" /></div>)}
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-lg border border-line p-2.5 text-[12px]"><div className="eyebrow">Recommended checks</div>• Urgent grab sample<br />• Operator review of reflux control loop<br />• Tray 12–18 temperatures<br />• Prepare rundown diversion option</div>
                <div className="rounded-lg border border-line p-2.5 text-[12px]"><div className="eyebrow">Historical match</div>IR-2025-009 refining column upset<br /><b className="text-cyan-300">Similarity 0.81</b> · recovered in 3 h<br /><span className="text-fg-dim">Confidence 79%</span></div>
              </div>
            </div>
          )}
        </Panel>
        <Panel eyebrow="Purity trend" title="Methanol purity (wt%)" right={<SimTag />}>
          <div className="h-[260px]"><ResponsiveContainer><LineChart data={purity} margin={{ left: -6 }}><CartesianGrid vertical={false} /><XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => clockLabel(v)} tickLine={false} /><YAxis domain={[99.7, 99.9]} tickLine={false} width={50} /><Tooltip {...tip} labelFormatter={(v) => clockLabel(Number(v))} /><ReferenceLine y={labJson.limits.purity} stroke="#FF6B6B" strokeDasharray="4 4" label={{ value: "Demo spec 99.75", fill: "#FF6B6B", fontSize: 10, position: "insideBottomLeft" }} /><Line dataKey="v" stroke="#9A8CFF" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
        </Panel>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── 09 Engineering Knowledge
const KQ = ["Why would synthesis pressure drop?", "What should I check when recycle compressor vibration increases?", "What are the prerequisites before inspecting C-201?", "What documents relate to the synthesis loop?"];
export function EngineeringKnowledge() {
  const [q, setQ] = useState("");
  const [a, setA] = useState<{ q: string; r: KnowledgeAnswer } | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const ask = (x: string) => { setBusy(true); setTimeout(() => { setA({ q: x, r: answerKnowledge(x) }); setBusy(false); }, 900); };
  return (
    <div className="space-y-5">
      <Headline lead="Engineering" accent="Knowledge Agent" sub="Answers grounded in the approved document library, with citations. All documents shown are synthetic." />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Panel>
            <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q.trim()); }} className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about procedures, equipment, P&IDs, incidents…" className="flex-1 rounded-lg border border-line bg-ink-950 px-3 py-2.5 text-[13px] outline-none focus:border-cyan-400/50" />
              <Btn><Send size={14} /> Ask</Btn>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">{KQ.map((k) => <button key={k} onClick={() => { setQ(k); ask(k); }} className="rounded-full border border-line px-3 py-1 text-[11.5px] text-fg-muted hover:border-cyan-400/40 hover:text-fg">{k}</button>)}</div>
          </Panel>
          {busy && <Panel><div className="shimmer-text">Retrieving engineering documentation… ranking passages… composing cited answer…</div></Panel>}
          {a && !busy && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Panel eyebrow="Answer" title={a.q}>
                <p className="text-[13px] leading-relaxed">{a.r.answer}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div><div className="eyebrow">Sources & references</div>{a.r.citations.map((c, i) => <button key={i} onClick={() => setOpen(c.docId)} className="mt-1 block text-left text-[11.5px] text-cyan-300 hover:underline">[{i + 1}] {c.label}</button>)}</div>
                  <div><div className="eyebrow">Relevant equipment</div><div className="mt-1 flex flex-wrap gap-1">{a.r.equipment.map((e) => <Badge key={e}>{e}</Badge>)}</div></div>
                  <div><div className="eyebrow">Suggested next checks</div><ul className="mt-1 space-y-0.5 text-[11.5px] text-fg-muted">{a.r.nextChecks.map((n) => <li key={n}>• {n}</li>)}</ul></div>
                </div>
              </Panel>
            </motion.div>
          )}
        </div>
        <Panel eyebrow="Document library" title={`${DOCS.length} controlled documents (synthetic)`}>
          <div className="scroll-thin max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
            {DOCS.map((d) => (
              <div key={d.id} className={cn("rounded-lg border p-2.5", open === d.id ? "border-cyan-400/60 bg-cyan-400/5" : "border-line")}>
                <button onClick={() => setOpen(open === d.id ? null : d.id)} className="flex w-full items-start gap-2 text-left"><BookOpen size={14} className="mt-0.5 text-cyan-400" /><div className="flex-1"><div className="text-[12.5px] font-medium">{d.title}</div><div className="text-[10.5px] text-fg-dim">{d.number} · {d.type} · {d.rev}</div></div></button>
                {open === d.id && <div className="mt-2 space-y-1.5 border-t border-line pt-2">{d.sections.map((s) => <div key={s.id} className="text-[11.5px]"><b className="text-cyan-300">§{s.id} {s.heading}.</b> <span className="text-fg-muted">{s.text}</span></div>)}</div>}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── 10 Shift Intelligence
export function ShiftIntelligence() {
  const k = useApp((s) => s.kpis)();
  const invs = useApp((s) => s.investigations);
  const alerts = useApp((s) => s.alerts);
  const clock = useApp((s) => s.clock);
  const r = useStaged(["Reading shift log…", "Summarising process deviations…", "Collecting open investigations…", "Drafting handover actions…"], 600);
  const [preview, setPreview] = useState(false);
  const open = invs.filter((i) => ["queued", "running", "awaiting-approval"].includes(i.status));
  const sections: [string, string[]][] = [
    ["Plant status", [`Running at ${k.performance.toFixed(1)}% of target. Availability ${k.availability}%.`]],
    ["Production performance", [`${Math.round(k.production).toLocaleString()} t/day, ${(100 - k.performance).toFixed(1)}% below the 2,550 t/day target.`, "Primary issue: synthesis compressor throughput (C-201)."]],
    ["Quality", [`Methanol purity ${k.purity.toFixed(2)} wt%, within specification. Off-spec risk 12%.`]],
    ["Process deviations", ["Recycle flow −5.8% vs model since 04:12.", "C-201 suction pressure below normal band.", "Reformer excess O₂ 2.4% (target 1.8%)."]],
    ["Maintenance", ["WO-26-04388 F-101 burner inspection in progress.", "C-201 vibration route due 19 Oct. Consider bringing it forward."]],
    ["Active alarms", alerts.map((a) => `${a.time} ${a.title}`)],
    ["HSE", ["No safety-critical alarms, no SIS demands, no permit deviations this shift (simulated)."]],
    ["Open investigations", open.map((i) => `${i.code} · ${i.title} (${i.status.replace("-", " ")})`)],
    ["Actions for next shift", ["1. Field-verify C-201 suction conditions and strainer ΔP (PDI-201).", "2. Follow up INV-26-0412 approval and engineer assignment.", "3. Validate reformer O₂ analyser before burner air rebalance."]],
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Headline lead="Shift" accent="Intelligence" sub="An AI-drafted shift handover built from the shift log, plant data and open investigations. The shift supervisor reviews and signs it." />
        <div className="flex gap-2">
          <Btn id="gen-shift" onClick={r.run} disabled={r.state === "running"}>{r.state === "running" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate shift handover</Btn>
          {r.state === "done" && <Btn variant="outline" onClick={() => setPreview(true)}><Printer size={13} /> Print / export preview</Btn>}
        </div>
      </div>
      {r.state === "idle" && <Panel><div className="py-10 text-center text-[13px] text-fg-muted">Press <b>Generate shift handover</b> to have the Shift Agent draft the handover for Day Shift 06:00–18:00.</div></Panel>}
      {r.state === "running" && <Panel><div className="shimmer-text py-10 text-center text-[14px]">{r.msg}</div></Panel>}
      {r.state === "done" && (
        <Panel eyebrow={`Shift summary · Day shift 06:00–18:00 · draft generated ${clock()}`} title={`Production ${Math.round(k.production).toLocaleString()} t/day, ${(100 - k.performance).toFixed(1)}% below target · ${open.length} open investigations · 3 critical handover actions`} right={<SimTag>AI draft</SimTag>}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sections.map(([t, items]) => <div key={t} className="rounded-lg border border-line bg-ink-800/30 p-3"><div className="eyebrow text-cyan-400">{t}</div><ul className="mt-1 space-y-0.5 text-[12px] text-fg-muted">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>)}</div>
        </Panel>
      )}
      {preview && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink-950/80 p-4" onClick={() => setPreview(false)}>
          <div id="print-area" onClick={(e) => e.stopPropagation()} className="scroll-thin max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-8 text-[#0A1A33]">
            <div className="flex items-start justify-between border-b pb-3"><div><div className="text-[11px] font-bold uppercase tracking-widest text-[#1F5FE0]">Insight | TA’ZIZ · Intelligent Methanol Plant</div><div className="text-[20px] font-bold">Shift Handover · Day Shift 06:00–18:00</div><div className="text-[11px] text-gray-500">AI-drafted · DEMO / SIMULATION DATA · requires supervisor signature</div></div><div className="flex gap-2 print:hidden"><button onClick={() => window.print()} className="rounded bg-[#1F5FE0] px-3 py-1.5 text-[12px] font-semibold text-white">Print</button><button onClick={() => setPreview(false)} className="rounded border px-3 py-1.5 text-[12px]">Close</button></div></div>
            {sections.map(([t, items]) => <div key={t} className="mt-4"><div className="text-[12px] font-bold uppercase tracking-wider text-[#1F5FE0]">{t}</div><ul className="mt-1 text-[12.5px]">{items.map((i) => <li key={i}>• {i}</li>)}</ul></div>)}
            <div className="mt-6 grid grid-cols-2 gap-6 border-t pt-4 text-[12px]"><div>Outgoing supervisor: ____________</div><div>Incoming supervisor: ____________</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────── 11 AI Control
export function AIControl() {
  const audit = useApp((s) => s.audit);
  const testGuardrail = useApp((s) => s.testGuardrail);
  const [last, setLast] = useState<string | null>(null);
  const activity = AGENTS.map((a) => ({ n: a.short, v: audit.filter((e) => e.actor.startsWith(a.short) || e.actor === a.name).length + 2 }));
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-ok/30 bg-gradient-to-r from-ok/[0.08] to-ink-900 p-5">
        <div className="eyebrow text-ok">AI Control</div>
        <Headline lead="Governed Agentic AI for" accent="Industrial Operations" sub="Identity, permissions, human approval, policy guardrails, audit trail, monitoring and OT/IT data boundaries." />
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-alarm/50 bg-alarm/10 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-alarm"><Lock size={14} /> Demo: all control actions are disabled</div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Agents may" title="Allowed capabilities"><ul className="grid grid-cols-2 gap-1.5 text-[12.5px]">{ALLOWED_CAPABILITIES.map((c) => <li key={c} className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 text-ok" />{c}</li>)}</ul></Panel>
        <Panel eyebrow="Agents may NOT (without separate authorised systems & governance)" title="Policy guardrails">
          <div className="space-y-1.5">
            {PROHIBITED.map((g) => (
              <div key={g.id} className="flex items-center gap-2 rounded-lg border border-line p-2 text-[12px]">
                <Ban size={14} className="text-alarm" /><b className="w-44 shrink-0">{g.title}</b><span className="flex-1 text-fg-muted">{g.detail}</span>
                <Btn variant="danger" className="px-2 py-1 text-[10px]" onClick={() => { const r = testGuardrail(g.probe.agent, g.probe.action); setLast(`${AGENT[g.probe.agent].name} tried “${g.probe.action}” → BLOCKED (${r.policy})`); }}>Test</Btn>
              </div>
            ))}
            {last && <div className="flex items-center gap-2 rounded-lg border border-alarm/40 bg-alarm/10 p-2 text-[12px] text-alarm"><ShieldAlert size={14} />{last} · logged to audit trail</div>}
          </div>
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel eyebrow="Identity & permissions" title="Agent access matrix (read-only)" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead><tr className="text-fg-dim"><th className="py-1 text-left">Agent · identity</th>{DATA_DOMAINS.map((d) => <th key={d.id} className="px-1 text-center font-medium" title={d.zone}>{d.label.split(" (")[0]}</th>)}<th className="text-center">Write OT</th></tr></thead>
              <tbody>{AGENTS.map((a) => <tr key={a.id} className="border-t border-line"><td className="py-1.5"><b style={{ color: a.color }}>{a.short}</b> <span className="text-fg-dim">{a.identity}</span></td>{DATA_DOMAINS.map((d) => <td key={d.id} className="text-center">{a.read.includes(d.id) ? <span className="text-ok">R</span> : <span className="text-fg-dim">–</span>}</td>)}<td className="text-center text-alarm"><Lock size={11} className="inline" /></td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
        <Panel eyebrow="Human approval" title="Approval gates">
          <div className="space-y-1.5 text-[12px]">{APPROVAL_GATES.map((g) => <div key={g.action} className="rounded-lg border border-line p-2"><b>{g.action}</b><div className="text-fg-muted">{g.approver} · {g.sla}</div></div>)}</div>
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel eyebrow="Data boundaries" title="OT / IT separation">
          <div className="space-y-2 text-[12px]">
            {[["Level 0–2 · Field, PLC, SIS, DCS control", "No AI access", "alarm"], ["Level 3 · Historian, alarm server (OT)", "No direct AI access", "watch"], ["Level 3.5 · DMZ read-only replicas", "One-way replication (data diode)", "info"], ["Level 4 · IT: EAM, LIMS, documents, MES", "Approved read access", "ok"], ["AI agent layer (this platform)", "Reads replicas & IT. Recommends only.", "info"]].map(([a, b, t]) => <div key={a} className="rounded-lg border p-2" style={{ borderColor: `${toneColor[t as "ok"]}55` }}><b>{a}</b><div style={{ color: toneColor[t as "ok"] }}>{b}</div></div>)}
          </div>
        </Panel>
        <Panel eyebrow="Monitoring" title="Agent health & activity">
          <div className="h-[170px]"><ResponsiveContainer><BarChart data={activity} margin={{ left: -24 }}><XAxis dataKey="n" tickLine={false} interval={0} angle={-30} textAnchor="end" height={44} /><YAxis tickLine={false} /><Tooltip {...tip} /><Bar dataKey="v" name="Actions logged" radius={4}>{activity.map((_, i) => <Cell key={i} fill={AGENTS[i].color} />)}</Bar></BarChart></ResponsiveContainer></div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]"><div><div className="text-[16px] font-bold text-ok">9/9</div>agents healthy</div><div><div className="text-[16px] font-bold">0</div>policy violations</div><div><div className="text-[16px] font-bold text-cyan-300">91%</div>finding acceptance*</div></div>
          <div className="mt-1 text-[10px] text-fg-dim">*Illustrative monitoring metric</div>
        </Panel>
        <Panel eyebrow="Audit trail" title={`${audit.length} records`} right={<ShieldCheck size={16} className="text-ok" />}>
          <div className="scroll-thin max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
            {audit.map((e) => (
              <div key={e.id} className="rounded-md border border-line p-2 text-[11px]">
                <div className="flex justify-between"><b className={e.actorType === "human" ? "text-ok" : e.actorType === "policy" ? "text-warn" : "text-cyan-300"}>{e.actor}</b><span className="font-mono text-fg-dim">{e.at}</span></div>
                <div><span className={e.outcome === "blocked" ? "font-bold text-alarm" : "text-fg"}>{e.action}</span> <span className="text-fg-muted">· {e.detail}</span></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── 12 Scenario Simulator
export function ScenarioSimulator() {
  const apply = useApp((s) => s.applyScenario);
  const current = useApp((s) => s.scenarioId);
  const reset = useApp((s) => s.resetDemo);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Headline lead="Scenario" accent="Simulator" sub="Inject a synthetic plant situation. The plant state updates and the relevant agent investigation starts automatically." />
        <Btn variant="outline" onClick={reset}><RotateCcw size={13} /> Reset to baseline</Btn>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {SCENARIOS.map((s) => {
          const Ico = (Icons as unknown as Record<string, typeof Play>)[s.icon] ?? Play;
          return (
            <button key={s.id} id={`scenario-${s.id}`} onClick={() => apply(s.id)} className={cn("panel group p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/50", current === s.id && "border-cyan-400/70 shadow-glow-sm")}>
              <div className="flex items-center justify-between"><span className="font-mono text-[11px] text-cyan-300">Scenario {s.id}</span><Ico size={18} className="text-cyan-400" /></div>
              <div className="mt-2 text-[15px] font-semibold">{s.name}</div>
              <div className="text-[12px] text-fg">{s.headline}</div>
              <div className="mt-1 text-[11.5px] text-fg-muted">{s.description}</div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300 opacity-80 group-hover:opacity-100"><Play size={12} /> Inject & investigate</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── 21 Executive value summary
export function ValueSummary() {
  const rows = [
    ["Investigation time", "120 min", "15 min", 87],
    ["Deviation detection", "Baseline", "45 min earlier", 70],
    ["Potential production recovery", "—", "80–90 t/day", 64],
    ["Engineering knowledge retrieval", "30 min", "< 1 min", 97],
    ["Shift report preparation", "45 min", "5 min", 89],
  ] as const;
  const cats = ["Earlier deviation detection", "Faster root-cause investigation", "Avoided production loss", "Improved operator productivity", "Reduced maintenance disruption", "Energy optimization", "Improved knowledge access", "Better shift handovers"];
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = setInterval(() => setShown((x) => Math.min(rows.length, x + 1)), 350); return () => clearInterval(t); }, [rows.length]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Headline lead="Start focused." accent="Prove value. Scale." sub="Executive value summary for the Methanol Operations Agent PoV." />
        <span className="rounded-md border border-warn/50 bg-warn/10 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-warn">Illustrative demo value</span>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {rows.map(([l, a, b, p], i) => (
          <motion.div key={l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: i < shown ? 1 : 0, y: i < shown ? 0 : 10 }} className="panel p-4">
            <div className="eyebrow">{l}</div>
            <div className="mt-2 text-[13px] text-fg-muted line-through decoration-fg-dim">{a}</div>
            <div className="text-[24px] font-bold text-cyan-300">{b}</div>
            <div className="mt-2"><Meter value={i < shown ? p : 0} /></div>
          </motion.div>
        ))}
      </div>
      <Panel eyebrow="Value categories" title="Where agentic AI creates value in methanol operations">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{cats.map((c, i) => <div key={c} className="flex items-center gap-3 rounded-lg border border-line bg-ink-800/40 p-3"><span className="font-mono text-[12px] text-cyan-300">0{i + 1}</span><span className="text-[12.5px]">{c}</span></div>)}</div>
      </Panel>
      <div className="rounded-xl border border-warn/40 bg-warn/[0.07] p-4 text-[12.5px] text-fg-muted">
        <b className="text-warn">ILLUSTRATIVE – subject to validation using actual TA’ZIZ data.</b> These figures come from a synthetic simulation. They are not claimed TA’ZIZ benefits and need a measured baseline from a focused PoV.
      </div>
    </div>
  );
}

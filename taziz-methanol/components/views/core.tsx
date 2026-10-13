"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as Icons from "lucide-react";
import { ArrowRight, Bot, CheckCircle2, CircleDashed, FileSearch, Hourglass, Loader2, Play, ShieldCheck, UserCheck, Wrench, XCircle, MessageSquarePlus, AlertTriangle, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { AREAS, TAG, clockLabel, fmtTag } from "@/lib/sim/plant";
import { AGENT } from "@/lib/governance";
import { deriveRun } from "@/lib/agents/runtime";
import type { AgentId, AgentStatus, EvidenceSourceId, Investigation } from "@/lib/types";
import { fmtAedM } from "@/config/demo";
import alarmsJson from "@/data/alarms.json";
import maintenanceJson from "@/data/maintenance.json";
import labJson from "@/data/lab-results.json";
import productionJson from "@/data/production.json";
import equipmentJson from "@/data/equipment.json";
import { DOCS } from "@/lib/knowledge";
import { Badge, Btn, Dot, Headline, Meter, Panel, SimTag, Sparkline, cn, toneColor } from "../ui";
import { Highlight, PlantSkyline } from "../shell";

const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtMin = (m: number) => clockLabel(m);

// ───────────────────────────────────────────────────────────── Executive Overview
export function ExecutiveOverview() {
  const kpisFn = useApp((s) => s.kpis);
  useApp((s) => s.tick);
  const k = kpisFn();
  const areas = useApp((s) => s.areas);
  const tags = useApp((s) => s.tags);
  const setView = useApp((s) => s.setView);
  const setArea = useApp((s) => s.setArea);
  const setAssistantOpen = useApp((s) => s.setAssistantOpen);
  const ask = useApp((s) => s.ask);
  const alerts = useApp((s) => s.alerts);
  const scenarioId = useApp((s) => s.scenarioId);
  const prodHist = tags.PRODUCTION.history.filter((_, i) => i % 1 === 0);

  const KPIS = [
    { label: "Production", value: `${fmt(k.production)}`, unit: "t/day", tone: "alert" as const, big: true },
    { label: "Production target", value: fmt(k.target), unit: "t/day", tone: "info" as const },
    { label: "Current performance", value: k.performance.toFixed(1), unit: "%", tone: "watch" as const },
    { label: "Methanol purity", value: k.purity.toFixed(2), unit: "%", tone: "normal" as const },
    { label: "Energy intensity", value: k.energyIntensity.toFixed(1), unit: "GJ/t", tone: "watch" as const },
    { label: "Plant availability", value: k.availability.toFixed(1), unit: "%", tone: "normal" as const },
    { label: "Active alerts", value: String(k.activeAlerts), unit: "", tone: "alert" as const },
    { label: "AI investigations", value: String(k.investigations), unit: "", tone: "info" as const },
    { label: "Potential recovery", value: `+${k.recoveryTpd}`, unit: "t/day", tone: "normal" as const },
    { label: "Estimated opportunity", value: fmtAedM(k.opportunityAedM).replace("AED ", ""), unit: "AED/day", tone: "normal" as const, sim: "Illustrative" },
  ];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-900">
        <PlantSkyline className="absolute inset-0 h-full w-full opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-transparent" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 p-6 md:p-7">
          <div>
            <div className="eyebrow text-cyan-400">TA’ZIZ · Ruwais · Executive Overview</div>
            <Headline lead="Agentic AI for the" accent="Intelligent Methanol Plant" sub="From plant signals to coordinated AI investigation to human decision. An intelligent layer above plant systems: it observes, understands, investigates, coordinates, recommends, escalates and learns." />
          </div>
          <div className="flex flex-wrap gap-2">
            {["Observes", "Investigates", "Recommends", "Escalates"].map((w) => <span key={w} className="rounded-full border border-cyan-400/30 bg-cyan-400/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">{w}</span>)}
          </div>
        </div>
      </div>

      <Highlight id="kpis">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {KPIS.map((x) => (
            <div key={x.label} className="panel p-3.5">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{x.label}</span>
                <Dot tone={x.tone} />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="kpi-value text-[26px] leading-none xl:text-[30px]">{x.value}</span>
                <span className="text-[12px] text-fg-muted">{x.unit}</span>
              </div>
              <div className="mt-1.5"><SimTag>{x.sim ?? "Simulated"}</SimTag></div>
            </div>
          ))}
        </div>
      </Highlight>

      <Panel eyebrow="Methanol value chain" title="Feed gas to storage & loading" right={<span className="text-[11px] text-fg-dim">Click a process area to drill down</span>}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          {AREAS.map((a, i) => {
            const st = areas[a.id];
            const c = toneColor[st.status];
            return (
              <button key={a.id} onClick={() => { setArea(a.id); setView("plant"); }} className="group relative rounded-xl border bg-ink-800/60 p-3 text-left transition hover:-translate-y-0.5" style={{ borderColor: `${c}55`, boxShadow: st.status !== "normal" ? `0 0 22px -10px ${c}` : undefined }}>
                {i < AREAS.length - 1 && <ChevronRight size={14} className="absolute -right-[13px] top-1/2 z-10 hidden -translate-y-1/2 text-cyan-400/60 xl:block" />}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-fg-dim">0{i + 1}</span>
                  <Badge tone={st.status}>{st.status}</Badge>
                </div>
                <div className="mt-1.5 text-[13px] font-semibold leading-tight">{a.name}</div>
                <div className="mt-2 space-y-0.5 text-[11px] text-fg-muted">
                  <div className="flex justify-between"><span>Throughput</span><span className="text-fg tabular-nums">{fmtTag(a.throughputTag, tags[a.throughputTag].value)}</span></div>
                  <div className="flex justify-between"><span>Temp</span><span className="text-fg tabular-nums">{fmtTag(a.tempTag, tags[a.tempTag].value)}</span></div>
                  <div className="flex justify-between"><span>Pressure</span><span className="text-fg tabular-nums">{a.pressureTag ? fmtTag(a.pressureTag, tags[a.pressureTag].value) : "atm"}</span></div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Meter value={st.health} color={c} />
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: c }}>{st.health}</span>
                </div>
                <div className="mt-1 text-[10.5px] text-fg-dim">{st.alerts ? `${st.alerts} alert${st.alerts > 1 ? "s" : ""}` : "No alerts"}</div>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-5">
        <Highlight id="brief" className="xl:col-span-2">
          <Panel eyebrow="AI Operations Brief" title={<span className="flex items-center gap-2"><Bot size={16} className="text-cyan-400" /> Methanol Operations Agent</span>} right={<Badge tone="info">Live</Badge>} className="h-full">
            <div className="space-y-3 text-[13px] leading-relaxed">
              <p className="text-[15px] font-semibold text-fg">Plant operating below target by {(100 - k.performance).toFixed(1)}%.</p>
              <div><div className="eyebrow">Primary contributor</div><p className="text-fg">{scenarioId === "A" ? "Synthesis loop compressor throughput deterioration." : alerts[0]?.title}</p></div>
              <div><div className="eyebrow">Secondary</div><p className="text-fg-muted">Higher-than-normal reformer energy consumption.</p></div>
              <div><div className="eyebrow">Quality</div><p className="text-fg-muted">{k.purity >= 99.8 ? "Quality remains within specification." : "Purity trending toward the demo spec limit."}</p></div>
              <div><div className="eyebrow">Investigations</div><p className="text-fg-muted">{k.investigations} AI investigations are currently active.</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn id="view-investigation" onClick={() => setView("council")}>View investigation <ArrowRight size={14} /></Btn>
              <Btn variant="outline" onClick={() => { setAssistantOpen(true); ask("Give me the current plant brief."); }}>Ask Operations Agent</Btn>
              <Btn variant="outline" onClick={() => setView("scenarios")}>Simulate scenario</Btn>
            </div>
          </Panel>
        </Highlight>

        <Highlight id="trend" className="xl:col-span-3">
          <Panel eyebrow="Production · last 24 h" title="Methanol production vs target" right={<SimTag />} className="h-full">
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={prodHist} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="prodG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2FD6F5" stopOpacity={0.35} /><stop offset="1" stopColor="#2FD6F5" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="t" type="number" domain={[-1440, "dataMax"]} ticks={[-1440, -1080, -720, -360, -166, 0]} tickFormatter={fmtMin} tickLine={false} axisLine={false} />
                  <YAxis domain={[2380, 2580]} tickLine={false} axisLine={false} width={48} />
                  <Tooltip contentStyle={{ background: "#04152D", border: "1px solid rgba(86,199,255,.3)", fontSize: 12 }} labelFormatter={(v) => fmtMin(Number(v))} formatter={(v) => [`${fmt(Number(v))} t/day`, "Production"]} />
                  <ReferenceLine y={2550} stroke="#3DD9A4" strokeDasharray="4 4" label={{ value: "Target 2,550", fill: "#3DD9A4", fontSize: 10, position: "insideTopLeft" }} />
                  <ReferenceLine x={-166} stroke="#F4B740" strokeDasharray="3 3" label={{ value: "04:12 recycle flow declines", fill: "#F4B740", fontSize: 10, position: "insideTopRight" }} />
                  <Area type="monotone" dataKey="v" stroke="#2FD6F5" strokeWidth={2} fill="url(#prodG)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Highlight>
      </div>

      <Panel eyebrow="Active AI alerts" title="Signals being watched by agents">
        <div className="grid gap-2 md:grid-cols-2">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border border-line bg-ink-800/40 p-3">
              <Dot tone={a.severity} pulse={a.severity === "critical"} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium">{a.title}</span><span className="font-mono text-[11px] text-fg-dim">{a.time}</span></div>
                <div className="text-[11.5px] text-fg-muted">{a.detail} · raised by {a.raisedBy === "dcs" ? "DCS" : AGENT[a.raisedBy].short + " Agent"}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── Council of Agents
const statusMeta: Record<AgentStatus, { label: string; tone: "info" | "watch" | "normal" | "ok"; icon: typeof Loader2 }> = {
  idle: { label: "Idle", tone: "info", icon: CircleDashed },
  investigating: { label: "Investigating", tone: "info", icon: Loader2 },
  awaiting: { label: "Awaiting data", tone: "watch", icon: Hourglass },
  completed: { label: "Completed", tone: "ok", icon: CheckCircle2 },
};

function AgentIcon({ id, size = 16 }: { id: AgentId; size?: number }) {
  const Ico = (Icons as unknown as Record<string, typeof Bot>)[AGENT[id].icon] ?? Bot;
  return <Ico size={size} />;
}

function useActiveRun() {
  const invs = useApp((s) => s.investigations);
  const activeId = useApp((s) => s.activeInvId);
  const runs = useApp((s) => s.runs);
  const inv = invs.find((i) => i.id === activeId) ?? invs[0];
  const run = runs[inv.id];
  const view = deriveRun(inv, run?.elapsed ?? 0, run?.startMin ?? 0);
  return { inv, run, view };
}

const LEFT: AgentId[] = ["process", "asset", "energy", "quality"];
const RIGHT: AgentId[] = ["hse", "engineering", "production", "shift"];

export function CouncilOfAgents() {
  const { inv, view } = useActiveRun();
  const start = useApp((s) => s.startInvestigation);
  const complete = useApp((s) => s.completeInvestigation);
  const invs = useApp((s) => s.investigations);
  const setActive = useApp((s) => s.setActiveInv);
  const wrap = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const cards = useRef<Partial<Record<AgentId, HTMLDivElement | null>>>({});
  const [paths, setPaths] = useState<{ id: AgentId; d: string }[]>([]);

  useLayoutEffect(() => {
    const calc = () => {
      if (!wrap.current || !hub.current) return;
      const W = wrap.current.getBoundingClientRect();
      const H = hub.current.getBoundingClientRect();
      const out: { id: AgentId; d: string }[] = [];
      for (const id of [...LEFT, ...RIGHT]) {
        const el = cards.current[id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const left = LEFT.includes(id);
        const x1 = (left ? r.right : r.left) - W.left;
        const y1 = r.top + r.height / 2 - W.top;
        const x2 = (left ? H.left : H.right) - W.left;
        const y2 = H.top + H.height / 2 - W.top;
        const mx = (x1 + x2) / 2;
        out.push({ id, d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}` });
      }
      setPaths(out);
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const running = view.started && !view.done;
  const ops = view.agents.operations;
  const conclusionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view.done && useApp.getState().view === "council" && !useApp.getState().demo.active) conclusionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [view.done]);

  const card = (id: AgentId) => {
    const rt = view.agents[id];
    const involved = inv.agents.includes(id);
    const st = rt?.status ?? "idle";
    const m = statusMeta[st];
    const color = AGENT[id].color;
    return (
      <div key={id} ref={(el) => { cards.current[id] = el; }} className={cn("relative rounded-xl border bg-ink-900/90 p-3 transition-all duration-500", !involved && "opacity-45")} style={{ borderColor: st === "investigating" ? color : st === "completed" ? `${color}88` : "rgba(86,179,255,.16)", boxShadow: st === "investigating" ? `0 0 26px -8px ${color}` : undefined }}>
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${color}1f`, color }}><AgentIcon id={id} /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-semibold uppercase tracking-wide">{AGENT[id].short} Agent</div>
            <div className="flex items-center gap-1.5 text-[10.5px]" style={{ color: toneColor[m.tone] }}>
              <m.icon size={11} className={st === "investigating" ? "animate-spin" : ""} /> {involved ? m.label : "Not assigned"}
            </div>
          </div>
          {rt?.confidence != null && <div className="text-right"><div className="text-[15px] font-bold tabular-nums" style={{ color }}>{rt.confidence}%</div><div className="text-[9px] uppercase tracking-wider text-fg-dim">confidence</div></div>}
        </div>
        <div className="mt-2 line-clamp-2 min-h-[30px] text-[11px] leading-snug text-fg-muted">{st === "idle" ? (rt?.task ?? AGENT[id].mission) : rt?.message}</div>
        {st === "investigating" && <div className="mt-1.5"><Meter value={(rt?.progress ?? 0) * 100} color={color} /></div>}
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-fg-dim">
          <span className="truncate">{rt?.sources.length ? rt.sources.join(" · ") : AGENT[id].sources[0]}</span>
          <span className="ml-2 shrink-0 font-mono">{rt?.lastUpdate ?? "—"}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Headline lead="Methanol" accent="Council of Agents" sub="A coordinated agentic operating layer for faster investigation, safer decisions and better plant performance. Agents investigate and recommend. Humans decide." />
        <div className="flex flex-wrap items-center gap-2">
          <select value={inv.id} onChange={(e) => setActive(e.target.value)} className="rounded-lg border border-line bg-ink-900 px-2.5 py-2 text-[12px]">
            {invs.map((i) => <option key={i.id} value={i.id}>{i.id} · {i.title}</option>)}
          </select>
          {!view.started && <Btn id="run-investigation" onClick={() => start(inv.id)} className="px-4 py-2.5"><Play size={14} /> Run live agent investigation</Btn>}
          {running && <Btn variant="outline" onClick={() => complete(inv.id)}>Fast-forward</Btn>}
          {view.done && <Btn variant="outline" onClick={() => start(inv.id)}><Play size={13} /> Replay investigation</Btn>}
        </div>
      </div>

      <Panel className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
          <Badge tone={inv.trigger.severity}>{inv.code}</Badge>
          <span className="text-[13px] font-medium">{inv.question}</span>
          <span className="ml-auto flex items-center gap-2 text-[11.5px] text-fg-muted">{running && <Loader2 size={12} className="animate-spin text-cyan-400" />}{view.phase}</span>
        </div>
        <div className="h-0.5 bg-white/5"><div className="h-full bg-gradient-to-r from-electric-500 to-cyan-400 transition-all duration-150" style={{ width: `${view.progress * 100}%` }} /></div>
        <Highlight id="council">
          <div ref={wrap} className="relative grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_minmax(220px,0.9fr)_1fr] md:gap-10 md:p-6">
            <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block">
              {paths.map((p) => {
                const st = view.agents[p.id]?.status;
                const color = AGENT[p.id].color;
                const active = st === "investigating";
                const done = st === "completed";
                return (
                  <g key={p.id}>
                    <path d={p.d} fill="none" stroke={active ? color : done ? `${color}66` : "rgba(86,179,255,.12)"} strokeWidth={active ? 2 : 1.3} strokeDasharray={active ? "6 6" : undefined} className={active ? "animate-dash-flow" : ""} />
                    {active && (
                      <circle r="3.5" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
                        <animateMotion dur="1.4s" repeatCount="indefinite" path={p.d} />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>
            <div className="relative z-10 space-y-3">{LEFT.map(card)}</div>
            <div className="relative z-10 flex items-center justify-center">
              <div ref={hub} className="relative w-full rounded-2xl border p-5 text-center" style={{ borderColor: "#2FD6F5aa", background: "radial-gradient(circle at 50% 0%, rgba(47,214,245,.18), rgba(4,21,45,.95) 70%)", boxShadow: ops?.status === "investigating" ? "0 0 50px -10px #2FD6F5" : "0 0 30px -16px #2FD6F5" }}>
                {running && <span className="absolute inset-0 animate-pulse-ring rounded-2xl border border-cyan-400/40" />}
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-electric-600 to-cyan-400 text-ink-950 shadow-glow"><Icons.Workflow size={26} /></div>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Coordinating agent</div>
                <div className="text-[17px] font-bold leading-tight">Methanol Operations Agent</div>
                <div className="mt-2 min-h-[34px] text-[11.5px] text-fg-muted">{ops ? ops.message : "Monitoring plant · ready to convene council"}</div>
                <div className="mt-2 flex justify-center"><Badge tone={statusMeta[ops?.status ?? "idle"].tone}>{statusMeta[ops?.status ?? "idle"].label}</Badge></div>
                {view.done && <div className="mt-3 text-[26px] font-bold text-cyan-300">{inv.conclusion.confidence}%<span className="ml-1 text-[11px] font-medium text-fg-dim">confidence</span></div>}
              </div>
            </div>
            <div className="relative z-10 space-y-3">{RIGHT.map(card)}</div>
          </div>
        </Highlight>
      </Panel>

      <Highlight id="feed">
        <Panel eyebrow="Council feed" title="What the agents are doing" right={<SimTag>Deterministic simulation</SimTag>}>
          <div className="scroll-thin max-h-[220px] space-y-1.5 overflow-y-auto pr-2">
            {view.feed.length === 0 && <div className="text-[12px] text-fg-dim">Press <b>Run live agent investigation</b> to convene the council.</div>}
            <AnimatePresence initial={false}>
              {view.feed.slice().reverse().map((f) => (
                <motion.div key={`${f.atMs}-${f.agentId}-${f.text}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 text-[12px]">
                  <span className="mt-0.5 shrink-0 font-mono text-[10.5px] text-fg-dim">T+{(f.atMs / 1000).toFixed(1)}s</span>
                  <span className="shrink-0 font-semibold" style={{ color: AGENT[f.agentId].color }}>{AGENT[f.agentId].short}</span>
                  <span className={cn(f.tone === "finding" ? "text-fg" : "text-fg-muted")}>{f.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Panel>
      </Highlight>

      <div ref={conclusionRef}>
        <AnimatePresence>{view.done && <Conclusion inv={inv} />}</AnimatePresence>
      </div>
    </div>
  );
}

function Conclusion({ inv }: { inv: Investigation }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <Highlight id="conclusion">
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel eyebrow="Likely cause" className="lg:col-span-1">
            <div className="text-[19px] font-bold leading-snug">{inv.conclusion.likelyCause}</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-[38px] font-bold leading-none text-cyan-300">{inv.conclusion.confidence}%</div>
              <div className="text-[11px] text-fg-muted">confidence<br />council consensus</div>
            </div>
            <div className="eyebrow mt-4">Contributing factors</div>
            <ul className="mt-1 space-y-1 text-[12.5px]">{inv.conclusion.contributing.map((c) => <li key={c} className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-cyan-400" /> {c}</li>)}</ul>
          </Panel>
          <Highlight id="impact" className="lg:col-span-1">
            <Panel eyebrow="Estimated impact" right={<SimTag>Illustrative</SimTag>} className="h-full">
              <div className="space-y-3">
                {inv.impact.metrics.map((m) => (
                  <div key={m.label} className="rounded-lg border border-line bg-ink-800/50 p-3">
                    <div className="eyebrow">{m.label}</div>
                    <div className="text-[22px] font-bold tabular-nums" style={{ color: toneColor[m.tone ?? "info"] }}>{m.value}</div>
                    {m.sub && <div className="text-[11px] text-fg-dim">{m.sub}</div>}
                  </div>
                ))}
                <div className="text-[10.5px] text-fg-dim">{inv.impact.note}</div>
              </div>
            </Panel>
          </Highlight>
          <Panel eyebrow="Recommended investigation" className="lg:col-span-1">
            <ol className="space-y-2">
              {inv.recommendations.map((r, i) => (
                <li key={r.id} className="flex gap-3 text-[12.5px]">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-cyan-400/10 font-mono text-[11px] font-bold text-cyan-300">{i + 1}</span>
                  <div><div className="font-medium">{r.title}</div><div className="text-[11px] text-fg-dim">{r.owner}</div></div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </Highlight>
      <ApprovalPanel inv={inv} />
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────── Human approval
export function ApprovalPanel({ inv, compact }: { inv: Investigation; compact?: boolean }) {
  const decide = useApp((s) => s.decide);
  const more = useApp((s) => s.requestMoreAnalysis);
  const pending = useApp((s) => s.analysisPending);
  const [confirm, setConfirm] = useState(false);
  const last = inv.decisions[inv.decisions.length - 1];
  const closed = inv.status === "approved" || inv.status === "assigned" || inv.status === "dismissed";
  return (
    <Highlight id="approval">
      <div className="relative overflow-hidden rounded-xl border-2 border-warn/60 bg-gradient-to-r from-warn/[0.08] to-ink-900 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-warn/15 text-warn"><UserCheck size={22} /></div>
            <div>
              <div className="text-[15px] font-bold uppercase tracking-wider text-warn">{closed ? "Human decision recorded" : "Human approval required"}</div>
              <div className="text-[11.5px] text-fg-muted">AI has prepared the plan. No plant action is executed automatically. Decision is logged to the audit trail.</div>
            </div>
          </div>
          {!closed && (
            <div className={cn("ml-auto flex flex-wrap gap-2", compact && "w-full")}>
              <Btn id="approve-plan" variant="human" onClick={() => setConfirm(true)}><CheckCircle2 size={14} /> Approve investigation plan</Btn>
              <Btn variant="outline" onClick={() => more(inv.id)} disabled={pending === inv.id}>{pending === inv.id ? <Loader2 size={13} className="animate-spin" /> : <MessageSquarePlus size={13} />} Request more analysis</Btn>
              <Btn variant="outline" onClick={() => decide(inv.id, "assign", "Assigned to Process Engineer – Synthesis")}><UserCheck size={13} /> Assign to process engineer</Btn>
              <Btn variant="outline" onClick={() => decide(inv.id, "maintenance-review", "Draft notification for C-201 review")}><Wrench size={13} /> Create maintenance review</Btn>
              <Btn variant="danger" onClick={() => decide(inv.id, "dismiss", "Dismissed by supervisor")}><XCircle size={13} /> Dismiss</Btn>
            </div>
          )}
          {closed && last && (
            <div className="ml-auto flex items-center gap-3 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-[12px]">
              <CheckCircle2 size={16} className="text-ok" />
              <span><b className="text-ok">{inv.status.toUpperCase()}</b> by {last.by} · {last.at}{last.note ? ` · ${last.note}` : ""}</span>
            </div>
          )}
        </div>
        {inv.extraAnalysis && (
          <div className="mt-3 rounded-lg border border-line bg-ink-900/60 p-3">
            <div className="eyebrow mb-1 text-cyan-400">Supplementary analysis</div>
            {inv.extraAnalysis.map((f) => <div key={f.id} className="text-[12px]"><b style={{ color: AGENT[f.agentId].color }}>{AGENT[f.agentId].short}:</b> {f.text}</div>)}
          </div>
        )}
        <AnimatePresence>
          {confirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid place-items-center bg-ink-950/70 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-lg rounded-2xl border border-ok/50 bg-ink-900 p-5 shadow-glow">
                <div className="flex items-center gap-2 text-[16px] font-bold"><ShieldCheck className="text-ok" /> Confirm approval</div>
                <p className="mt-2 text-[12.5px] text-fg-muted">You are approving the <b className="text-fg">investigation plan</b> for {inv.code}. This creates verification tasks for named owners. It does <b className="text-fg">not</b> change any set-point, limit or equipment state. Operational actions stay with operators in the DCS.</p>
                <ul className="mt-3 space-y-1 text-[12px]">{inv.recommendations.map((r) => <li key={r.id} className="flex gap-2"><ChevronRight size={14} className="mt-0.5 text-ok" />{r.title} <span className="text-fg-dim">· {r.owner}</span></li>)}</ul>
                <div className="mt-3 rounded-lg border border-line bg-ink-800/60 p-2.5 text-[11.5px] text-fg-muted">Approver: <b className="text-fg">Demo Shift Supervisor</b> · Shift Supervisor, Control Room · identity verified (simulated)</div>
                <div className="mt-4 flex justify-end gap-2">
                  <Btn variant="ghost" onClick={() => setConfirm(false)}>Cancel</Btn>
                  <Btn id="confirm-approve" variant="human" onClick={() => { decide(inv.id, "approve"); setConfirm(false); }}>Approve plan</Btn>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Highlight>
  );
}

// ───────────────────────────────────────────────────────────── Investigation Center
const SOURCES: { id: EvidenceSourceId; label: string; icon: typeof Bot }[] = [
  { id: "historian", label: "Historian Trends", icon: Icons.LineChart },
  { id: "alarms", label: "Alarm History", icon: Icons.BellRing },
  { id: "asset-health", label: "Asset Health", icon: Icons.HeartPulse },
  { id: "maintenance", label: "Maintenance History", icon: Wrench },
  { id: "lab", label: "Lab Results", icon: Icons.FlaskConical },
  { id: "documents", label: "Engineering Documents", icon: Icons.FileText },
  { id: "procedures", label: "Operating Procedures", icon: Icons.ClipboardCheck },
  { id: "production-plan", label: "Production Plan", icon: Icons.CalendarRange },
];

export function InvestigationCenter() {
  const { inv, view } = useActiveRun();
  const invs = useApp((s) => s.investigations);
  const setActive = useApp((s) => s.setActiveInv);
  const setView = useApp((s) => s.setView);
  const tags = useApp((s) => s.tags);
  const [source, setSource] = useState<EvidenceSourceId | null>(null);
  const evidence = view.done ? inv.steps.flatMap((s) => s.evidence) : [];
  const runEvents = view.started
    ? [
        { time: clockLabel(useApp.getState().runs[inv.id]?.startMin ?? 0), title: "Agent Council convened", kind: "agent" as const },
        ...(view.done ? [{ time: clockLabel((useApp.getState().runs[inv.id]?.startMin ?? 0) + inv.totalMs / 60000), title: `Council identifies likely cause (${inv.conclusion.confidence}%)`, kind: "agent" as const }] : []),
      ]
    : [];
  const timeline = [...inv.timeline, ...runEvents, ...inv.decisions.map((d) => ({ time: d.at.slice(0, 5), title: `Human decision: ${d.kind.replace("-", " ")}`, kind: "human" as const }))];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Headline lead="Investigation" accent="Center" sub={`“${inv.question}”`} />
        <select value={inv.id} onChange={(e) => setActive(e.target.value)} className="rounded-lg border border-line bg-ink-900 px-2.5 py-2 text-[12px]">
          {invs.map((i) => <option key={i.id} value={i.id}>{i.id} · {i.title} ({i.status})</option>)}
        </select>
      </div>
      <div className="grid gap-5 xl:grid-cols-[280px_1fr_340px]">
        <Panel eyebrow="Timeline" title="Sequence of events">
          <ol className="relative space-y-4 border-l border-line-strong pl-4">
            {timeline.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-ink-900" style={{ background: e.kind === "human" ? "#3DD9A4" : e.kind === "agent" ? "#2FD6F5" : e.kind === "deviation" ? "#FF8A5B" : "#F4B740" }} />
                <div className="font-mono text-[11px] text-cyan-300">{e.time}</div>
                <div className="text-[12.5px] font-medium">{e.title}</div>
                {"detail" in e && e.detail && <div className="text-[11px] text-fg-dim">{e.detail}</div>}
              </li>
            ))}
          </ol>
        </Panel>

        <div className="space-y-5">
          {!view.done ? (
            <Panel>
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <FileSearch size={34} className="text-cyan-400" />
                <div className="text-[15px] font-semibold">{view.started ? "Council investigation in progress…" : "Council not yet convened for this investigation"}</div>
                <div className="max-w-md text-[12.5px] text-fg-muted">Evidence, reasoning summary and recommendations appear here once the agents complete their work.</div>
                <Btn onClick={() => setView("council")}>Open Council of Agents</Btn>
              </div>
            </Panel>
          ) : (
            <>
              <Panel eyebrow="Evidence" title="Sources consulted by the council" right={<span className="text-[11px] text-fg-dim">{evidence.length} items · click a source</span>}>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {SOURCES.map((s) => {
                    const n = evidence.filter((e) => e.source === s.id).length;
                    return (
                      <button key={s.id} onClick={() => setSource(s.id)} className={cn("rounded-lg border p-3 text-left transition hover:border-cyan-400/50", source === s.id ? "border-cyan-400/70 bg-cyan-400/5" : "border-line bg-ink-800/40")}>
                        <s.icon size={16} className="text-cyan-400" />
                        <div className="mt-1.5 text-[12px] font-medium">{s.label}</div>
                        <div className="text-[10.5px] text-fg-dim">{n ? `${n} evidence item${n > 1 ? "s" : ""}` : "Context available"}</div>
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence mode="wait">
                  {source && (
                    <motion.div key={source} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl border border-line-strong bg-ink-950/60 p-4">
                      <SourceDetail source={source} inv={inv} tags={tags} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Panel>

              <Panel eyebrow="Reasoning summary" title="How the council reached its conclusion" right={<Badge tone="info">{inv.reasoning.confidence}% confidence</Badge>}>
                <p className="mb-3 text-[11px] text-fg-dim">A structured summary of evidence and checks. No hidden model reasoning is exposed.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <RS title="Evidence considered" items={inv.reasoning.evidenceConsidered.slice(0, 8)} />
                  <RS title="Correlations detected" items={inv.reasoning.correlations} />
                  <RS title="Contradictions / open questions" items={inv.reasoning.contradictions} tone="watch" />
                  <RS title="Recommended verification steps" items={inv.reasoning.verification} tone="ok" />
                </div>
              </Panel>
            </>
          )}
        </div>

        <div className="space-y-5">
          <Highlight id="recs">
            <Panel eyebrow="AI recommendation" title={view.done ? inv.conclusion.likelyCause : "Pending council conclusion"}>
              {view.done ? (
                <>
                  <div className="mb-3 flex items-center gap-2"><Meter value={inv.conclusion.confidence} /><span className="text-[12px] font-bold text-cyan-300">{inv.conclusion.confidence}%</span></div>
                  <div className="space-y-2">
                    {inv.recommendations.map((r, i) => (
                      <div key={r.id} className="rounded-lg border border-line bg-ink-800/40 p-2.5">
                        <div className="flex items-center gap-2 text-[12.5px] font-medium"><span className="font-mono text-cyan-300">{i + 1}</span>{r.title}<Badge tone="info" className="ml-auto">{r.kind}</Badge></div>
                        <div className="mt-1 text-[11.5px] text-fg-muted">{r.detail}</div>
                        <div className="mt-1 text-[10.5px] text-fg-dim">Owner: {r.owner}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {inv.impact.metrics.map((m) => <div key={m.label} className="flex justify-between text-[12px]"><span className="text-fg-muted">{m.label}</span><b style={{ color: toneColor[m.tone ?? "info"] }}>{m.value}</b></div>)}
                  </div>
                </>
              ) : (
                <div className="text-[12px] text-fg-dim">Recommendations are generated after the agents finish.</div>
              )}
            </Panel>
          </Highlight>
          {view.done && <ApprovalPanel inv={inv} compact />}
        </div>
      </div>
    </div>
  );
}

function RS({ title, items, tone = "info" }: { title: string; items: string[]; tone?: "info" | "watch" | "ok" }) {
  return (
    <div>
      <div className="eyebrow" style={{ color: toneColor[tone] }}>{title}</div>
      <ul className="mt-1 space-y-1 text-[12px] text-fg-muted">{items.map((i) => <li key={i} className="flex gap-1.5"><span style={{ color: toneColor[tone] }}>›</span>{i}</li>)}</ul>
    </div>
  );
}

function SourceDetail({ source, inv, tags }: { source: EvidenceSourceId; inv: Investigation; tags: ReturnType<typeof useApp.getState>["tags"] }) {
  const ev = inv.steps.flatMap((s) => s.evidence).filter((e) => e.source === source);
  const list = ev.length ? (
    <div className="mb-3 space-y-1.5">
      {ev.map((e) => (
        <div key={e.id} className="flex items-start gap-2 text-[12px]">
          <Badge tone={e.signal === "supports" ? "info" : e.signal === "contradicts" ? "watch" : "normal"}>{e.signal}</Badge>
          <div className="flex-1"><b>{e.title}</b> <span className="text-fg-muted">— {e.detail}</span></div>
          {e.value && <span className="font-mono text-cyan-300">{e.value}</span>}
        </div>
      ))}
    </div>
  ) : null;
  if (source === "historian") {
    const ids = inv.trigger.tagIds.concat(inv.steps.flatMap((s) => (s.evidence.length ? [] : []))).slice(0, 3);
    return (
      <div>
        {list}
        <div className="grid gap-3 md:grid-cols-3">
          {ids.map((id) => (
            <div key={id} className="rounded-lg border border-line p-2">
              <div className="text-[11px] text-fg-muted">{TAG[id].name}</div>
              <div className="text-[15px] font-semibold">{fmtTag(id, tags[id].value)}</div>
              <Sparkline data={tags[id].history} height={50} window={150} color={tags[id].status === "normal" ? "#2FD6F5" : "#F4B740"} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (source === "alarms")
    return <div>{list}<table className="w-full text-[11.5px]"><tbody>{alarmsJson.alarms.map((a) => <tr key={a.time + a.tag} className="border-t border-line"><td className="py-1 font-mono text-fg-dim">{a.time}</td><td className="text-cyan-300">{a.tag}</td><td>{a.text}</td><td className="text-fg-dim">{a.priority}</td><td className="text-right text-fg-muted">{a.state}</td></tr>)}</tbody></table><div className="mt-2 text-[10.5px] text-fg-dim">{alarmsJson._note}</div></div>;
  if (source === "maintenance")
    return <div>{list}<div className="space-y-1 text-[11.5px]">{maintenanceJson.history.filter((h) => h.asset === "C-201" || inv.scenarioId !== "A").slice(0, 6).map((h) => <div key={h.date + h.asset} className="flex gap-2"><span className="font-mono text-fg-dim">{h.date}</span><b className="text-cyan-300">{h.asset}</b><span className="text-fg-muted">{h.text}</span></div>)}</div></div>;
  if (source === "lab")
    return <div>{list}<table className="w-full text-[11.5px]"><thead className="text-fg-dim"><tr><th className="text-left">Time</th><th>Purity wt%</th><th>Water ppm</th><th>Ethanol</th><th>Acetone</th><th className="text-right">Status</th></tr></thead><tbody>{labJson.samples.map((s) => <tr key={s.id} className="border-t border-line text-center"><td className="text-left font-mono">{s.time}</td><td>{s.purity}</td><td>{s.water}</td><td>{s.ethanol}</td><td>{s.acetone}</td><td className="text-right text-ok">{s.status}</td></tr>)}</tbody></table></div>;
  if (source === "asset-health") {
    const eq = equipmentJson.equipment[0];
    return <div>{list}<div className="grid gap-2 md:grid-cols-4">{eq.signals.map((s) => <div key={s.label} className="rounded-lg border border-line p-2 text-[11.5px]"><div className="text-fg-dim">{s.label}</div><div className="text-[15px] font-semibold">{s.value}</div><div style={{ color: toneColor[s.tone as "ok"] }}>{s.delta}</div></div>)}</div></div>;
  }
  if (source === "documents" || source === "procedures")
    return <div>{list}<div className="flex flex-wrap gap-1.5">{DOCS.filter((d) => d.equipment.some((e) => ["C-201", "R-201"].includes(e))).map((d) => <span key={d.id} className="rounded border border-line px-2 py-1 text-[11px] text-fg-muted">{d.number} · {d.title}</span>)}</div></div>;
  return <div>{list}<div className="grid grid-cols-3 gap-2 text-[11.5px] md:grid-cols-5">{productionJson.days.slice(-5).map((d) => <div key={d.day} className="rounded-lg border border-line p-2"><div className="text-fg-dim">{d.day}</div><div className="text-[14px] font-semibold">{fmt(d.actual)}</div><div className="text-fg-dim">plan {fmt(d.plan)}</div></div>)}</div><div className="mt-2 text-[11.5px] text-fg-muted">Next cargo: {productionJson.nextCargo.vessel} · {productionJson.nextCargo.eta} · {productionJson.nextCargo.status}</div></div>;
}

export { AlertTriangle };

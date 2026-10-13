"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, BookOpen, Bot, ChevronLeft, ChevronRight, ClipboardList, Cpu, Factory, FlaskConical, Gauge, LayoutDashboard, Play, RotateCcw, Search, Send, ShieldCheck, Sparkles, Users, Wrench, X, Zap, Trophy, FlaskRound,
} from "lucide-react";
import { useApp } from "@/lib/store";
import type { ViewId } from "@/lib/types";
import { DEMO } from "@/config/demo";
import { cn, Btn } from "./ui";

export const NAV: { id: ViewId; n: string; label: string; icon: typeof Activity }[] = [
  { id: "overview", n: "01", label: "Executive Overview", icon: LayoutDashboard },
  { id: "plant", n: "02", label: "Live Plant", icon: Factory },
  { id: "council", n: "03", label: "Council of Agents", icon: Users },
  { id: "investigation", n: "04", label: "Investigation Center", icon: Search },
  { id: "optimization", n: "05", label: "Production Optimization", icon: Gauge },
  { id: "assets", n: "06", label: "Asset Health", icon: Wrench },
  { id: "energy", n: "07", label: "Energy & Steam", icon: Zap },
  { id: "quality", n: "08", label: "Quality Intelligence", icon: FlaskConical },
  { id: "knowledge", n: "09", label: "Engineering Knowledge", icon: BookOpen },
  { id: "shift", n: "10", label: "Shift Intelligence", icon: ClipboardList },
  { id: "control", n: "11", label: "AI Control", icon: ShieldCheck },
  { id: "scenarios", n: "12", label: "Scenario Simulator", icon: FlaskRound },
];

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-gradient-to-br from-electric-500 to-cyan-400 text-[13px] font-black text-ink-950">#</span>
        <span className="text-[17px] font-bold tracking-tight text-fg">Insight</span>
      </div>
      <span className="h-6 w-px bg-line-strong" />
      <div className="leading-none">
        <div className="text-[17px] font-extrabold tracking-[0.04em] text-fg">TA’ZIZ</div>
        <div className="mt-0.5 text-[8.5px] font-medium uppercase tracking-[0.14em] text-fg-dim">An ADNOC Group Company</div>
      </div>
    </div>
  );
}

/** Stylised night-time process plant skyline (pure SVG, no photography needed). */
export function PlantSkyline({ className }: { className?: string }) {
  const lights = Array.from({ length: 90 }, (_, i) => ({ x: (i * 137.5) % 1600, y: 210 + ((i * 53) % 110), r: i % 7 === 0 ? 2.2 : 1.2 }));
  return (
    <svg viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020A18" stopOpacity="0" />
          <stop offset="0.7" stopColor="#0B2750" stopOpacity="0.55" />
          <stop offset="1" stopColor="#123B78" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="struct" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E2C58" />
          <stop offset="1" stopColor="#061632" />
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="1" r="0.7">
          <stop offset="0" stopColor="#2FD6F5" stopOpacity="0.35" />
          <stop offset="1" stopColor="#2FD6F5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="400" fill="url(#sky)" />
      <ellipse cx="800" cy="400" rx="900" ry="160" fill="url(#glow)" />
      <g fill="url(#struct)" stroke="#2FD6F5" strokeOpacity="0.25" strokeWidth="1">
        <rect x="80" y="170" width="34" height="230" rx="6" />
        <rect x="130" y="120" width="26" height="280" rx="6" />
        <rect x="300" y="230" width="140" height="170" />
        <circle cx="520" cy="300" r="56" />
        <rect x="600" y="90" width="22" height="310" rx="5" />
        <rect x="640" y="140" width="30" height="260" rx="6" />
        <rect x="700" y="210" width="190" height="190" />
        <rect x="920" y="60" width="16" height="340" />
        <rect x="980" y="160" width="40" height="240" rx="8" />
        <rect x="1040" y="250" width="160" height="150" />
        <circle cx="1270" cy="315" r="48" />
        <rect x="1340" y="130" width="28" height="270" rx="6" />
        <rect x="1390" y="200" width="120" height="200" />
        <rect x="1530" y="170" width="22" height="230" rx="5" />
      </g>
      <g stroke="#4C9BFF" strokeOpacity="0.35">
        {[230, 260, 290, 320, 350].map((y) => <line key={y} x1="300" x2="440" y1={y} y2={y} />)}
        {[240, 280, 320, 360].map((y) => <line key={y} x1="700" x2="890" y1={y} y2={y} />)}
        {[280, 320, 360].map((y) => <line key={y} x1="1040" x2="1200" y1={y} y2={y} />)}
      </g>
      <path d="M928 60 q-6 -18 0 -30 q8 14 0 30" fill="#FFB347" opacity="0.9">
        <animate attributeName="opacity" values="0.6;1;0.7" dur="1.6s" repeatCount="indefinite" />
      </path>
      <g>
        {lights.map((l, i) => (
          <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={i % 5 === 0 ? "#FFD27A" : "#7DE8FF"} opacity={0.75}>
            {i % 9 === 0 && <animate attributeName="opacity" values="0.3;1;0.3" dur={`${2 + (i % 4)}s`} repeatCount="indefinite" />}
          </circle>
        ))}
      </g>
    </svg>
  );
}

/** Drives the simulated plant clock + investigation playback. */
export function SimulationEngine() {
  useEffect(() => {
    const st = useApp.getState();
    useApp.setState({ realStart: Date.now() });
    const fromHash = window.location.hash.replace("#/", "") as ViewId;
    if (fromHash && NAV.some((n) => n.id === fromHash || fromHash === "value")) st.setView(fromHash);
    const plant = setInterval(() => useApp.getState().tickPlant(), DEMO.tickMs);
    const runs = setInterval(() => useApp.getState().advanceRuns(100), 100);
    return () => {
      clearInterval(plant);
      clearInterval(runs);
    };
  }, []);
  return null;
}

function PlantClock() {
  const clock = useApp((s) => s.clock);
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);
  return <span suppressHydrationWarning className="font-mono text-[13px] tabular-nums text-fg">{typeof window === "undefined" ? "06:58:20" : clock(true)}</span>;
}

export function Sidebar() {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const invs = useApp((s) => s.investigations);
  const pending = invs.filter((i) => i.status === "awaiting-approval").length;
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-ink-950/90 lg:flex">
      <div className="px-5 pb-4 pt-5">
        <Brand />
        <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400">Intelligent Methanol Plant</div>
        <div className="text-[12px] text-fg-muted">Agentic AI Operations Platform</div>
      </div>
      <nav className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.map((n) => {
          const active = view === n.id;
          const Icon = n.icon;
          return (
            <button key={n.id} id={`nav-${n.id}`} onClick={() => setView(n.id)} className={cn("group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[12.5px] transition", active ? "bg-gradient-to-r from-electric-600/25 to-transparent text-fg" : "text-fg-muted hover:bg-white/[0.03] hover:text-fg")}>
              {active && <span className="absolute left-0 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-full bg-cyan-400 shadow-[0_0_10px_#2FD6F5]" />}
              <span className={cn("w-5 font-mono text-[10.5px]", active ? "text-cyan-400" : "text-fg-dim")}>{n.n}</span>
              <Icon size={15} className={active ? "text-cyan-400" : "text-fg-dim group-hover:text-fg-muted"} />
              <span className="flex-1">{n.label}</span>
              {n.id === "investigation" && pending > 0 && <span className="rounded bg-warn/15 px-1.5 text-[10px] font-bold text-warn">{pending}</span>}
            </button>
          );
        })}
        <button onClick={() => setView("value")} className={cn("mt-3 flex w-full items-center gap-3 rounded-lg border border-dashed border-line-strong px-3 py-2 text-left text-[12px]", view === "value" ? "text-fg" : "text-fg-muted hover:text-fg")}>
          <Trophy size={14} className="text-warn" /> Executive Value Summary
        </button>
      </nav>
      <div className="m-3 rounded-lg border border-warn/25 bg-warn/[0.06] p-3 text-[10.5px] leading-snug text-fg-muted">
        <div className="mb-1 font-bold uppercase tracking-wider text-warn">Demo / simulation mode</div>
        Synthetic data only. Not connected to any DCS, SIS, PLC or OT network. All control actions disabled.
      </div>
    </aside>
  );
}

export function Topbar() {
  const setAssistantOpen = useApp((s) => s.setAssistantOpen);
  const setDemo = useApp((s) => s.setDemo);
  const resetDemo = useApp((s) => s.resetDemo);
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-ink-950/85 px-4 backdrop-blur md:px-6">
      <div className="lg:hidden"><Brand /></div>
      <select value={view} onChange={(e) => setView(e.target.value as ViewId)} className="rounded-md border border-line bg-ink-900 px-2 py-1 text-[12px] lg:hidden">
        {NAV.map((n) => <option key={n.id} value={n.id}>{n.n} {n.label}</option>)}
        <option value="value">Executive Value Summary</option>
      </select>
      <div className="hidden items-center gap-2 rounded-md border border-warn/40 bg-warn/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-warn md:flex">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warn" /> Demo / Simulation Mode
      </div>
      <div className="hidden items-center gap-2 text-[11px] text-fg-dim xl:flex">
        <Cpu size={13} /> Read-only data layer · Human approval enforced
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <div className="text-[9.5px] uppercase tracking-[0.16em] text-fg-dim">Plant time (simulated)</div>
          <PlantClock />
        </div>
        <Btn variant="ghost" onClick={resetDemo} className="hidden px-2 md:inline-flex"><RotateCcw size={14} /> Reset</Btn>
        <Btn id="start-demo" onClick={() => setDemo({ active: true, step: 0 })} variant="outline"><Play size={13} /> Start Executive Demo</Btn>
        <Btn id="ask-ai-top" onClick={() => setAssistantOpen(true)} className="hidden sm:inline-flex"><Sparkles size={13} /> Ask Methanol AI</Btn>
      </div>
    </header>
  );
}

const SUGGESTED = [
  "Why are we below production target?",
  "What is currently threatening production?",
  "Which asset has the highest risk?",
  "What changed during the last six hours?",
  "What is causing energy intensity to increase?",
  "Are we at risk of producing off-spec methanol?",
  "Give me the current plant brief.",
  "What does C-201 need attention for?",
];

export function AssistantPanel() {
  const open = useApp((s) => s.assistantOpen);
  const setOpen = useApp((s) => s.setAssistantOpen);
  const messages = useApp((s) => s.messages);
  const thinking = useApp((s) => s.thinking);
  const ask = useApp((s) => s.ask);
  const [q, setQ] = useState("");
  return (
    <>
      {!open && (
        <button id="ask-ai-fab" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-electric-600 to-cyan-500 px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-white shadow-glow">
          <Bot size={16} /> Ask Methanol AI
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.aside initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: "spring", damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[440px] flex-col border-l border-line-strong bg-ink-900/95 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-400/15 text-cyan-400"><Bot size={17} /></div>
                <div>
                  <div className="text-[13px] font-semibold">Methanol AI</div>
                  <div className="text-[10.5px] text-fg-dim">Answers from current simulated plant state · read-only</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-fg-dim hover:text-fg"><X size={18} /></button>
            </div>
            <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <div className="eyebrow">Suggested questions</div>
                  {SUGGESTED.map((s) => (
                    <button key={s} onClick={() => ask(s)} className="block w-full rounded-lg border border-line bg-ink-800/50 px-3 py-2 text-left text-[12.5px] text-fg-muted hover:border-cyan-400/40 hover:text-fg">{s}</button>
                  ))}
                </div>
              )}
              {messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-xl p-3 text-[12.5px] leading-relaxed", m.role === "user" ? "ml-10 bg-electric-600/25 text-fg" : "border border-line bg-ink-800/70 text-fg")}>
                  {m.text}
                  {m.sections?.map((s) => (
                    <div key={s.title} className="mt-2">
                      <div className="eyebrow text-cyan-400/80">{s.title}</div>
                      <ul className="mt-1 space-y-0.5 text-fg-muted">{s.items.map((i) => <li key={i}>• {i}</li>)}</ul>
                    </div>
                  ))}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">{m.sources.map((s) => <span key={s} className="rounded border border-line px-1.5 py-0.5 text-[10px] text-fg-dim">{s}</span>)}</div>
                  )}
                </motion.div>
              ))}
              {thinking && <div className="shimmer-text text-[12px]">Consulting plant state and agents…</div>}
              {messages.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTED.slice(0, 4).map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-line px-2.5 py-1 text-[11px] text-fg-muted hover:text-fg">{s}</button>)}
                </div>
              )}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) { ask(q.trim()); setQ(""); } }} className="flex gap-2 border-t border-line p-3">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about production, assets, energy, quality…" className="flex-1 rounded-lg border border-line bg-ink-950 px-3 py-2 text-[12.5px] outline-none focus:border-cyan-400/50" />
              <Btn className="px-3"><Send size={14} /></Btn>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────── Executive demo mode (presenter guide)
type Step = { title: string; text: string; enter: () => void };
const S = () => useApp.getState();
export const DEMO_STEPS: Step[] = [
  { title: "Plant overview", text: "TA’ZIZ methanol plant at a glance: production, quality, energy and availability, plus the full value chain from feed gas to loading.", enter: () => { S().setAssistantOpen(false); S().setView("overview"); S().setHighlight("kpis"); } },
  { title: "Production deviation appears", text: "Production is 2,450 t/day against a 2,550 t/day target, 4.0% below. The decline started at 04:12 in the synthesis loop.", enter: () => { S().setView("overview"); S().setHighlight("trend"); } },
  { title: "Operations Agent detects the issue", text: "The Methanol Operations Agent detected a sustained deviation, classified it as a production deviation and opened INV-26-0412.", enter: () => { S().setView("overview"); S().setHighlight("brief"); } },
  { title: "Council of Agents activates", text: "The Operations Agent convenes Process, Asset, Quality, Energy, Engineering and HSE agents. Each works on its own evidence.", enter: () => { S().setView("council"); S().setHighlight("council"); const s = S(); const hero = s.investigations.find((i) => i.scenarioId === "A")!; if (!s.runs[hero.id]) s.startInvestigation(hero.id); else s.setActiveInv(hero.id); } },
  { title: "Evidence is collected", text: "Historian trends, alarms, compressor condition, maintenance history, lab results, engineering documents and operating limits, all read-only.", enter: () => { S().setView("council"); S().setHighlight("feed"); } },
  { title: "Root cause proposed", text: "Likely cause: synthesis-loop compressor throughput degradation, with 87% confidence. Contributing factors and contradictions are shown openly.", enter: () => { const s = S(); s.completeInvestigation(s.investigations.find((i) => i.scenarioId === "A")!.id); s.setView("council"); s.setHighlight("conclusion"); } },
  { title: "Business impact calculated", text: "About 102 t/day lost now, 80–90 t/day recoverable. Economic exposure is illustrative, using an assumed value per tonne.", enter: () => { S().setView("council"); S().setHighlight("impact"); } },
  { title: "Recommended action appears", text: "A five-step investigation plan: verify, inspect, compare against the OEM curve, review anti-surge, then schedule inspection only if degradation persists.", enter: () => { S().setView("investigation"); S().setHighlight("recs"); } },
  { title: "Human approval required", text: "No plant action is executed by AI. The shift supervisor approves, assigns or dismisses, and every decision goes into the audit trail.", enter: () => { S().setView("investigation"); S().setHighlight("approval"); } },
  { title: "Executive value summary", text: "Illustrative value: earlier detection, faster root cause, recovered production and better knowledge access. To be validated with TA’ZIZ data.", enter: () => { S().setView("value"); S().setHighlight(null); } },
];

export function DemoMode() {
  const demo = useApp((s) => s.demo);
  const setDemo = useApp((s) => s.setDemo);
  const setHighlight = useApp((s) => s.setHighlight);
  useEffect(() => {
    if (demo.active) DEMO_STEPS[demo.step].enter();
  }, [demo.active, demo.step]);
  useEffect(() => {
    if (!demo.active) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") setDemo({ step: Math.min(DEMO_STEPS.length - 1, useApp.getState().demo.step + 1) });
      if (e.key === "ArrowLeft" || e.key === "PageUp") setDemo({ step: Math.max(0, useApp.getState().demo.step - 1) });
      if (e.key === "Escape") { setDemo({ active: false }); setHighlight(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [demo.active, setDemo, setHighlight]);
  if (!demo.active) return null;
  const step = DEMO_STEPS[demo.step];
  return (
    <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-4 left-1/2 z-[60] w-[min(860px,calc(100%-24px))] -translate-x-1/2 rounded-2xl border border-cyan-400/40 bg-ink-900/95 p-4 shadow-glow backdrop-blur-xl">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-electric-600 to-cyan-500 font-mono text-[15px] font-bold">{String(demo.step + 1).padStart(2, "0")}</div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow text-cyan-400">Executive demo · step {demo.step + 1} of {DEMO_STEPS.length}</div>
          <div className="text-[16px] font-semibold">{step.title}</div>
          <p className="mt-0.5 text-[12.5px] text-fg-muted">{step.text}</p>
          <div className="mt-2 flex gap-1">{DEMO_STEPS.map((_, i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i <= demo.step ? "bg-cyan-400" : "bg-white/10")} />)}</div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Btn id="demo-prev" variant="outline" disabled={demo.step === 0} onClick={() => setDemo({ step: demo.step - 1 })} className="px-2.5"><ChevronLeft size={14} /> Prev</Btn>
            {demo.step < DEMO_STEPS.length - 1 ? (
              <Btn id="demo-next" onClick={() => setDemo({ step: demo.step + 1 })} className="px-3">Next <ChevronRight size={14} /></Btn>
            ) : (
              <Btn id="demo-finish" variant="human" onClick={() => { setDemo({ active: false, step: 0 }); setHighlight(null); }}>Finish</Btn>
            )}
          </div>
          <button onClick={() => { setDemo({ active: false }); setHighlight(null); }} className="text-[10.5px] text-fg-dim hover:text-fg">Exit demo (Esc)</button>
        </div>
      </div>
    </motion.div>
  );
}

export function Highlight({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const h = useApp((s) => s.highlight);
  const on = h === id;
  useEffect(() => {
    if (on) document.getElementById(`hl-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [on, id]);
  return (
    <div id={`hl-${id}`} className={cn("rounded-xl transition-shadow duration-500", on && "ring-2 ring-cyan-400/80 ring-offset-2 ring-offset-ink-950 shadow-glow", className)}>
      {children}
    </div>
  );
}

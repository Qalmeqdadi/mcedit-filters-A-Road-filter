"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { Segmented, Select } from "@/components/ui/form";
import { NatureBadge } from "@/components/ui/badges";
import { paramsForPreset, runScenario, type FullScenario, type ScenarioRun } from "@/simulation/scenarios";
import type { World } from "@/simulation/generate";
import { LAB_YEARS, smallArea } from "@/simulation/lab/common";
import type { ScenarioPreset } from "@/types/census";
import { buildPlans, liveCensus, planSnapshot, type PlanSnapshot } from "@/simulation/lab/actions";

const PRESETS: Exclude<ScenarioPreset, "CUSTOM">[] = ["BASELINE", "HIGH_GROWTH", "LOW_GROWTH", "MIGRATION_SHOCK", "YOUTH_PRESSURE", "AGEING"];

const runCache = new WeakMap<World, Map<string, ScenarioRun>>();
/** Scenario runs are cached per world so moving between Planning Lab modules is instant. */
export function cachedRun(world: World, params: FullScenario): ScenarioRun {
  let m = runCache.get(world);
  if (!m) {
    m = new Map();
    runCache.set(world, m);
  }
  const key = JSON.stringify(params);
  let r = m.get(key);
  if (!r) {
    r = runScenario(world, world.totals.population, params);
    m.set(key, r);
  }
  return r;
}

/** Scenario + year shared by every Planning Lab module. */
export function useLab() {
  const engine = useEngine();
  const { lb } = useI18n();
  const world = engine.world;
  const labScenario = useApp((s) => s.labScenario);
  const saved = useApp((s) => s.scenarios);
  const active = useApp((s) => s.activeScenario);
  const storeYear = useApp((s) => s.projectionYear);
  const setYear = useApp((s) => s.setProjectionYear);
  const year = LAB_YEARS.includes(storeYear) ? storeYear : 2040;
  const { params, name } = useMemo((): { params: FullScenario; name: string } => {
    if (labScenario === "SIMULATOR" && active) return { params: active.params, name: active.name };
    const sv = saved.find((x) => x.id === labScenario);
    if (sv) return { params: sv.params, name: sv.name };
    const preset = (PRESETS as string[]).includes(labScenario) ? (labScenario as ScenarioPreset) : "BASELINE";
    return { params: paramsForPreset(preset), name: lb("preset", preset) };
  }, [labScenario, saved, active, lb]);
  const run = useMemo(() => cachedRun(world, params), [world, params]);
  const areaFor = useCallback((y: number) => smallArea(world, run, y), [world, run]);
  return { engine, world, run, params, scenarioName: name, year, setYear, baseYear: run.baseYear, areaFor };
}

export function LabBar({ children, hideYear }: { children?: ReactNode; hideYear?: boolean }) {
  const { L, lb } = useI18n();
  const labScenario = useApp((s) => s.labScenario);
  const setLabScenario = useApp((s) => s.setLabScenario);
  const saved = useApp((s) => s.scenarios);
  const active = useApp((s) => s.activeScenario);
  const storeYear = useApp((s) => s.projectionYear);
  const setYear = useApp((s) => s.setProjectionYear);
  const year = LAB_YEARS.includes(storeYear) ? storeYear : 2040;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{L("Planning scenario", "سيناريو التخطيط")}</span>
      <Select value={labScenario} onChange={(e) => setLabScenario(e.target.value)} aria-label={L("Planning scenario", "سيناريو التخطيط")} className="max-w-[230px]">
        {PRESETS.map((p) => <option key={p} value={p}>{lb("preset", p)}</option>)}
        {active ? <option value="SIMULATOR">{L("Scenario Simulator — current", "محاكي السيناريوهات — الحالي")}</option> : null}
        {saved.map((s) => <option key={s.id} value={s.id}>{L("Saved", "محفوظ")}: {s.name}</option>)}
      </Select>
      {hideYear ? null : (
        <>
          <span className="ms-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{L("Horizon", "الأفق")}</span>
          <Segmented value={year} onChange={setYear} options={LAB_YEARS.map((y) => ({ value: y, label: String(y) }))} />
        </>
      )}
      {children}
      <div className="flex-1" />
      <NatureBadge nature="SIMULATED" />
    </div>
  );
}

/** Collapsible "how this is calculated" block. */
export function Method({ children, title }: { children: ReactNode; title?: ReactNode }) {
  const { L } = useI18n();
  return (
    <details className="group mt-3 rounded-lg border border-line bg-card px-4 py-2.5 text-[12.5px] leading-relaxed text-ink-700">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-ink-900">
        <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
        {title ?? L("How this is calculated", "طريقة الحساب")}
      </summary>
      <div className="mt-2 space-y-1.5">{children}</div>
    </details>
  );
}

export function Formula({ children }: { children: ReactNode }) {
  return <div dir="ltr" className="rounded bg-sand-50 px-2 py-1 font-mono text-[11.5px] text-ink-900">{children}</div>;
}

/** Simple striped table with a horizontal scroll container (works at phone width). */
export function SimpleTable({ head, rows, minWidth = 560, highlight }: { head: ReactNode[]; rows: ReactNode[][]; minWidth?: number; highlight?: (i: number) => boolean }) {
  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full text-[12.5px]" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500">
            {head.map((h, i) => <th key={i} className={i === 0 ? "py-1.5 pe-2 text-start" : "px-2 text-end"}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-b border-line/60 ${highlight?.(i) ? "bg-navy-100/50" : ""}`}>
              {r.map((c, j) => <td key={j} className={j === 0 ? "py-1.5 pe-2 text-ink-900" : "px-2 text-end tabular"}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Action plans for the current Planning Lab scenario and horizon, computed after first paint (heavy). */
export function usePlans() {
  const { engine, world, run, areaFor, year } = useLab();
  const v = engine.version;
  const [state, setState] = useState<{ key: string; snap: PlanSnapshot } | null>(null);
  const key = `${JSON.stringify(run.params)}|${year}`;
  useEffect(() => {
    if (state?.key === key) return;
    const h = setTimeout(() => setState({ key, snap: planSnapshot(world, run, areaFor, year) }), 30);
    return () => clearTimeout(h);
  }, [key, world, run, areaFor, year, state?.key]);
  const snap = state?.key === key ? state.snap : null;
  const plans = useMemo(() => (snap ? buildPlans(world, snap, liveCensus(engine)) : null), [snap, world, engine, v]); // eslint-disable-line react-hooks/exhaustive-deps
  return { plans, snap, loading: !plans, year };
}

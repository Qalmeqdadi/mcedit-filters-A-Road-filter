"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { Select } from "@/components/ui/form";
import { NatureBadge } from "@/components/ui/badges";
import { AXES, buildFutures, runFuture, type Axis, type FutureRun } from "@/simulation/lab/futures";
import { LAB_YEARS } from "@/simulation/lab/common";
import { Segmented } from "@/components/ui/form";

const runCache = new Map<string, FutureRun>();

/** The four futures of the current 2 × 2 matrix, run one per tick so the page stays responsive. */
export function useFutures() {
  const engine = useEngine();
  const axes = useApp((s) => s.futureAxes) as [Axis["id"], Axis["id"]];
  const storeYear = useApp((s) => s.projectionYear);
  const year = LAB_YEARS.includes(storeYear) ? storeYear : 2040;
  const futures = useMemo(() => buildFutures(axes[0], axes[1]), [axes]);
  const keyOf = (k: string) => `${k}|${year}`;
  const [, setTick] = useState(0);
  const done = futures.filter((f) => runCache.has(keyOf(f.key))).length;
  useEffect(() => {
    const next = futures.find((f) => !runCache.has(`${f.key}|${year}`));
    if (!next) return;
    const h = setTimeout(() => {
      runCache.set(`${next.key}|${year}`, runFuture(engine.world, engine, next, year));
      setTick((t) => t + 1);
    }, 30);
    return () => clearTimeout(h);
  }, [futures, year, engine, done]);
  const runs = done === futures.length ? futures.map((f) => runCache.get(keyOf(f.key))!) : null;
  return { futures, runs, progress: done / futures.length, year, axes };
}

export function FuturesBar() {
  const { L, tx } = useI18n();
  const axes = useApp((s) => s.futureAxes);
  const setAxes = useApp((s) => s.setFutureAxes);
  const storeYear = useApp((s) => s.projectionYear);
  const setYear = useApp((s) => s.setProjectionYear);
  const year = LAB_YEARS.includes(storeYear) ? storeYear : 2040;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{L("Uncertainty A", "عدم اليقين أ")}</span>
      <Select value={axes[0]} onChange={(e) => setAxes([e.target.value, axes[1] === e.target.value ? axes[0] : axes[1]])} aria-label="A" data-testid="axis-a">
        {AXES.map((a) => <option key={a.id} value={a.id}>{tx(a.name)}</option>)}
      </Select>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{L("× Uncertainty B", "× عدم اليقين ب")}</span>
      <Select value={axes[1]} onChange={(e) => setAxes([axes[0] === e.target.value ? axes[1] : axes[0], e.target.value])} aria-label="B" data-testid="axis-b">
        {AXES.map((a) => <option key={a.id} value={a.id}>{tx(a.name)}</option>)}
      </Select>
      <span className="ms-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{L("Horizon", "الأفق")}</span>
      <Segmented value={year} onChange={setYear} options={LAB_YEARS.map((y) => ({ value: y, label: y === LAB_YEARS[0] ? L(`Today ${y}`, `اليوم ${y}`) : String(y) }))} />
      <div className="flex-1" />
      <NatureBadge nature="SIMULATED" />
    </div>
  );
}

export function FuturesProgress({ progress }: { progress: number }) {
  const { L } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-card py-14 text-[13px] text-ink-500">
      <span>{L("Running every Planning Lab model under four futures…", "تشغيل جميع نماذج مختبر التخطيط في أربعة مستقبلات…")}</span>
      <div className="h-1.5 w-56 rounded-full bg-sand-100"><div className="h-1.5 rounded-full bg-navy-600 transition-[width]" style={{ width: `${Math.max(5, progress * 100)}%` }} /></div>
    </div>
  );
}

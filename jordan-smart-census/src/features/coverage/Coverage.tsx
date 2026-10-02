"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { useEAPoints, useScope } from "@/hooks/useScope";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Kpi, ProgressBar } from "@/components/ui/kpi";
import { DataTable } from "@/components/ui/data-table";
import { EAStatusChip, EA_STATUS_COLOR } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { EChart } from "@/components/charts/echart";
import { barH, line, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { EADetail } from "@/features/gis/EADetail";
import { downloadCsv } from "@/lib/csv";
import { fmtInt, fmtPct, fmtSignedPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EAStatus, GovId } from "@/types/census";
import { navIndex } from "@/lib/nav";

const STATUSES: EAStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "COVERAGE_RISK", "REVISIT_REQUIRED"];

export function Coverage() {
  const engine = useEngine();
  const { t, tx, L, ar } = useI18n();
  const { govId, districtId, filter } = useScope();
  const { selectGov, selectDistrict } = useApp();
  const [ea, setEa] = useState<string | null>(null);
  const world = engine.world;
  const v = engine.version;
  const agg = useMemo(() => engine.aggregate(filter), [engine, v, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const byGov = engine.aggregateBy("govId");
  const byDist = engine.aggregateBy("districtId");
  const plan = useMemo(() => engine.planCurve(filter), [engine, filter]);
  const history = govId ? engine.govHistory[govId] : engine.history;
  const points = useEAPoints(govId);

  const sCurve = useMemo(() => {
    const days = Array.from({ length: engine.lastDay + 1 }, (_, i) => i + 1);
    const total = agg.dwellingsTrue;
    return line(days, [
      { name: t("actual"), data: days.map((_, i) => (history[i] ? history[i].visited / total : null)), color: VIZ[0], area: true },
      { name: t("plan"), data: plan, color: "#8a8270", dashed: true },
      { name: L("Households completed", "الأسر المكتملة"), data: days.map((_, i) => (history[i] ? history[i].completed / agg.hhEstimate : null)), color: VIZ[2] },
    ], { rtl: ar, fmt: (x) => fmtPct(x, 0), yMax: 1, markX: engine.config.fieldDays });
  }, [history, plan, agg, engine.lastDay, engine.config.fieldDays, ar, t, L]);

  const statusByGov = useMemo(() => {
    const govs = world.governorates;
    return barH(govs.map((g) => tx(g.name)), STATUSES.map((s) => ({ name: t(`st${s}`), data: govs.map((g) => byGov[g.id].eaByStatus[s] / Math.max(1, byGov[g.id].eas)), color: EA_STATUS_COLOR[s] })), { rtl: ar, stack: true, fmt: (x) => fmtPct(x, 0) });
  }, [world, byGov, ar, t, tx]);

  type DRow = { id: string; name: string; gov: string; govId: GovId; completion: number; expected: number; gap: number; response: number; eas: number; done: number; risk: number; revisit: number };
  const districtRows: DRow[] = useMemo(() => world.districts.filter((d) => !govId || d.govId === govId).map((d) => {
    const a = byDist[d.id];
    return { id: d.id, name: tx(d.name), gov: tx(world.gov[d.govId].name), govId: d.govId, completion: a.completionPct, expected: a.expectedPct, gap: a.completionPct - a.expectedPct, response: a.responseRate, eas: a.eas, done: a.eaByStatus.COMPLETED, risk: a.eaByStatus.COVERAGE_RISK, revisit: a.eaByStatus.REVISIT_REQUIRED };
  }), [world, byDist, govId, tx]);

  const dCols = useMemo<ColumnDef<DRow, unknown>[]>(() => [
    { accessorKey: "name", header: t("district") },
    { accessorKey: "gov", header: t("governorate") },
    { accessorKey: "completion", header: t("kCompletion"), cell: (c) => <div className="w-32"><div className="mb-0.5 text-[11.5px] tabular">{fmtPct(c.getValue() as number, 0)}</div><ProgressBar value={c.getValue() as number} expected={c.row.original.expected} /></div> },
    { accessorKey: "gap", header: L("vs plan", "مقابل الخطة"), cell: (c) => { const x = c.getValue() as number; return <span className={cn("font-semibold tabular", x < -0.08 ? "text-crit" : x < 0 ? "text-warn" : "text-ok")}>{fmtSignedPct(x, 0)}</span>; } },
    { accessorKey: "response", header: t("kResponse"), cell: (c) => fmtPct(c.getValue() as number) },
    { accessorKey: "eas", header: "EAs" },
    { accessorKey: "done", header: t("stCOMPLETED") },
    { accessorKey: "risk", header: t("stCOVERAGE_RISK") },
    { accessorKey: "revisit", header: t("stREVISIT_REQUIRED") },
  ], [t, L]);

  type RRow = { id: string; district: string; status: EAStatus; pending: number; nc: number; sup: number; done: number; progress: number };
  const revisitRows: RRow[] = useMemo(() => world.eas.filter(filter).map((a) => ({ a, s: engine.ea[a.index] })).filter(({ s }) => s.noContactPending + s.supervisorRevisit > 0 || s.status === "REVISIT_REQUIRED").map(({ a, s }) => ({ id: a.id, district: tx(world.district[a.districtId].name), status: s.status, pending: s.noContactPending + s.supervisorRevisit, nc: s.noContactPending, sup: s.supervisorRevisit, done: s.revisitsDone, progress: s.visited / a.dwellingsTrue })), [world, engine, v, filter, tx]); // eslint-disable-line react-hooks/exhaustive-deps
  const rCols = useMemo<ColumnDef<RRow, unknown>[]>(() => [
    { accessorKey: "id", header: t("ea"), cell: (c) => <span className="font-mono text-[12px]">{c.getValue() as string}</span> },
    { accessorKey: "district", header: t("district") },
    { accessorKey: "status", header: t("status"), cell: (c) => <EAStatusChip s={c.getValue() as EAStatus} /> },
    { accessorKey: "pending", header: L("Revisits pending", "زيارات متبقية") },
    { accessorKey: "nc", header: L("No-contact", "عدم اتصال") },
    { accessorKey: "sup", header: L("Supervisor-requested", "بطلب المشرف") },
    { accessorKey: "done", header: L("Revisits done", "زيارات منجزة") },
    { accessorKey: "progress", header: t("kCompletion"), cell: (c) => fmtPct(c.getValue() as number, 0) },
  ], [t, L]);

  return (
    <div>
      <PageHeader index={navIndex("/coverage")} title={t("nav07")} subtitle={L("Coverage against plan at every level, the revisit queue and the areas falling behind. Coverage is measured on dwellings visited; response on occupied dwellings.", "التغطية مقابل الخطة على كل المستويات، وقائمة زيارات المتابعة، والمناطق المتأخرة. تُقاس التغطية بالمساكن المزارة، والاستجابة بالمساكن المشغولة.")}>
        <Button onClick={() => downloadCsv("coverage-by-district.csv", districtRows.map((r) => ({ district_id: r.id, district: world.district[r.id].name.en, governorate: r.govId, completion: r.completion, plan: r.expected, gap: r.gap, response_rate: r.response, eas: r.eas, eas_completed: r.done, eas_risk: r.risk, eas_revisit: r.revisit })))}>{t("exportCsv")}</Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t("kCompletion")} value={fmtPct(agg.completionPct)} sub={`${t("plan")} ${fmtPct(agg.expectedPct, 0)} · ${fmtSignedPct(agg.completionPct - agg.expectedPct, 1)}`} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} tone={agg.completionPct - agg.expectedPct < -0.05 ? "warn" : undefined} />
        <Kpi label={t("kResponse")} value={fmtPct(agg.responseRate)} sub={`${fmtInt(agg.noContactFinal)} ${L("final non-response", "عدم استجابة نهائي")}`} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("EAs completed", "مناطق العدّ المكتملة")} value={fmtInt(agg.eaByStatus.COMPLETED)} sub={`${fmtPct(agg.eaByStatus.COMPLETED / Math.max(1, agg.eas), 0)} ${L("of", "من")} ${fmtInt(agg.eas)}`} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={t("stCOVERAGE_RISK")} value={fmtInt(agg.eaByStatus.COVERAGE_RISK)} tone={agg.eaByStatus.COVERAGE_RISK > 50 ? "crit" : undefined} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={t("stREVISIT_REQUIRED")} value={fmtInt(agg.eaByStatus.REVISIT_REQUIRED)} sub={`${fmtInt(agg.noContactPending)} ${L("households awaiting revisit", "أسرة بانتظار زيارة")}`} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Vacancy found", "نسبة الشواغر المكتشفة")} value={fmtPct(agg.vacant / Math.max(1, agg.visited))} sub={`${fmtInt(agg.vacant)} ${L("vacant dwellings", "مسكن شاغر")}`} nature="SYNTHETIC_OPERATIONAL" />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <JordanMap
          height={500}
          title={L("District completion & EA status", "إنجاز الألوية وحالة مناطق العدّ")}
          govValues={Object.fromEntries(world.governorates.map((g) => [g.id, byGov[g.id].completionPct])) as Record<GovId, number>}
          districtValues={Object.fromEntries(world.districts.map((d) => [d.id, byDist[d.id].completionPct]))}
          scale="pct"
          domain={[0, 1]}
          format={(x) => fmtPct(x, 0)}
          legendTitle={t("layerCompletion")}
          selectedGov={govId}
          selectedDistrict={districtId}
          onSelectGov={selectGov}
          onSelectDistrict={(d) => selectDistrict(d)}
          onSelectEA={setEa}
          eaPoints={govId ? points : undefined}
          eaLegend={govId ? STATUSES.map((s) => ({ color: EA_STATUS_COLOR[s], label: t(`st${s}`) })) : undefined}
          sources={["OPS_FIELDWORK", "GEO_ADM2"]}
          tooltipExtra={(kind, id) => { const a = kind === "gov" ? byGov[id] : byDist[id]; return a ? <span className="tabular">{t("plan")}: <b>{fmtPct(a.expectedPct, 0)}</b> · {t("kResponse")}: <b>{fmtPct(a.responseRate)}</b></span> : null; }}
        />
        <Panel title={L("Coverage S-curve — actual vs plan", "منحنى التغطية — الفعلي مقابل الخطة")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} subtitle={govId ? tx(world.gov[govId].name) : t("allJordan")}>
          <EChart option={sCurve} height={440} />
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Panel title={L("EA status mix by governorate", "توزيع حالات مناطق العدّ حسب المحافظة")} nature="SYNTHETIC_OPERATIONAL"><EChart option={statusByGov} height={380} /></Panel>
        <Panel title={L("Districts — sorted by gap to plan", "الألوية — مرتبة حسب الفجوة عن الخطة")} nature="SYNTHETIC_OPERATIONAL">
          <DataTable data={districtRows} columns={dCols} initialSort={[{ id: "gap", desc: false }]} pageSize={10} onRowClick={(r) => selectDistrict(r.id, r.govId)} compact />
        </Panel>
      </div>

      <Panel className="mt-3" title={L("Revisit queue", "قائمة زيارات المتابعة")} nature="SYNTHETIC_OPERATIONAL" subtitle={L("No-contact households and supervisor-requested verification visits. Click an EA for detail.", "أسر لم يتم الاتصال بها وزيارات تحقق بطلب المشرف. انقر على منطقة عدّ للتفاصيل.")}>
        <DataTable data={revisitRows} columns={rCols} initialSort={[{ id: "pending", desc: true }]} pageSize={10} onRowClick={(r) => setEa(r.id)} compact emptyText={L("No revisits pending.", "لا توجد زيارات متبقية.")} />
      </Panel>

      <Sheet open={!!ea} onOpenChange={(o) => !o && setEa(null)} title={`${t("ea")} ${ea ?? ""}`} width={600}>
        {ea ? <EADetail eaId={ea} /> : null}
      </Sheet>
    </div>
  );
}

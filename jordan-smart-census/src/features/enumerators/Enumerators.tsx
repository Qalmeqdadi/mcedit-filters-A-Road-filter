"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { DataTable } from "@/components/ui/data-table";
import { EnumStatusChip, EAStatusChip, SeverityBadge, NatureBadge, EA_STATUS_COLOR } from "@/components/ui/badges";
import { Input, Select, Field } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Sheet, Modal } from "@/components/ui/dialog";
import { Kpi } from "@/components/ui/kpi";
import { EChart } from "@/components/charts/echart";
import { barV, barH, VIZ } from "@/components/charts/builders";
import { StatRow } from "@/components/charts/common";
import { JordanMap } from "@/features/gis/JordanMap";
import { generateBlocks } from "@/simulation/generate";
import { optimiseRoute } from "@/simulation/lab/routing";
import { medianFromHist } from "@/simulation/anomalies";
import { downloadCsv } from "@/lib/csv";
import { fmt1, fmtInt, fmtPct, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EnumeratorStatus } from "@/types/census";
import { navIndex } from "@/lib/nav";

interface Row {
  i: number;
  id: string;
  name: string;
  gov: string;
  district: string;
  eas: string;
  supervisor: string;
  assigned: number;
  completed: number;
  pending: number;
  refusals: number;
  duration: number;
  perDay: number;
  validation: number;
  coverage: number;
  risk: number;
  status: EnumeratorStatus;
}

const STATUSES: EnumeratorStatus[] = ["ACTIVE", "IDLE", "OFFLINE", "UNDER_REVIEW", "COMPLETED", "NOT_STARTED"];

export function Enumerators() {
  const engine = useEngine();
  const { t, tx, L, ar } = useI18n();
  const { govId } = useScope();
  const focus = useApp((s) => s.focusEnumeratorId);
  const setFocus = useApp((s) => s.setFocusEnumerator);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [riskOnly, setRiskOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const world = engine.world;
  const v = engine.version;

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    world.enumerators.forEach((e, i) => {
      if (govId && e.govId !== govId) return;
      const s = engine.en[i];
      if (status !== "ALL" && s.status !== status) return;
      if (riskOnly && s.riskScore < 50) return;
      const ad = engine.activeDays[i];
      out.push({
        i, id: e.id, name: tx(e.name), gov: tx(world.gov[e.govId].name), district: tx(world.district[e.districtId].name), eas: e.eaIds.join(" "), supervisor: e.supervisorId,
        assigned: s.assigned, completed: s.completed, pending: s.pending, refusals: s.refusals, duration: s.durCount ? s.durSum / s.durCount : 0, perDay: ad ? s.completed / ad : 0,
        validation: s.validationScore, coverage: s.coverageScore, risk: s.riskScore, status: s.status,
      });
    });
    return out;
  }, [world, engine, v, govId, status, riskOnly, tx]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<Row, unknown>[]>(() => [
    { accessorKey: "id", header: L("Enumerator ID", "رقم العدّاد"), cell: (c) => <span className="font-mono text-[12px] font-medium">{c.getValue() as string}</span> },
    { accessorKey: "name", header: L("Name (synthetic)", "الاسم (اصطناعي)") },
    { accessorKey: "gov", header: t("governorate") },
    { accessorKey: "district", header: t("district") },
    { accessorKey: "eas", header: "EA", cell: (c) => <span className="font-mono text-[11.5px]">{(c.getValue() as string).split(" ").slice(0, 2).join(", ")}{(c.getValue() as string).split(" ").length > 2 ? "…" : ""}</span> },
    { accessorKey: "supervisor", header: L("Supervisor", "المشرف"), cell: (c) => <span className="font-mono text-[11.5px]">{c.getValue() as string}</span> },
    { accessorKey: "assigned", header: L("Assigned", "المسند"), cell: (c) => fmtInt(c.getValue() as number) },
    { accessorKey: "completed", header: L("Completed", "المكتمل"), cell: (c) => fmtInt(c.getValue() as number) },
    { accessorKey: "pending", header: L("Pending", "المتبقي"), cell: (c) => fmtInt(c.getValue() as number) },
    { accessorKey: "refusals", header: L("Refusals", "الرفض"), cell: (c) => fmtInt(c.getValue() as number) },
    { accessorKey: "duration", header: L("Avg min", "متوسط الدقائق"), cell: (c) => { const x = c.getValue() as number; return <span className={cn(x > 0 && x < 8 && "font-semibold text-crit")}>{x ? fmt1(x) : "—"}</span>; } },
    { accessorKey: "perDay", header: L("Int./day", "مقابلة/يوم"), cell: (c) => { const x = c.getValue() as number; return <span className={cn(x > 2 * engine.config.interviewsPerDay && "font-semibold text-crit")}>{x ? fmt1(x) : "—"}</span>; } },
    { accessorKey: "validation", header: L("Validation", "التدقيق") },
    { accessorKey: "coverage", header: L("Coverage", "التغطية") },
    { accessorKey: "risk", header: t("riskScore"), cell: (c) => { const x = c.getValue() as number; return <span className={cn("rounded px-1.5 py-0.5 text-[11.5px] font-semibold", x >= 80 ? "bg-crit-bg text-crit" : x >= 50 ? "bg-warn-bg text-warn" : "text-ink-700")}>{x}</span>; } },
    { accessorKey: "status", header: t("status"), cell: (c) => <EnumStatusChip s={c.getValue() as EnumeratorStatus} /> },
  ], [t, L, engine.config.interviewsPerDay]);

  const hist = useMemo(() => {
    const bins = new Array(12).fill(0);
    for (const r of rows) if (r.perDay > 0) bins[Math.min(11, Math.floor(r.perDay / 3))]++;
    return barV(bins.map((_, i) => (i === 11 ? "33+" : `${i * 3}–${i * 3 + 3}`)), [{ name: L("Enumerators", "العدّادون"), data: bins, color: VIZ[0] }], { rtl: ar, fmt: (x) => fmtInt(x) });
  }, [rows, ar, L]);

  const statusCounts = STATUSES.map((s) => rows.filter((r) => r.status === s).length);

  return (
    <div>
      <PageHeader index={navIndex("/enumerators")} title={t("nav05")} subtitle={L("Every synthetic enumerator with live performance. Names are synthetic pseudonyms — no real persons. Risk profiles are never shown; only observed behaviour is.", "جميع العدّادين الاصطناعيين مع أداء مباشر. الأسماء مستعارة اصطناعية — لا أشخاص حقيقيون. لا تُعرض ملفات المخاطر المخفية، بل السلوك المرصود فقط.")}>
        <Button onClick={() => downloadCsv(`enumerator-performance${govId ? "-" + govId : ""}.csv`, rows.map((r) => ({ enumerator_id: r.id, name_synthetic: world.enumerators[r.i].name.en, governorate: world.enumerators[r.i].govId, district: world.enumerators[r.i].districtId, eas: r.eas, supervisor: r.supervisor, assigned: r.assigned, completed: r.completed, pending: r.pending, refusals: r.refusals, avg_interview_min: r.duration, interviews_per_day: r.perDay, validation_score: r.validation, coverage_score: r.coverage, risk_score: r.risk, status: r.status })))}>{t("exportCsv")} ({fmtInt(rows.length)})</Button>
      </PageHeader>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="grid grid-cols-2 gap-2.5">
          <Kpi label={L("Enumerators in scope", "العدّادون في النطاق")} value={fmtInt(rows.length)} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_ENUMERATORS"]} />
          <Kpi label={L("High-risk (≥ 80)", "عالية الخطورة (≥ 80)")} value={fmtInt(rows.filter((r) => r.risk >= 80).length)} tone={rows.some((r) => r.risk >= 80) ? "crit" : undefined} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_ANOMALY"]} />
          <Kpi label={L("Median interviews / day", "الوسيط للمقابلات يومياً")} value={fmt1(median(rows.filter((r) => r.perDay > 0).map((r) => r.perDay)))} nature="SYNTHETIC_OPERATIONAL" />
          <Kpi label={L("Mean validation score", "متوسط درجة التدقيق")} value={fmt1(rows.reduce((s, r) => s + r.validation, 0) / Math.max(1, rows.length))} nature="SYNTHETIC_OPERATIONAL" />
        </div>
        <Panel title={L("Status", "الحالة")} nature="SYNTHETIC_OPERATIONAL">
          <EChart option={barH(STATUSES.map((s) => t(`es${s}`)), [{ name: t("count"), data: statusCounts, color: VIZ[0] }], { rtl: ar, showLabels: true, fmt: (x) => fmtInt(x) })} height={170} />
        </Panel>
        <Panel title={L("Productivity distribution (interviews / active day)", "توزيع الإنتاجية (مقابلات / يوم عمل)")} nature="SYNTHETIC_OPERATIONAL" subtitle={L("The far right tail is what the anomaly engine examines.", "الذيل الأيمن البعيد هو ما يفحصه محرك الشذوذ.")}>
          {rows.some((r) => r.perDay > 0) ? <EChart option={hist} height={170} /> : <p className="py-14 text-center text-[12.5px] text-ink-500">{L("Available once fieldwork starts.", "يتاح بعد بدء العمل الميداني.")}</p>}
        </Panel>
      </div>

      <Panel className="mt-3">
        <DataTable
          data={rows}
          columns={columns}
          globalFilter={q}
          pageSize={15}
          onRowClick={(r) => setSelected(r.id)}
          getRowId={(r) => r.id}
          initialSort={[{ id: "risk", desc: true }]}
          toolbar={
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Input placeholder={L("Search ID, name, EA, supervisor…", "ابحث بالرقم أو الاسم أو منطقة العدّ أو المشرف…")} value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
              <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("status")}>
                <option value="ALL">{t("status")}: {t("all")}</option>
                {STATUSES.map((s) => <option key={s} value={s}>{t(`es${s}`)}</option>)}
              </Select>
              <label className="flex items-center gap-1.5 text-[12.5px] text-ink-700"><input type="checkbox" checked={riskOnly} onChange={(e) => setRiskOnly(e.target.checked)} />{L("Risk ≥ 50 only", "الخطورة ≥ 50 فقط")}</label>
              <span className="text-[12px] text-ink-500">{govId ? `${t("scope")}: ${tx(world.gov[govId].name)}` : t("allJordan")}</span>
            </div>
          }
        />
      </Panel>

      <EnumeratorSheet key={selected ?? focus ?? "none"} id={selected ?? focus} onClose={() => { setSelected(null); setFocus(null); }} />
    </div>
  );
}

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function EnumeratorSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const engine = useEngine();
  const { t, tx, L, ar, lb, locale } = useI18n();
  const actor = useApp((s) => s.actor);
  const bump = useApp((s) => s.bump);
  const [routeStep, setRouteStep] = useState(Number.POSITIVE_INFINITY);
  const [playing, setPlaying] = useState(false);
  const [action, setAction] = useState<null | "RETRAIN" | "VERIFY_SAMPLE" | "SUSPEND_REASSIGN">(null);
  const [note, setNote] = useState("");
  const i = id ? engine.world.enumIdx.get(id) : undefined;
  const e = i !== undefined ? engine.world.enumerators[i] : null;
  const s = i !== undefined ? engine.en[i] : null;

  const plan = useMemo(() => {
    if (!e) return null;
    const first = engine.world.eas[engine.world.eaIdx.get(e.eaIds[0])!];
    const stops = e.eaIds.flatMap((id) => generateBlocks(engine.world.config.seed, engine.world.eas[engine.world.eaIdx.get(id)!]).map((b) => [b.lng, b.lat] as [number, number]));
    return optimiseRoute([first.lng, first.lat], stops);
  }, [e, engine.world]);
  const route = plan?.optimised ?? ([] as [number, number][]);

  useEffect(() => {
    if (!playing) return;
    const h = setInterval(() => setRouteStep((x) => { if (x >= route.length) { setPlaying(false); return x; } return x + 1; }), 350);
    return () => clearInterval(h);
  }, [playing, route.length]);

  if (!e || !s || i === undefined) return <Sheet open={false} onOpenChange={() => onClose()} title="">{null}</Sheet>;
  const anomalies = engine.anomalies.filter((a) => a.subjectId === e.id || e.eaIds.includes(a.subjectId));
  const issues = engine.issues.filter((q) => q.enumeratorId === e.id);
  const eaStates = e.eaIds.map((x) => ({ id: x, a: engine.world.eas[engine.world.eaIdx.get(x)!], s: engine.ea[engine.world.eaIdx.get(x)!] }));
  const outcomes = eaStates.reduce((acc, x) => ({ completed: acc.completed + x.s.completed, refusals: acc.refusals + x.s.refusals, vacant: acc.vacant + x.s.vacantFound, nc: acc.nc + x.s.noContactPending + x.s.noContactFinal, rev: acc.rev + x.s.supervisorRevisit + x.s.noContactPending, done: acc.done + x.s.revisitsDone }), { completed: 0, refusals: 0, vacant: 0, nc: 0, rev: 0, done: 0 });
  const medDur = medianFromHist(s.durHist);
  const bbox: [number, number, number, number] = [Math.min(...route.map((p) => p[0])) - 0.01, Math.min(...route.map((p) => p[1])) - 0.01, Math.max(...route.map((p) => p[0])) + 0.01, Math.max(...route.map((p) => p[1])) + 0.01];
  const doIntervention = () => {
    if (!action) return;
    engine.enumeratorIntervention(e.id, action, actor, note || "—");
    setAction(null);
    setNote("");
    bump();
  };

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()} width={760} title={<span className="flex items-center gap-2"><span className="font-mono">{e.id}</span> · {tx(e.name)} <EnumStatusChip s={s.status} /></span>} description={`${tx(engine.world.gov[e.govId].name)} › ${tx(engine.world.district[e.districtId].name)} · ${L("Supervisor", "المشرف")} ${e.supervisorId} · ${L("synthetic pseudonym", "اسم مستعار اصطناعي")}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label={L("Completed / assigned", "المكتمل / المسند")} value={`${fmtInt(s.completed)}`} sub={`/ ${fmtInt(s.assigned)}`} />
          <Kpi label={L("Interviews / active day", "مقابلات / يوم عمل")} value={fmt1(engine.activeDays[i] ? s.completed / engine.activeDays[i] : 0)} sub={`${L("plan", "الخطة")} ${engine.config.interviewsPerDay}`} tone={engine.activeDays[i] && s.completed / engine.activeDays[i] > 2 * engine.config.interviewsPerDay ? "crit" : undefined} />
          <Kpi label={L("Median interview", "الوسيط للمقابلة")} value={`${fmt1(medDur)}′`} tone={medDur > 0 && medDur < 8 ? "crit" : undefined} />
          <Kpi label={`${L("Validation", "التدقيق")} / ${t("riskScore")}`} value={`${s.validationScore}`} sub={`${t("riskScore")} ${s.riskScore}`} tone={s.riskScore >= 80 ? "crit" : undefined} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Panel title={L("Daily productivity", "الإنتاجية اليومية")} nature="SYNTHETIC_OPERATIONAL">
            {s.daily.length ? <EChart option={barV(s.daily.map((_, d) => `${d + 1}`), [{ name: L("Interviews", "المقابلات"), data: s.daily, color: VIZ[0] }], { rtl: ar })} height={180} /> : <p className="py-8 text-center text-[12px] text-ink-500">{t("feedEmpty")}</p>}
          </Panel>
          <Panel title={L("Household outcomes", "نتائج الأسر")} nature="SYNTHETIC_OPERATIONAL">
            <EChart option={barH([L("Completed", "مكتمل"), L("Refusal", "رفض"), L("No contact", "عدم اتصال"), L("Vacant", "شاغر")], [{ name: t("count"), data: [outcomes.completed, outcomes.refusals, outcomes.nc, outcomes.vacant], color: VIZ[2] }], { rtl: ar, showLabels: true })} height={180} />
          </Panel>
        </div>

        <Panel title={L("Assigned geography & operational route simulation", "النطاق الجغرافي المسند ومحاكاة المسار التشغيلي")} nature="SIMULATED" sources={["SIM_FRAME"]} actions={<><Button size="xs" onClick={() => { setRouteStep(1); setPlaying(true); }}><Play size={11} />{L("Play route", "تشغيل المسار")}</Button><Button size="xs" onClick={() => { setPlaying(false); setRouteStep(Number.POSITIVE_INFINITY); }}><RotateCcw size={11} /></Button></>}>
          <JordanMap height={280} fitTo={bbox} eaPoints={eaStates.map((x) => ({ id: x.id, lng: x.a.lng, lat: x.a.lat, color: EA_STATUS_COLOR[x.s.status], govId: x.a.govId, districtId: x.a.districtId }))} routePoints={route.slice(0, routeStep)} showLabelsDefault={false} />
          <div className="mt-2 flex flex-wrap gap-2">
            {eaStates.map((x) => <span key={x.id} className="flex items-center gap-1.5 rounded border border-line px-2 py-0.5 text-[12px]"><span className="font-mono">{x.id}</span><EAStatusChip s={x.s.status} /><span className="text-ink-500 tabular">{fmtPct(x.s.visited / x.a.dwellingsTrue, 0)}</span></span>)}
          </div>
          {plan ? (
            <div className="mt-2 grid grid-cols-3 gap-2 rounded-md bg-sand-50 px-3 py-2 text-[12px]">
              <div><div className="text-ink-500">{L("Listed order", "الترتيب المدرج")}</div><div className="font-semibold tabular">{fmt1(plan.listedKm)} km</div></div>
              <div><div className="text-ink-500">{L("Optimised (2-opt)", "المحسَّن (2-opt)")}</div><div className="font-semibold tabular text-ok">{fmt1(plan.optimisedKm)} km</div></div>
              <div><div className="text-ink-500">{L("Saved", "الوفر")}</div><div className="font-semibold tabular">{fmtPct(plan.savedPct, 0)} · {fmtInt(plan.savedMinutes)} {L("min walking", "دقيقة مشي")}</div></div>
            </div>
          ) : null}
          <p className="mt-1.5 text-[11.5px] text-ink-500">{L("Route through all statistical blocks of the assignment: nearest-neighbour start improved by 2-opt; straight-line distance × 1.3 street detour, 4.5 km/h walking (synthetic block positions).", "المسار عبر جميع البلوكات الإحصائية للمهمة: بداية بأقرب جار ثم تحسين 2-opt؛ المسافة المستقيمة × 1.3 لتعرج الشوارع، والمشي 4.5 كم/س (مواقع بلوكات اصطناعية).")}</p>
        </Panel>

        <div className="grid gap-3 md:grid-cols-2">
          <Panel title={L("Interview timeline (last shifts)", "الخط الزمني للمقابلات (آخر الفترات)")} nature="SYNTHETIC_OPERATIONAL">
            <div className="flex h-[70px] items-end gap-1">
              {s.stepLog.map((n, k) => <div key={k} className="flex-1 rounded-t bg-navy-600" style={{ height: `${Math.min(100, (n / Math.max(1, ...s.stepLog)) * 100)}%` }} title={`${n}`} />)}
            </div>
            <div className="mt-1 text-[11px] text-ink-500">{L("Interviews per shift over the last 8 shifts.", "المقابلات لكل فترة خلال آخر 8 فترات.")}</div>
            <StatRow label={L("Revisits pending / done", "زيارات المتابعة المتبقية / المنجزة")} value={`${fmtInt(outcomes.rev)} / ${fmtInt(outcomes.done)}`} />
            <StatRow label={L("GPS points outside EA", "نقاط GPS خارج المنطقة")} value={`${fmtInt(s.gpsOutside)}`} sub={fmtPct(s.gpsOutside / Math.max(1, s.completed))} />
            <StatRow label={L("Failed validation", "إخفاق التدقيق")} value={fmtInt(s.failedValidation)} />
          </Panel>
          <Panel title={L("Anomalies & quality issues", "حالات الشذوذ ومسائل الجودة")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_ANOMALY", "OPS_QUALITY"]}>
            {anomalies.length + issues.length === 0 ? <p className="py-4 text-[12px] text-ink-500">{L("None detected.", "لم يُرصد شيء.")}</p> : (
              <ul className="space-y-2">
                {anomalies.map((a) => (
                  <li key={a.id} className="text-[12px]"><div className="flex items-center gap-2"><SeverityBadge s={a.severity} /><b>{lb("anomalyKind", a.kind)}</b>{a.decision ? <span className="text-ink-500">· {lb("decision", a.decision.action)}</span> : null}</div><p className="mt-0.5 text-ink-700">{tx(a.what)}</p></li>
                ))}
                {issues.slice(0, 6).map((q) => <li key={q.id} className="text-[12px]"><SeverityBadge s={q.severity} /> <span className="text-ink-700">{tx(q.message)}</span></li>)}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title={L("Supervisor interventions", "تدخلات المشرف")} nature="SYNTHETIC_OPERATIONAL" actions={<div className="flex gap-1.5"><Button size="xs" onClick={() => setAction("RETRAIN")}>{L("Retrain", "إعادة تدريب")}</Button><Button size="xs" onClick={() => setAction("VERIFY_SAMPLE")}>{L("Verify 10% sample", "التحقق من عينة 10%")}</Button><Button size="xs" variant="danger" onClick={() => setAction("SUSPEND_REASSIGN")}>{L("Suspend & reassign", "إيقاف وإعادة إسناد")}</Button></div>}>
          {s.interventions.length === 0 ? <p className="text-[12px] text-ink-500">{L("No interventions recorded.", "لا توجد تدخلات مسجلة.")}</p> : (
            <ul className="space-y-1.5">
              {s.interventions.map((x, k) => <li key={k} className="flex gap-2 text-[12px]"><span className="w-[110px] shrink-0 text-ink-400 tabular">{fmtDateTime(engine.timeOf(x.step), locale)}</span><b className="shrink-0">{x.action.replace(/_/g, " ")}</b><span className="text-ink-700">{x.by} — {x.note}</span></li>)}
            </ul>
          )}
          <Callout className="mt-2" tone="info">{L("Interventions change future field behaviour or schedule verification visits. They never edit submitted responses.", "تغيّر التدخلات السلوك الميداني المستقبلي أو تجدول زيارات تحقق، ولا تعدّل الإجابات المرسلة أبداً.")}</Callout>
        </Panel>
        <div className="flex items-center gap-2 text-[11px] text-ink-500"><NatureBadge nature="SYNTHETIC_OPERATIONAL" />{L("All figures for this enumerator are simulated.", "جميع أرقام هذا العدّاد محاكاة.")}</div>
      </div>
      <Modal open={!!action} onOpenChange={(o) => !o && setAction(null)} title={L("Record supervisor intervention", "تسجيل تدخل المشرف")} footer={<><Button onClick={() => setAction(null)}>{t("cancel")}</Button><Button variant="primary" onClick={doIntervention}>{t("confirm")}</Button></>}>
        <div className="space-y-2 text-[13px] text-ink-700">
          <p><b>{action?.replace(/_/g, " ")}</b> — {e.id} · {L("by", "بواسطة")} {actor}</p>
          <Field label={t("notes")}><Input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder={L("Reason / instruction", "السبب / التعليمات")} /></Field>
        </div>
      </Modal>
    </Sheet>
  );
}

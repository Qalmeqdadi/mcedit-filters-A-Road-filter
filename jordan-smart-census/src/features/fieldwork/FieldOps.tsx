"use client";

import { CloudLightning } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { useEAPoints, useScope } from "@/hooks/useScope";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi, ProgressBar } from "@/components/ui/kpi";
import { EA_STATUS_COLOR } from "@/components/ui/badges";
import { EChart } from "@/components/charts/echart";
import { barH, barV, line, VIZ } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { SimControls } from "@/components/shell/Topbar";
import { fmtCompact, fmtDateTime, fmtInt, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EAStatus, GovId } from "@/types/census";

const STATUSES: EAStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "COVERAGE_RISK", "REVISIT_REQUIRED"];

export function FieldOps() {
  const engine = useEngine();
  const { t, tx, L, ar, locale } = useI18n();
  const { govId, filter } = useScope();
  const selectGov = useApp((s) => s.selectGov);
  const world = engine.world;
  const v = engine.version;
  const agg = useMemo(() => engine.aggregate(filter), [engine, v, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const byGov = engine.aggregateBy("govId");
  const points = useEAPoints(null);
  const history = govId ? engine.govHistory[govId] : engine.history;
  const last = history[history.length - 1];
  const tasks = engine.tasks;
  const openTasks = tasks.filter((x) => x.status === "OPEN" && (!govId || x.supervisorId.startsWith(govId)));
  const doneTasks = tasks.filter((x) => x.status === "DONE" && (!govId || x.supervisorId.startsWith(govId))).length;

  const enumStatus = useMemo(() => {
    const c: Record<string, number> = { ACTIVE: 0, IDLE: 0, OFFLINE: 0, UNDER_REVIEW: 0, COMPLETED: 0, NOT_STARTED: 0 };
    world.enumerators.forEach((e, i) => { if (!govId || e.govId === govId) c[engine.en[i].status]++; });
    return c;
  }, [world, engine, v, govId]); // eslint-disable-line react-hooks/exhaustive-deps

  const outcomes = useMemo(() => barH(
    [L("Completed interviews", "مقابلات مكتملة"), L("Refusals", "رفض"), L("No contact — pending revisit", "عدم اتصال — بانتظار زيارة"), L("Final non-contact", "عدم اتصال نهائي"), L("Vacant dwellings", "مساكن شاغرة")],
    [{ name: t("count"), data: [agg.completed, agg.refusals, agg.noContactPending, agg.noContactFinal, agg.vacant], color: VIZ[0] }],
    { rtl: ar, showLabels: true, fmt: (x) => fmtCompact(x, locale) },
  ), [agg, ar, L, t, locale]);

  const regional = useMemo(() => {
    const days = Array.from({ length: Math.max(1, engine.history.length) }, (_, i) => i + 1);
    const regions = ["North", "Central", "South"] as const;
    return line(days, regions.map((r, i) => {
      const govs = world.governorates.filter((g) => g.region === r).map((g) => g.id);
      const total = govs.reduce((s, g) => s + byGov[g].dwellingsTrue, 0);
      return { name: L(r, r === "North" ? "الشمال" : r === "Central" ? "الوسط" : "الجنوب"), data: days.map((_, d) => govs.reduce((s, g) => s + (engine.govHistory[g][d]?.visited ?? 0), 0) / total), color: VIZ[i] };
    }), { rtl: ar, fmt: (x) => fmtPct(x, 0), yMax: 1 });
  }, [engine, world, byGov, ar, L, v]); // eslint-disable-line react-hooks/exhaustive-deps

  const daily = useMemo(() => barV(history.map((h) => `${h.day + 1}`), [{ name: t("interviewsPerDay"), data: history.map((h) => h.interviewsToday), color: VIZ[2] }], { rtl: ar, fmt: (x) => fmtCompact(x, locale) }), [history, ar, t, locale]);

  const dayChips = Array.from({ length: engine.config.fieldDays + 4 + 1 }, (_, i) => i);

  return (
    <div>
      <PageHeader index="04" title={t("nav04")} subtitle={L("National fieldwork simulation. Four shifts per field day; enumerators complete households, meet refusals and vacant dwellings, schedule revisits, and supervisors receive tasks. Seeded and reproducible.", "محاكاة العمل الميداني الوطني. أربع فترات يومياً؛ يكمل العدّادون الأسر ويواجهون الرفض والمساكن الشاغرة ويجدولون زيارات المتابعة، ويتلقى المشرفون المهام. حتمية وقابلة لإعادة الإنتاج.")} />

      <div className="mb-3 rounded-lg border border-navy-700 bg-navy-900 p-3 text-white">
        <div className="flex flex-wrap items-center gap-4">
          <SimControls compact />
          <div className="text-[12px] text-navy-100">
            <div className="font-semibold text-white tabular">{t("simDay")} {Math.min(engine.day, engine.lastDay)} · {engine.phase === "READY" ? t("simReady") : fmtDateTime(engine.timeOf(Math.max(0, engine.step - 1)), locale)}</div>
            <div className="text-navy-300">{L("Seed", "البذرة")}: <span className="font-mono">{engine.config.seed}</span> · {L("1× = one shift per second", "1× = فترة واحدة في الثانية")}</div>
          </div>
          <div className="flex-1" />
          <div className="w-full min-w-[220px] max-w-[360px]">
            <div className="mb-1 flex justify-between text-[11.5px]"><span>{t("kCompletion")}</span><span className="tabular">{fmtPct(agg.completionPct)} · {t("plan")} {fmtPct(agg.expectedPct, 0)}</span></div>
            <ProgressBar value={agg.completionPct} expected={agg.expectedPct} color="#d6c49f" className="bg-white/10" />
          </div>
        </div>
        <div className="mt-3 flex gap-[3px] overflow-x-auto pb-0.5">
          {dayChips.map((d) => (
            <div key={d} title={`${t("day")} ${d}`} className={cn("flex h-6 min-w-[26px] items-center justify-center rounded text-[10.5px] tabular", d < engine.day ? "bg-sand-300/80 text-navy-900" : d === engine.day && engine.phase !== "READY" ? "bg-white text-navy-900 font-semibold" : d > engine.config.fieldDays ? "border border-dashed border-white/20 text-navy-300" : "bg-white/8 text-navy-300")}>{d}</div>
          ))}
        </div>
      </div>

      {engine.disruptions.some((d) => engine.day >= d.from && engine.day <= d.to + 1) ? (
        <Callout tone="warn" className="mb-3">
          {engine.disruptions.filter((d) => engine.day >= d.from && engine.day <= d.to + 1).map((d) => (
            <div key={d.districtId} className="flex items-center gap-2"><CloudLightning size={14} />{L(`Access disruption in ${world.district[d.districtId].name.en} (days ${d.from + 1}–${d.to + 1}): ${d.cause.en}.`, `تعطل الوصول في ${world.district[d.districtId].name.ar} (الأيام ${d.from + 1}–${d.to + 1}): ${d.cause.ar}.`)}</div>
          ))}
        </Callout>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">
        <Kpi label={L("Interviews today", "مقابلات اليوم")} value={fmtInt(last?.interviewsToday ?? 0)} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} />
        <Kpi label={L("Households completed", "الأسر المكتملة")} value={fmtCompact(agg.completed, locale)} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Refusals", "الرفض")} value={fmtInt(agg.refusals)} sub={fmtPct(agg.refusals / Math.max(1, agg.completed + agg.refusals))} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Vacant dwellings", "المساكن الشاغرة")} value={fmtInt(agg.vacant)} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Revisits scheduled / done", "زيارات المتابعة المجدولة / المنجزة")} value={`${fmtCompact(agg.revisitsScheduled, locale)}`} sub={`${fmtCompact(agg.revisitsDone, locale)} ${L("done", "منجز")}`} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Enumerators active / idle", "العدّادون النشطون / الخاملون")} value={fmtInt(enumStatus.ACTIVE + enumStatus.UNDER_REVIEW)} sub={`${fmtInt(enumStatus.IDLE)} ${t("esIDLE").toLowerCase()} · ${fmtInt(enumStatus.COMPLETED)} ${t("esCOMPLETED").toLowerCase()}`} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Devices offline", "الأجهزة غير المتصلة")} value={fmtInt(enumStatus.OFFLINE)} tone={enumStatus.OFFLINE > 10 ? "warn" : undefined} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Supervisor tasks open / done", "مهام المشرفين المفتوحة / المنجزة")} value={fmtInt(openTasks.length)} sub={`${fmtInt(doneTasks)} ${L("done", "منجز")} · ${fmtInt(engine.reservesDeployed)} ${L("reserves deployed", "احتياط منتشر")}`} nature="SYNTHETIC_OPERATIONAL" />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <JordanMap
          height={520}
          title={L("Live EA status", "حالة مناطق العدّ مباشرة")}
          eaPoints={points}
          eaLegend={STATUSES.map((s) => ({ color: EA_STATUS_COLOR[s], label: `${t(`st${s}`)} (${fmtInt(agg.eaByStatus[s])})` }))}
          selectedGov={govId}
          onSelectGov={selectGov}
          districtMode="drill"
          sources={["OPS_FIELDWORK", "SIM_FRAME", "GEO_ADM1"]}
          showLabelsDefault={false}
        />
        <Panel title={L("Governorate progress vs plan", "تقدم المحافظات مقابل الخطة")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} subtitle={L("Bar = dwellings visited; tick = plan for today.", "الشريط = المساكن المزارة؛ العلامة = خطة اليوم.")}>
          <div className="space-y-2">
            {world.governorates.map((g) => {
              const a = byGov[g.id];
              const behind = a.expectedPct - a.completionPct > 0.08;
              return (
                <button type="button" key={g.id} onClick={() => selectGov(g.id as GovId)} className={cn("block w-full rounded px-1.5 py-1 text-start hover:bg-sand-50", govId === g.id && "bg-navy-100/50")}>
                  <div className="mb-1 flex items-center justify-between text-[12.5px]">
                    <span className="font-medium text-ink-900">{tx(g.name)}</span>
                    <span className={cn("tabular", behind ? "font-semibold text-crit" : "text-ink-500")}>{fmtPct(a.completionPct, 0)} <span className="text-ink-400">/ {fmtPct(a.expectedPct, 0)}</span></span>
                  </div>
                  <ProgressBar value={a.completionPct} expected={a.expectedPct} color={behind ? "#c0302f" : "#2f62a6"} />
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel title={L("Visit outcomes", "نتائج الزيارات")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]}><EChart option={outcomes} height={220} /></Panel>
        <Panel title={L("Completion by region", "الإنجاز حسب الإقليم")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} subtitle={L("Some regions complete faster than others.", "تنجز بعض الأقاليم أسرع من غيرها.")}><EChart option={regional} height={220} /></Panel>
        <Panel title={t("interviewsPerDay")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} subtitle={L("Fridays and the first two days run at reduced capacity.", "تعمل أيام الجمعة واليومان الأولان بطاقة مخفضة.")}>{history.length ? <EChart option={daily} height={220} /> : <p className="py-10 text-center text-[12.5px] text-ink-500">{t("feedEmpty")}</p>}</Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title={L("Supervisor task queue", "قائمة مهام المشرفين")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK", "OPS_QUALITY"]} subtitle={L("Routed automatically from quality issues, anomalies and revisit requests; supervisors clear a few each morning.", "تُوجَّه تلقائياً من مسائل الجودة والشذوذ وطلبات زيارات المتابعة؛ ينجز المشرفون بعضها كل صباح.")}>
          {openTasks.length === 0 ? <p className="py-8 text-center text-[12.5px] text-ink-500">{t("noData")}</p> : (
            <ul className="thin-scroll max-h-[280px] divide-y divide-line/70 overflow-y-auto">
              {openTasks.slice(-40).reverse().map((x) => (
                <li key={x.id} className="flex items-center gap-2 py-1.5 text-[12px]">
                  <span className="font-mono text-[11px] text-ink-400">{x.supervisorId}</span>
                  <span className="rounded bg-sand-100 px-1.5 text-[10.5px] font-semibold text-ink-700">{x.kind.replace("_", " ")}</span>
                  <span className="truncate text-ink-700">{tx(x.text)}</span>
                  <span className="ms-auto shrink-0 text-[11px] text-ink-400 tabular">{fmtDateTime(engine.timeOf(x.createdStep), locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={t("liveFeed")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]}>
          {engine.feed.length === 0 ? <p className="py-8 text-center text-[12.5px] text-ink-500">{t("feedEmpty")}</p> : (
            <ul className="thin-scroll max-h-[280px] space-y-1.5 overflow-y-auto">
              {engine.feed.filter((f) => !govId || f.govId === govId).slice(-80).reverse().map((f, i) => (
                <li key={`${f.step}-${i}`} className="flex gap-2 text-[12px] leading-snug">
                  <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", f.kind === "CRITICAL" ? "bg-crit" : f.kind === "WARNING" ? "bg-warn" : f.kind === "SUCCESS" ? "bg-ok" : "bg-navy-500")} />
                  <span className="w-[92px] shrink-0 text-[11px] text-ink-400 tabular">{fmtDateTime(engine.timeOf(f.step), locale)}</span>
                  <span className="text-ink-700">{tx(f.text)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

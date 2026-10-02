"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { useEAPoints, useScope } from "@/hooks/useScope";
import { Kpi, ProgressBar } from "@/components/ui/kpi";
import { Callout, PageHeader, Panel } from "@/components/ui/panel";
import { EAStatusChip, SeverityBadge } from "@/components/ui/badges";
import { EChart } from "@/components/charts/echart";
import { barH, barV, line, VIZ } from "@/components/charts/builders";
import { AgeGroupStrip, CategoryBars, PyramidChart, SexSplit, StatRow } from "@/components/charts/common";
import { JordanMap } from "@/features/gis/JordanMap";
import { computeProfile, NATIONALITIES } from "@/simulation/analytics";
import { fmt1, fmtCompact, fmtInt, fmtPct, fmtDateTime } from "@/lib/format";
import { isOpen } from "@/simulation/engine";
import type { GovId } from "@/types/census";
import { cn } from "@/lib/utils";
import { navIndex } from "@/lib/nav";

type Layer = "population" | "density" | "completion" | "response" | "risk";

export function Overview() {
  const engine = useEngine();
  const { t, tx, lb, ar, locale, L } = useI18n();
  const { govId, districtId, filter, scope } = useScope();
  const selectGov = useApp((s) => s.selectGov);
  const selectDistrict = useApp((s) => s.selectDistrict);
  const [layer, setLayer] = useState<Layer>("population");
  const [showEAs, setShowEAs] = useState(false);
  const v = engine.version;
  const world = engine.world;
  const started = engine.phase !== "READY";

  const agg = useMemo(() => engine.aggregate(filter), [engine, v, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const byGov = engine.aggregateBy("govId");
  const byDist = engine.aggregateBy("districtId");
  const profile = useMemo(() => computeProfile(world, scope), [world, scope.govId, scope.districtId]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => engine.planCurve(filter), [engine, filter]);
  const history = govId ? engine.govHistory[govId] : engine.history;
  const eaPoints = useEAPoints(govId);

  const metric = (a: (typeof byGov)[string], area: number): number => {
    switch (layer) {
      case "population": return started ? a.persons : a.popEstimate;
      case "density": return (started ? a.persons : a.popEstimate) / Math.max(1, area);
      case "completion": return a.completionPct;
      case "response": return a.responseRate;
      case "risk": return a.coverageRisk;
    }
  };
  const govValues = useMemo(() => Object.fromEntries(world.governorates.map((g) => [g.id, metric(byGov[g.id], g.areaKm2)])) as Record<GovId, number>, [byGov, layer, world]); // eslint-disable-line react-hooks/exhaustive-deps
  const districtValues = useMemo(() => Object.fromEntries(world.districts.map((d) => [d.id, metric(byDist[d.id], d.areaKm2)])), [byDist, layer, world]); // eslint-disable-line react-hooks/exhaustive-deps
  const fmtLayer = (x: number) => (layer === "population" ? fmtCompact(x, locale) : layer === "density" ? fmt1(x) : fmtPct(x, 0));
  const scale = layer === "risk" ? "risk" : layer === "completion" || layer === "response" ? "pct" : "seq";
  const domain: [number, number] | undefined = layer === "completion" ? [0, 1] : layer === "response" ? [0.85, 1] : undefined;

  const openAnomalies = engine.anomalies.filter((a) => a.status === "OPEN" && (!govId || a.govId === govId));
  const openIssues = engine.issues.filter((q) => isOpen(q.status) && (!govId || q.govId === govId));
  const frameArea = districtId ? world.district[districtId].areaKm2 : govId ? world.gov[govId].areaKm2 : world.governorates.reduce((s, g) => s + g.areaKm2, 0);

  const govBars = useMemo(() => {
    const rows = world.governorates.map((g) => ({ id: g.id, label: tx(g.name), frame: byGov[g.id].popEstimate, enumerated: byGov[g.id].persons }));
    rows.sort((a, b) => b.frame - a.frame);
    const series = started
      ? [{ name: L("Frame population", "سكان الإطار"), data: rows.map((r) => r.frame), color: "#c9bfa9" }, { name: t("kEnumerated"), data: rows.map((r) => r.enumerated), color: VIZ[0] }]
      : [{ name: L("Frame population", "سكان الإطار"), data: rows.map((r) => r.frame), color: VIZ[0] }];
    return { rows, option: barH(rows.map((r) => r.label), series, { rtl: ar, fmt: (x) => fmtCompact(x, locale) }) };
  }, [world, byGov, started, tx, ar, locale, L, t]);

  const trend = useMemo(() => {
    const days = Array.from({ length: engine.lastDay + 1 }, (_, i) => i + 1);
    const actual = days.map((_, i) => (history[i] ? history[i].visited / Math.max(1, agg.dwellingsTrue) : null));
    return line(days, [{ name: t("actual"), data: actual, color: VIZ[0], area: true }, { name: t("plan"), data: plan.slice(0, days.length), color: "#8a8270", dashed: true }], { rtl: ar, fmt: (x) => fmtPct(x, 0), yMax: 1, markX: engine.config.fieldDays });
  }, [history, plan, agg.dwellingsTrue, engine.lastDay, engine.config.fieldDays, ar, t]);

  const productivity = useMemo(() => {
    const days = history.map((h) => `${t("day")} ${h.day + 1}`);
    return barV(days, [{ name: t("interviewsPerDay"), data: history.map((h) => h.interviewsToday), color: VIZ[2] }], { rtl: ar, fmt: (x) => fmtCompact(x, locale) });
  }, [history, ar, t, locale]);

  const riskEAs = useMemo(() => {
    if (!started) return [];
    return world.eas.map((a, k) => ({ a, s: engine.ea[k] })).filter(({ a, s }) => filter(a) && s.status !== "COMPLETED" && s.riskScore > 0).sort((x, y) => y.s.riskScore - x.s.riskScore).slice(0, 8);
  }, [world, engine, v, filter, started]); // eslint-disable-line react-hooks/exhaustive-deps

  const nat = NATIONALITIES.map((k) => ({ label: lb("nationality", k), value: profile.nationality[k] }));

  return (
    <div>
      <PageHeader index={navIndex("/census")} title={t("ovTitle")} subtitle={t("ovSubtitle")} />
      {!started ? <Callout className="mb-3" tone="info">{t("censusNotStarted")} {L("Use “Start census” in the top bar or the Executive demo.", "استخدم «بدء التعداد» في الشريط العلوي أو العرض التنفيذي.")}</Callout> : null}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-10">
        <Kpi label={started ? t("kEnumerated") : t("kPopulation")} value={fmtCompact(started ? agg.persons : agg.popEstimate, locale)} sub={started ? `${fmtCompact(agg.popEstimate, locale)} ${t("kFrameEstimate")}` : L("2024 reference baseline", "خط أساس مرجعي 2024")} nature={started ? "SYNTHETIC_OPERATIONAL" : "REFERENCE"} sources={started ? ["OPS_FIELDWORK", "SIM_FRAME"] : ["REF_GOV_POP", "SIM_FRAME"]} />
        <Kpi label={t("kHouseholds")} value={fmtCompact(started ? agg.completed : agg.hhEstimate, locale)} sub={started ? `${fmtPct(agg.completed / Math.max(1, agg.hhEstimate), 0)} ${t("kOfFrame")}` : t("kFrameEstimate")} nature={started ? "SYNTHETIC_OPERATIONAL" : "SIMULATED"} sources={["SIM_FRAME", "OPS_FIELDWORK"]} />
        <Kpi label={t("kDwellings")} value={fmtCompact(started ? agg.visited : agg.dwellings, locale)} sub={started ? `${fmtCompact(agg.vacant, locale)} ${L("vacant found", "شاغر مكتشف")}` : L("listed in frame", "في حصر الإطار")} nature="SIMULATED" sources={["SIM_FRAME"]} />
        <Kpi label={t("kEAs")} value={fmtInt(agg.eas)} sub={`${fmtInt(agg.eaByStatus.COMPLETED)} ${t("stCOMPLETED").toLowerCase()}`} nature="SIMULATED" sources={["SIM_FRAME"]} />
        <Kpi label={t("kActiveEnum")} value={fmtInt(agg.activeEnumerators)} sub={`${fmtInt(agg.enumerators)} ${L("deployed", "منتشر")} · ${agg.offline} ${t("esOFFLINE").toLowerCase()}`} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_ENUMERATORS"]} />
        <Kpi label={t("kCompletion")} value={fmtPct(agg.completionPct)} sub={<ProgressBar value={agg.completionPct} expected={agg.expectedPct} className="mt-1" />} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} />
        <Kpi label={t("kResponse")} value={started ? fmtPct(agg.responseRate) : "—"} sub={`${fmtInt(agg.refusals)} ${L("refusals", "رفض")}`} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} tone={started && agg.responseRate < 0.93 ? "warn" : undefined} />
        <Kpi label={t("kValidation")} value={started ? fmtPct(agg.validationRate) : "—"} sub={`${fmtInt(openIssues.length)} ${L("open issues", "مسائل مفتوحة")}`} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_QUALITY"]} />
        <Kpi label={t("kAnomalies")} value={fmtInt(openAnomalies.length)} sub={`${openAnomalies.filter((a) => a.severity === "CRITICAL").length} ${t("sevCRITICAL").toLowerCase()}`} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_ANOMALY"]} tone={openAnomalies.some((a) => a.severity === "CRITICAL") ? "crit" : undefined} />
        <Kpi label={t("kCoverageRisk")} value={fmtPct(agg.coverageRisk)} sub={`${fmtInt(agg.eaByStatus.COVERAGE_RISK)} ${t("kEAsAtRisk")}`} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} tone={agg.coverageRisk > 0.05 ? "warn" : undefined} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <JordanMap
            height={520}
            title={t("mapTitle")}
            govValues={govValues}
            districtValues={districtValues}
            scale={scale}
            domain={domain}
            format={fmtLayer}
            legendTitle={t(layer === "population" ? "layerPopulation" : layer === "density" ? "layerDensity" : layer === "completion" ? "layerCompletion" : layer === "response" ? "layerResponse" : "layerRisk")}
            layers={[{ value: "population", label: t("layerPopulation") }, { value: "density", label: `${t("layerDensity")} (${t("perKm2")})` }, { value: "completion", label: t("layerCompletion") }, { value: "response", label: t("layerResponse") }, { value: "risk", label: t("layerRisk") }]}
            layer={layer}
            onLayerChange={(x) => setLayer(x as Layer)}
            selectedGov={govId}
            selectedDistrict={districtId}
            onSelectGov={selectGov}
            onSelectDistrict={(d) => selectDistrict(d)}
            eaPoints={showEAs ? eaPoints : undefined}
            eaLegend={showEAs ? (["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "COVERAGE_RISK", "REVISIT_REQUIRED"] as const).map((s) => ({ color: ["#b9b2a3", "#2f62a6", "#1f8a3b", "#c0302f", "#d08a00"][["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "COVERAGE_RISK", "REVISIT_REQUIRED"].indexOf(s)], label: t(`st${s}`) })) : undefined}
            sources={["GEO_ADM1", "GEO_ADM2", layer === "population" && !started ? "REF_GOV_POP" : "OPS_FIELDWORK"]}
            tooltipExtra={(kind, id) => {
              const a = kind === "gov" ? byGov[id] : byDist[id];
              if (!a) return null;
              return (
                <div className="space-y-0.5 tabular">
                  <div>{t("kPopulation")}: <b>{fmtInt(a.popEstimate)}</b> <span className="text-ink-400">({t("kFrameEstimate")})</span></div>
                  <div>{t("kCompletion")}: <b>{fmtPct(a.completionPct)}</b> · {t("kResponse")}: <b>{started ? fmtPct(a.responseRate) : "—"}</b></div>
                  <div>{t("kEAs")}: <b>{fmtInt(a.eas)}</b> · {t("kEAsAtRisk")}: <b>{a.eaByStatus.COVERAGE_RISK}</b></div>
                </div>
              );
            }}
          />
          <div className="flex flex-wrap items-center gap-3 px-1 text-[12px] text-ink-500">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={showEAs} onChange={(e) => setShowEAs(e.target.checked)} />{t("showEAs")} ({fmtInt(eaPoints.length)})</label>
            <span>{L("Districts appear when a governorate is selected.", "تظهر الألوية عند اختيار محافظة.")}</span>
          </div>
        </div>
        <Panel title={t("popByGov")} nature={started ? "SYNTHETIC_OPERATIONAL" : "REFERENCE"} sources={["REF_GOV_POP", "OPS_FIELDWORK"]} subtitle={L("Click a bar to focus the platform on that governorate.", "انقر على عمود لتركيز المنصة على تلك المحافظة.")}>
          <EChart option={govBars.option} height={400} onClick={(p) => { const row = govBars.rows[p.dataIndex ?? -1]; if (row) selectGov(row.id as GovId); }} />
          <div className="mt-2 grid grid-cols-3 gap-2 border-t border-line/70 pt-2">
            <StatRow label={t("density")} value={fmt1((started ? agg.persons : agg.popEstimate) / Math.max(1, frameArea))} sub={t("perKm2")} />
            <StatRow label={t("hhSize")} value={fmt1(profile.avgHHSize)} />
            <StatRow label={t("urban")} value={fmtPct(profile.urban / Math.max(1, profile.population), 0)} />
          </div>
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <Panel title={t("agePyramid")} nature="SIMULATED" sources={["SIM_MICRODATA"]} subtitle={t("sampleNote")}>
          <PyramidChart m={profile.single.m} f={profile.single.f} height={280} share />
        </Panel>
        <Panel title={t("ageGroups")} nature="SIMULATED" sources={["SIM_MICRODATA"]}>
          <AgeGroupStrip p={profile} />
          <div className="mt-3"><div className="mb-1.5 text-[11.5px] font-medium text-ink-500">{t("sexDistribution")}</div><SexSplit male={profile.male} female={profile.female} /></div>
          <div className="mt-3"><div className="mb-1.5 text-[11.5px] font-medium text-ink-500">{t("urbanRural")}</div><SexLike a={profile.urban} b={profile.rural} la={t("urban")} lb={t("rural")} /></div>
        </Panel>
        <Panel title={t("hhSizeDist")} nature="SIMULATED" sources={["SIM_MICRODATA"]} subtitle={`${t("hhSize")}: ${fmt1(profile.avgHHSize)}`}>
          <EChart option={barV(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"], [{ name: t("households"), data: profile.hhSizeDist.map((x) => x / Math.max(1, profile.households)), color: VIZ[0] }], { rtl: ar, fmt: (x) => fmtPct(x, 0) })} height={280} />
        </Panel>
        <Panel title={t("nationalitySim")} nature="SIMULATED" sources={["SIM_MICRODATA", "SIM_PROFILES"]} subtitle={L("Illustrative categories — not official nationality statistics.", "فئات توضيحية — ليست إحصاءات رسمية للجنسية.")}>
          <CategoryBars items={nat} pct height={260} color={VIZ[3]} />
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-[1.2fr_1fr_1fr]">
        <Panel title={t("completionTrend")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} subtitle={L("Dashed vertical line = end of planned fieldwork period.", "الخط المتقطع العمودي = نهاية فترة العمل الميداني المخططة.")}>
          <EChart option={trend} height={250} />
        </Panel>
        <Panel title={t("fieldProductivity")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} subtitle={t("interviewsPerDay")}>
          {history.length ? <EChart option={productivity} height={250} /> : <Empty />}
        </Panel>
        <Panel title={t("qualityAlerts")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_QUALITY", "OPS_ANOMALY"]} actions={<Link href="/anomalies" className="text-[12px] font-medium text-navy-600 hover:underline">{L("All", "الكل")} →</Link>}>
          {openAnomalies.length === 0 ? <Empty /> : (
            <ul className="divide-y divide-line/70">
              {openAnomalies.slice().sort((a, b) => b.score - a.score).slice(0, 6).map((a) => (
                <li key={a.id} className="py-2">
                  <div className="flex items-center gap-2"><SeverityBadge s={a.severity} /><span className="text-[12px] font-medium text-ink-700">{lb("anomalyKind", a.kind)}</span><span className="ms-auto font-mono text-[10.5px] text-ink-400">{a.subjectId}</span></div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-ink-700">{tx(a.what)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title={t("highRiskEAs")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]} actions={<Link href="/coverage" className="text-[12px] font-medium text-navy-600 hover:underline">{t("nav07")} →</Link>}>
          {riskEAs.length === 0 ? <Empty /> : (
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1 text-start">{t("ea")}</th><th className="text-start">{t("district")}</th><th className="text-start">{t("status")}</th><th className="text-end">{t("kCompletion")}</th><th className="text-end">{t("riskScore")}</th></tr></thead>
              <tbody>
                {riskEAs.map(({ a, s }) => (
                  <tr key={a.id} className="border-t border-line/60">
                    <td className="py-1.5 font-mono text-[12px]">{a.id}</td>
                    <td className="truncate text-ink-700">{tx(world.district[a.districtId].name)}</td>
                    <td><EAStatusChip s={s.status} /></td>
                    <td className="text-end tabular">{fmtPct(s.visited / a.dwellingsTrue, 0)}</td>
                    <td className="text-end"><span className={cn("rounded px-1.5 py-0.5 text-[11.5px] font-semibold tabular", s.riskScore > 60 ? "bg-crit-bg text-crit" : s.riskScore > 30 ? "bg-warn-bg text-warn" : "bg-sand-100 text-ink-700")}>{s.riskScore}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title={t("liveFeed")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_FIELDWORK"]}>
          {engine.feed.length === 0 ? <p className="py-6 text-center text-[12.5px] text-ink-500">{t("feedEmpty")}</p> : (
            <ul className="thin-scroll max-h-[300px] space-y-1.5 overflow-y-auto">
              {engine.feed.filter((f) => !govId || f.govId === govId).slice(-60).reverse().map((f, i) => (
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

function SexLike({ a, b, la, lb: lbl }: { a: number; b: number; la: string; lb: string }) {
  const tot = a + b || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full"><div style={{ width: `${(a / tot) * 100}%`, background: VIZ[2] }} /><div className="w-[2px] bg-card" /><div style={{ width: `${(b / tot) * 100}%`, background: VIZ[4] }} /></div>
      <div className="mt-1.5 flex justify-between text-[12px]"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: VIZ[2] }} />{la} <b className="tabular">{fmtPct(a / tot)}</b></span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: VIZ[4] }} />{lbl} <b className="tabular">{fmtPct(b / tot)}</b></span></div>
    </div>
  );
}

export function Empty({ text }: { text?: string }) {
  const { t } = useI18n();
  return <p className="py-8 text-center text-[12.5px] text-ink-500">{text ?? t("noData")}</p>;
}

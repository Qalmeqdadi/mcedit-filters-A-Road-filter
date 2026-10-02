"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { useEAPoints, useScope } from "@/hooks/useScope";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { DataTable } from "@/components/ui/data-table";
import { EAStatusChip, EA_STATUS_COLOR, Pill } from "@/components/ui/badges";
import { Input, Tabs } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { JordanMap } from "./JordanMap";
import { EADetail } from "./EADetail";
import { BOUNDARY_QA } from "@/data/geo";
import { downloadCsv } from "@/lib/csv";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";
import type { EAStatus, EnumerationArea } from "@/types/census";
import { navIndex } from "@/lib/nav";

type Row = { a: EnumerationArea; status: EAStatus; progress: number; risk: number };
const STATUSES: EAStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "COVERAGE_RISK", "REVISIT_REQUIRED"];

export function GIS() {
  const engine = useEngine();
  const { t, tx, L } = useI18n();
  const { govId, districtId, eaId, filter } = useScope();
  const { selectGov, selectDistrict, selectEA } = useApp();
  const [tab, setTab] = useState<"eas" | "units" | "qa">("eas");
  const [q, setQ] = useState("");
  const [layer, setLayer] = useState("status");
  const world = engine.world;
  const v = engine.version;
  const points = useEAPoints(govId);
  const pointsColored = useMemo(() => {
    if (layer === "status") return points;
    return points.map((p) => {
      const k = world.eaIdx.get(p.id)!;
      const a = world.eas[k];
      const val = layer === "access" ? a.accessibility : Math.min(1, a.hhEstimate / 320);
      const c = layer === "access" ? (val > 0.85 ? "#1f8a3b" : val > 0.65 ? "#2f62a6" : val > 0.5 ? "#d08a00" : "#c0302f") : ["#b7d3f6", "#5598e7", "#1c5cab", "#0a2c57"][Math.min(3, Math.floor(val * 4))];
      return { ...p, color: c };
    });
  }, [points, layer, world]);

  const rows: Row[] = useMemo(() => world.eas.filter(filter).map((a) => {
    const s = engine.ea[a.index];
    return { a, status: s.status, progress: s.visited / a.dwellingsTrue, risk: s.riskScore };
  }), [world, filter, engine, v]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<Row, unknown>[]>(() => [
    { id: "id", header: t("ea"), accessorFn: (r) => r.a.id, cell: (c) => <span className="font-mono text-[12px]">{c.getValue() as string}</span> },
    { id: "district", header: t("district"), accessorFn: (r) => tx(world.district[r.a.districtId].name) },
    { id: "type", header: L("Type", "النوع"), accessorFn: (r) => (r.a.urban ? t("urban") : t("rural")) },
    { id: "pop", header: L("Pop. est.", "تقدير السكان"), accessorFn: (r) => r.a.popEstimate, cell: (c) => fmtInt(c.getValue() as number) },
    { id: "hh", header: t("households"), accessorFn: (r) => r.a.hhEstimate, cell: (c) => fmtInt(c.getValue() as number) },
    { id: "dw", header: t("dwellings"), accessorFn: (r) => r.a.dwellings, cell: (c) => fmtInt(c.getValue() as number) },
    { id: "enum", header: L("Enumerator", "العدّاد"), accessorFn: (r) => r.a.enumeratorId, cell: (c) => <span className="font-mono text-[11.5px]">{c.getValue() as string}</span> },
    { id: "access", header: L("Access", "الوصول"), accessorFn: (r) => r.a.accessibility * 100, cell: (c) => fmt1(c.getValue() as number) },
    { id: "progress", header: t("kCompletion"), accessorFn: (r) => r.progress, cell: (c) => fmtPct(c.getValue() as number, 0) },
    { id: "risk", header: t("riskScore"), accessorFn: (r) => r.risk },
    { id: "status", header: t("status"), accessorFn: (r) => r.status, cell: (c) => <EAStatusChip s={c.getValue() as EAStatus} /> },
  ], [t, tx, L, world]);

  const govRows = world.governorates.map((g) => ({ g, districts: world.districts.filter((d) => d.govId === g.id), eas: world.eas.filter((e) => e.govId === g.id).length }));

  return (
    <div>
      <PageHeader index={navIndex("/gis")} title={t("nav03")} subtitle={L("Jordan → Governorate → District → Enumeration Area → Statistical block → Dwelling. Boundaries are reference data; EAs, blocks and dwellings are synthetic and always fall inside the official polygons.", "الأردن ← المحافظة ← اللواء ← منطقة العدّ ← البلوك الإحصائي ← المسكن. الحدود بيانات مرجعية؛ ومناطق العدّ والبلوكات والمساكن اصطناعية وتقع دائماً داخل المضلعات الرسمية.")}>
        <Button onClick={() => downloadCsv(`enumeration-areas${govId ? "-" + govId : ""}.csv`, rows.map((r) => ({ ea_id: r.a.id, governorate: r.a.govId, district_id: r.a.districtId, district: world.district[r.a.districtId].name.en, urban: r.a.urban, lng: r.a.lng, lat: r.a.lat, population_estimate: r.a.popEstimate, household_estimate: r.a.hhEstimate, dwellings: r.a.dwellings, blocks: r.a.blocks, enumerator: r.a.enumeratorId, supervisor: r.a.supervisorId, accessibility: r.a.accessibility, status: r.status, progress: r.progress })))}>{t("exportCsv")} ({fmtInt(rows.length)})</Button>
      </PageHeader>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <JordanMap
            height={600}
            title={govId ? tx(world.gov[govId].name) : t("mapTitle")}
            selectedGov={govId}
            selectedDistrict={districtId}
            onSelectGov={selectGov}
            onSelectDistrict={(d) => selectDistrict(d)}
            onSelectEA={(id) => selectEA(id)}
            eaPoints={pointsColored}
            layers={[{ value: "status", label: t("layerEAStatus") }, { value: "access", label: L("EA accessibility", "سهولة الوصول لمناطق العدّ") }, { value: "size", label: L("EA household workload", "عبء الأسر في مناطق العدّ") }]}
            layer={layer}
            onLayerChange={setLayer}
            eaLegend={layer === "status" ? STATUSES.map((s) => ({ color: EA_STATUS_COLOR[s], label: t(`st${s}`) })) : layer === "access" ? [{ color: "#1f8a3b", label: "> 85" }, { color: "#2f62a6", label: "65–85" }, { color: "#d08a00", label: "50–65" }, { color: "#c0302f", label: "< 50" }] : [{ color: "#b7d3f6", label: "< 80" }, { color: "#5598e7", label: "80–160" }, { color: "#1c5cab", label: "160–240" }, { color: "#0a2c57", label: "> 240" }]}
            sources={["GEO_ADM1", "GEO_ADM2", "GEO_ADM0", "SIM_FRAME"]}
            showLabelsDefault
          />
          <div className="mt-1.5 px-1 text-[11.5px] text-ink-500">{L("Click an EA point to open its blocks and dwellings. Point colours update live during fieldwork.", "انقر على نقطة منطقة عدّ لفتح بلوكاتها ومساكنها. تتحدث الألوان مباشرة أثناء العمل الميداني.")}</div>
        </div>
        <Panel title={eaId ? `${t("ea")} ${eaId}` : L("Hierarchy", "التسلسل الهرمي")} nature="SIMULATED" sources={["SIM_FRAME", "GEO_ADM2"]} actions={eaId ? <Button size="xs" onClick={() => selectEA(null)}>{t("close")}</Button> : null}>
          {eaId ? <EADetail eaId={eaId} /> : (
            <div className="space-y-2">
              <Callout>{L("Select a governorate on the map, then a district, then an EA point.", "اختر محافظة على الخريطة، ثم لواءً، ثم نقطة منطقة عدّ.")}</Callout>
              <div className="thin-scroll max-h-[470px] space-y-1 overflow-y-auto">
                {govRows.filter((r) => !govId || r.g.id === govId).map(({ g, districts, eas }) => (
                  <div key={g.id} className="rounded-md border border-line/70">
                    <button type="button" onClick={() => selectGov(g.id)} className="flex w-full items-center justify-between px-2.5 py-1.5 text-start hover:bg-sand-50">
                      <span className="text-[13px] font-semibold text-ink-900">{tx(g.name)} <span className="font-mono text-[10.5px] font-normal text-ink-400">{g.iso}</span></span>
                      <span className="text-[11.5px] text-ink-500 tabular">{districts.length} {t("districts").toLowerCase()} · {fmtInt(eas)} EAs</span>
                    </button>
                    {govId === g.id ? (
                      <div className="border-t border-line/70 px-1.5 py-1">
                        {districts.map((d) => (
                          <button key={d.id} type="button" onClick={() => selectDistrict(d.id, g.id)} className={`flex w-full items-center justify-between rounded px-2 py-1 text-start text-[12.5px] hover:bg-sand-50 ${districtId === d.id ? "bg-navy-100/60" : ""}`}>
                            <span>{tx(d.name)} {d.labelMethod.startsWith("published") ? <Pill className="ms-1 !text-[10px]">{L("label unverified", "اسم غير متحقق")}</Pill> : null}</span>
                            <span className="text-[11px] text-ink-500 tabular">{fmtInt(world.eas.filter((e) => e.districtId === d.id).length)} EAs · {fmtInt(d.areaKm2)} km²</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-3">
        <Panel>
          <Tabs value={tab} onChange={setTab} tabs={[{ value: "eas", label: t("eas"), count: rows.length }, { value: "units", label: L("Administrative units", "الوحدات الإدارية"), count: world.governorates.length + world.districts.length }, { value: "qa", label: L("Boundary QA report", "تقرير جودة الحدود"), count: BOUNDARY_QA.units.length }]} />
          <div className="pt-3">
            {tab === "eas" ? (
              <DataTable data={rows} columns={columns} globalFilter={q} onRowClick={(r) => selectEA(r.a.id)} getRowId={(r) => r.a.id} toolbar={<div className="mb-2"><Input placeholder={`${t("search")}…`} value={q} onChange={(e) => setQ(e.target.value)} className="w-64" /></div>} />
            ) : tab === "units" ? (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full min-w-[720px] text-[12.5px]">
                  <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">ID</th><th className="text-start">English</th><th className="text-start">العربية</th><th className="text-start">{L("Level", "المستوى")}</th><th className="text-end">km²</th><th className="text-end">{L("Reference population", "السكان المرجعيون")}</th><th className="text-end">EAs</th></tr></thead>
                  <tbody>
                    {world.governorates.map((g) => (
                      <tr key={g.id} className="border-b border-line/60 bg-sand-50/50 font-medium"><td className="py-1.5 font-mono text-[11.5px]">{g.iso}</td><td>{g.name.en}</td><td dir="rtl" className="text-start">{g.name.ar}</td><td>{L("Governorate", "محافظة")}</td><td className="text-end tabular">{fmtInt(g.areaKm2)}</td><td className="text-end tabular">{fmtInt(g.refPopulation)}</td><td className="text-end tabular">{fmtInt(world.eas.filter((e) => e.govId === g.id).length)}</td></tr>
                    ))}
                    {world.districts.filter((d) => !govId || d.govId === govId).map((d) => (
                      <tr key={d.id} className="border-b border-line/60"><td className="py-1.5 font-mono text-[11.5px]">{d.id}</td><td>{d.name.en}</td><td dir="rtl" className="text-start">{d.name.ar}</td><td>{L("District", "لواء")}</td><td className="text-end tabular">{fmtInt(d.areaKm2)}</td><td className="text-end tabular text-ink-500">{fmtInt(d.population)} <span className="text-[10px]">({L("sim.", "محاكاة")})</span></td><td className="text-end tabular">{fmtInt(world.eas.filter((e) => e.districtId === d.id).length)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-3">
                <Callout tone="warn">{L(`${BOUNDARY_QA.source}. ${BOUNDARY_QA.sourceAdm2Units} published ADM2 units were reconciled into ${BOUNDARY_QA.outputDistricts} districts nested in governorates. Label methods: ${Object.entries(BOUNDARY_QA.labelMethods).map(([k, v]) => `${k} ${v}`).join(", ")}. ${BOUNDARY_QA.merges.length} slivers/units merged.`, `${BOUNDARY_QA.source}. تمت مواءمة ${BOUNDARY_QA.sourceAdm2Units} وحدة منشورة إلى ${BOUNDARY_QA.outputDistricts} لواء ضمن المحافظات. طرق التسمية: ${Object.entries(BOUNDARY_QA.labelMethods).map(([k, v]) => `${k} ${v}`).join("، ")}. دُمج ${BOUNDARY_QA.merges.length} جزءاً/وحدة.`)}</Callout>
                <div className="thin-scroll overflow-x-auto">
                  <table className="w-full min-w-[760px] text-[12.5px]">
                    <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">ID</th><th className="text-start">{L("Platform name", "الاسم في المنصة")}</th><th className="text-start">{L("Published label", "الاسم المنشور")}</th><th className="text-start">{L("Method", "الطريقة")}</th><th className="text-start">{L("Seat evidence", "دليل المركز")}</th><th className="text-end">{L("Majority overlap", "نسبة التداخل")}</th><th className="text-end">km²</th></tr></thead>
                    <tbody>
                      {BOUNDARY_QA.units.map((u) => (
                        <tr key={u.id} className="border-b border-line/60"><td className="py-1.5 font-mono text-[11.5px]">{u.id}</td><td>{u.nameEn} <span className="text-ink-400">/ {u.nameAr}</span></td><td className="text-ink-700">{u.sourceLabel}</td><td><Pill className={u.method.startsWith("published") ? "!border-warn/40 !bg-warn-bg !text-warn" : "!border-ok/30 !bg-ok-bg !text-ok"}>{u.method}</Pill></td><td className="text-[12px] text-ink-700">{u.seats.join(", ") || "—"}</td><td className="text-end tabular">{u.majorityShare}%</td><td className="text-end tabular">{fmtInt(u.areaKm2)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

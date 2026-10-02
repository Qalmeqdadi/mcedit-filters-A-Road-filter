"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ThermometerSun, Waves } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/form";
import { Pill } from "@/components/ui/badges";
import { JordanMap, type MapMarker } from "@/features/gis/JordanMap";
import { assessClimate, DEFAULT_CLIMATE, type ClimateParams, type HeatClass } from "@/simulation/lab/climate";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { AreaActions } from "./ActionCard";
import { Formula, LabBar, Method, SimpleTable, useLab } from "./shared";

export function Climate() {
  const { world, areaFor, year, scenarioName } = useLab();
  const { t, tx, L, locale } = useI18n();
  const [p, setP] = useState<ClimateParams>(DEFAULT_CLIMATE);
  const [layer, setLayer] = useState<"risk" | "atRisk" | "flood">("risk");
  const dp = useDeferredValue(p);
  const res = useMemo(() => assessClimate(world, areaFor(year), dp), [world, areaFor, year, dp]);
  const ranked = [...res.districts].sort((a, b) => b.heatRisk - a.heatRisk);
  const top = ranked[0];
  const cls = (c: HeatClass) => (c === "LOWLAND" ? L("Lowland", "أغوار/منخفض") : c === "DESERT" ? L("Desert", "صحراوي") : L("Highland", "مرتفعات"));
  const values = useMemo(() => Object.fromEntries(res.districts.map((d) => [d.id, layer === "risk" ? d.heatRisk : layer === "atRisk" ? d.atRisk : d.floodExposed])), [res, layer]);
  const markers = useMemo<MapMarker[]>(() => (layer === "flood" ? res.floodPoints.map((f) => ({ id: f.id, lng: f.lng, lat: f.lat, color: "#2f62a6", radius: 3.5, label: `${f.id} · ${fmtInt(f.pop)} ${L("residents", "ساكن")}` })) : []), [res, layer, L]);
  const exportCsv = () => downloadCsv(`climate-risk-${year}.csv`, res.districts.map((d) => ({ district: world.district[d.id].name.en, governorate: world.gov[world.district[d.id].govId].name.en, heat_class: d.cls, hot_days_base: d.hotDaysBase, hot_days_scenario: d.hotDays.toFixed(0), population: Math.round(d.pop), share_65_plus: d.s65.toFixed(4), share_under_5: d.s5.toFixed(4), no_cooling: d.noAC.toFixed(3), outdoor_workers: d.outdoor.toFixed(3), functional_difficulty: d.disability.toFixed(3), tents_caravans: d.inadequate.toFixed(4), vulnerability: d.vulnerability.toFixed(3), heat_risk: d.heatRisk.toFixed(3), people_at_heat_risk: Math.round(d.atRisk), cooling_centres: d.coolingCentres, flood_eas: d.floodEAs, flood_exposed: Math.round(d.floodExposed), warming_c: p.warming, year, scenario: scenarioName, data_nature: "SIMULATED" })));

  return (
    <div>
      <PageHeader index={navIndex("/climate")} title={t("navClimate")} subtitle={L("Who is most exposed to extreme heat and flash floods, and where should cooling centres, early warnings and adaptation go first? Census vulnerability (older people, young children, homes without cooling, outdoor workers, disability, tents and caravans) is combined with illustrative hazard layers.", "من الأكثر تعرضاً للحر الشديد والسيول المفاجئة، وأين يجب أن تبدأ مراكز التبريد والإنذار المبكر وإجراءات التكيف؟ تُدمج هشاشة السكان من التعداد (كبار السن، الأطفال الصغار، المساكن بلا تبريد، العاملون في الخارج، الإعاقة، الخيام والكرفانات) مع طبقات خطر توضيحية.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <Callout tone="warn" className="mb-3">{L("Hazard layers are illustrative classes and synthetic flood flags — NOT observed climatology or flood maps. Vulnerability is from the synthetic census. Replace hazards with Jordan Meteorological Department and national flood-hazard data before use.", "طبقات الخطر فئات توضيحية ومؤشرات سيول اصطناعية — وليست بيانات مناخية مرصودة أو خرائط سيول. الهشاشة من التعداد الاصطناعي. يجب استبدال طبقات الخطر ببيانات دائرة الأرصاد الجوية والخرائط الوطنية للسيول قبل الاستخدام.")}</Callout>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={L("People at heat risk", "أشخاص معرضون لخطر الحر")} value={fmtCompact(res.totals.atRisk, locale)} sub={`${year} · +${p.warming.toFixed(1)} °C`} tone="crit" nature="SIMULATED" sources={["SIM_CLIMATE", "SIM_MICRODATA"]} />
        <Kpi label={L("Days above 40 °C", "أيام فوق 40 درجة")} value={fmtInt(res.totals.hotDaysPopWeighted)} sub={L("population-weighted / yr", "مرجح بالسكان/سنة")} nature="SIMULATED" />
        <Kpi label={L("Cooling centres needed", "مراكز تبريد لازمة")} value={fmtInt(res.totals.coolingCentres)} sub={`1 ${L("per", "لكل")} ${fmtCompact(p.coolingCentreReach, locale)} ${L("at risk", "معرض")}`} nature="SIMULATED" />
        <Kpi label={L("Flood-exposed residents", "سكان معرضون للسيول")} value={fmtCompact(res.totals.floodExposed, locale)} sub={`${res.floodPoints.length} ${L("susceptible EAs", "منطقة عدّ معرضة")}`} tone="warn" nature="SIMULATED" />
        <Kpi label={L("Highest heat risk", "أعلى خطر حراري")} value={top.heatRisk.toFixed(2)} sub={`${tx(world.district[top.id].name)} · ${cls(top.cls)}`} nature="SIMULATED" />
        <Kpi label={L("Homes without cooling", "مساكن بلا تبريد")} value={fmtPct(res.districts.reduce((s, d) => s + d.noAC * d.pop, 0) / res.districts.reduce((s, d) => s + d.pop, 0), 0)} sub={L("no AC / evaporative (census)", "دون مكيف/مبرد (التعداد)")} nature="SIMULATED" sources={["SIM_MICRODATA"]} />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <Panel title={t("assumptions")} nature="SIMULATED" sources={["SIM_CLIMATE"]} actions={<Button size="xs" onClick={() => setP(DEFAULT_CLIMATE)}>{t("reset")}</Button>}>
          <div className="space-y-3.5">
            <Slider label={L("Warming by the horizon year", "الاحترار حتى سنة الأفق")} value={p.warming} min={0} max={3.5} step={0.1} onChange={(v) => setP((s) => ({ ...s, warming: v }))} format={(v) => `+${v.toFixed(1)} °C`} />
            <Slider label={L("People served per cooling centre", "المستفيدون لكل مركز تبريد")} value={p.coolingCentreReach} min={5000} max={50000} step={1000} onChange={(v) => setP((s) => ({ ...s, coolingCentreReach: v }))} format={(v) => fmtInt(v)} />
            <div className="rounded-md bg-sand-50 px-3 py-2 text-[12px] text-ink-700">
              <div className="mb-1 font-semibold text-ink-900">{L("Hot days > 40 °C (illustrative)", "أيام > 40 درجة (توضيحي)")}</div>
              {(["LOWLAND", "DESERT", "HIGHLAND"] as HeatClass[]).map((c) => {
                const d = res.districts.find((x) => x.cls === c);
                return <div key={c} className="flex justify-between tabular"><span>{cls(c)}</span><span>{d ? `${d.hotDaysBase} → ${fmtInt(d.hotDays)}` : "—"}</span></div>;
              })}
            </div>
          </div>
        </Panel>
        <JordanMap
          height={520}
          title={`${L("Climate risk", "المخاطر المناخية")} ${year}`}
          districtValues={values}
          districtMode="all"
          scale={layer === "flood" ? "seq" : "risk"}
          format={(v) => (layer === "risk" ? v.toFixed(2) : fmtCompact(v, locale))}
          legendTitle={layer === "risk" ? L("Risk 0–1", "الخطر 0–1") : L("Persons", "أشخاص")}
          layers={[{ value: "risk", label: L("Heat risk index", "مؤشر خطر الحر") }, { value: "atRisk", label: L("People at heat risk", "المعرضون لخطر الحر") }, { value: "flood", label: L("Flash-flood exposure", "التعرض للسيول") }]}
          layer={layer}
          onLayerChange={(v) => setLayer(v as typeof layer)}
          markers={markers}
          legendExtra={layer === "flood" ? [{ color: "#2f62a6", label: L("Flood-susceptible EA (synthetic)", "منطقة عدّ معرضة للسيول (اصطناعية)") }] : undefined}
          sources={["SIM_CLIMATE", "GEO_ADM2"]}
          showLabelsDefault={false}
        />
        <Panel title={L("Priority actions", "الإجراءات ذات الأولوية")} subtitle={L("Proposed for review — not automatic decisions", "مقترحة للمراجعة — وليست قرارات تلقائية")} nature="SIMULATED">
          <ul className="space-y-2.5">
            {res.actions.map((a, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] text-ink-700">
                {a.kind === "HEAT" ? <ThermometerSun size={15} className="mt-0.5 shrink-0 text-serious" /> : <Waves size={15} className="mt-0.5 shrink-0 text-navy-600" />}
                <span className="leading-relaxed">{tx(a.text)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel className="mt-3" title={L("Districts — heat vulnerability profile", "الألوية — ملف الهشاشة الحرارية")} subtitle={L("Top 15 by heat risk", "أعلى 15 حسب خطر الحر")} nature="SIMULATED" sources={["SIM_CLIMATE", "SIM_MICRODATA"]}>
        <SimpleTable
          minWidth={900}
          head={[t("district"), L("Class", "الفئة"), L("Hot days", "أيام حارة"), "65+", "< 5", L("No cooling", "بلا تبريد"), L("Outdoor work", "عمل خارجي"), L("Vulnerability", "الهشاشة"), L("Risk", "الخطر"), L("At risk", "معرضون"), L("Cooling centres", "مراكز تبريد")]}
          rows={ranked.slice(0, 15).map((d) => [
            <span key="n"><b>{tx(world.district[d.id].name)}</b> <span className="text-ink-400">· {tx(world.gov[world.district[d.id].govId].name)}</span></span>,
            <Pill key="c">{cls(d.cls)}</Pill>,
            fmtInt(d.hotDays),
            fmtPct(d.s65),
            fmtPct(d.s5),
            fmtPct(d.noAC, 0),
            fmtPct(d.outdoor, 0),
            d.vulnerability.toFixed(2),
            <b key="r">{d.heatRisk.toFixed(2)}</b>,
            fmtInt(d.atRisk),
            fmtInt(d.coolingCentres),
          ])}
        />
      </Panel>
      <AreaActions sectors={["CLIMATE"]} />
      <Method>
        <Formula>{"heat risk = ∛( hot days ÷ max · √(pop ÷ max pop) · vulnerability )      vulnerability = mean of min–max normalised indicators"}</Formula>
        <Formula>{"people at heat risk = pop × min(1, hot days ÷ 45) × (1 − (1 − s65)(1 − s5)(1 − 0.6 · s_noCooling))"}</Formula>
        <p>{L("District vulnerability uses the district microdata sample when it has at least 320 households, otherwise the governorate profile. Hot-day classes: lowland 45 days (+14/°C), desert 25 (+10/°C), highland 4 (+4/°C) — illustrative values for demonstrating the method.", "تستخدم هشاشة اللواء عينة البيانات الجزئية للواء إذا ضمت 320 أسرة على الأقل، وإلا فملف المحافظة. فئات الأيام الحارة: الأغوار 45 يوماً (+14/درجة)، الصحراء 25 (+10/درجة)، المرتفعات 4 (+4/درجة) — قيم توضيحية لعرض المنهجية.")}</p>
      </Method>
    </div>
  );
}

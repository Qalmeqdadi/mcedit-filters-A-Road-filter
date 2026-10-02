"use client";

import { useMemo, useState } from "react";
import { MousePointerClick, Sparkles, Trash2, X } from "lucide-react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Segmented, Slider } from "@/components/ui/form";
import { JordanMap, type MapMarker, type MapPolygon } from "@/features/gis/JordanMap";
import { DISTRICT_GEO } from "@/data/geo";
import { pointInFeature, type GeoFeature } from "@/simulation/geo";
import { analyseSiting, circle, DEFAULT_NORMS, facilityInventory, suggestSites, type Facility, type FacilityKind, type FacilityNorms } from "@/simulation/lab/facilities";
import { demandNodes } from "@/simulation/lab/common";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AreaActions } from "./ActionCard";
import { Formula, LabBar, Method, SimpleTable, useLab } from "./shared";

const KINDS: FacilityKind[] = ["SCHOOL", "PHC", "HOSPITAL"];

export function Siting() {
  const { world, areaFor, baseYear, year, scenarioName } = useLab();
  const { t, tx, L, ar, locale } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const [kind, setKind] = useState<FacilityKind>("SCHOOL");
  const [normsByKind, setNorms] = useState<Record<FacilityKind, FacilityNorms>>(DEFAULT_NORMS);
  const [alpha, setAlpha] = useState(0.5);
  const [count, setCount] = useState(15);
  const [placing, setPlacing] = useState(false);
  const [proposals, setProposals] = useState<Record<FacilityKind, Facility[]>>({ SCHOOL: [], PHC: [], HOSPITAL: [] });
  const [selected, setSelected] = useState<string | null>(null);
  const norms = normsByKind[kind];
  const sa0 = areaFor(baseYear);
  const sa = areaFor(year);
  const inventory = useMemo(() => facilityInventory(world, sa0), [world, sa0]);
  const existing = inventory[kind];
  const mine = proposals[kind];
  const all = useMemo(() => [...existing, ...mine], [existing, mine]);
  const before = useMemo(() => analyseSiting(world, sa, kind, existing, norms), [world, sa, kind, existing, norms]);
  const after = useMemo(() => (mine.length ? analyseSiting(world, sa, kind, all, norms) : before), [world, sa, kind, all, norms, mine.length, before]);
  const today = useMemo(() => analyseSiting(world, sa0, kind, existing, norms), [world, sa0, kind, existing, norms]);
  const nodes = demandNodes(world);
  const unit = kind === "SCHOOL" ? L("students", "طالب") : L("residents", "ساكن");
  const kindLabel = (k: FacilityKind) => (k === "SCHOOL" ? L("Schools", "المدارس") : k === "PHC" ? L("Primary health centres", "المراكز الصحية الأولية") : L("Hospitals", "المستشفيات"));
  const setNorm = (k: keyof FacilityNorms, v: number) => setNorms((s) => ({ ...s, [kind]: { ...s[kind], [k]: v } }));

  const suggest = () => {
    const picks = suggestSites(world, sa, kind, all, norms, { count, alpha, govId });
    setProposals((s) => ({ ...s, [kind]: [...s[kind], ...picks] }));
  };
  const place = (lng: number, lat: number) => {
    const f = DISTRICT_GEO.features.find((d) => pointInFeature(lng, lat, d as GeoFeature<unknown>));
    if (!f) return;
    const n = mine.filter((x) => x.manual).length + 1;
    setProposals((s) => ({ ...s, [kind]: [...s[kind], { id: `M-${kind[0]}-${n}-${Math.round(lng * 1e4)}`, kind, lng, lat, govId: f.properties.govId, districtId: f.properties.id, capacity: norms.capacity, proposed: true, manual: true, reason: { en: `Analyst-placed in ${f.properties.nameEn}.`, ar: `موقع حدده المحلل في ${f.properties.nameAr}.` } }] }));
  };
  const remove = (id: string) => setProposals((s) => ({ ...s, [kind]: s[kind].filter((x) => x.id !== id) }));

  // ------------------------------------------------------------- map layers
  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    nodes.forEach((n, i) => {
      if (!after.nodeServed[i] && (!govId || n.govId === govId)) out.push({ id: `u-${n.id}`, lng: n.lng, lat: n.lat, color: "#b5453a", radius: 3, stroke: "#fff", label: L(`Outside the access standard — ${fmt1(after.nodeDist[i])} km to nearest`, `خارج معيار الوصول — ${fmt1(after.nodeDist[i])} كم لأقرب مرفق`) });
    });
    for (const f of existing) if (!govId || f.govId === govId) out.push({ id: f.id, lng: f.lng, lat: f.lat, color: "#4a5a74", radius: kind === "HOSPITAL" ? 5 : 2.6, stroke: "#fff", label: `${kindLabel(kind)} · ${L("capacity", "الطاقة")} ${fmtInt(f.capacity)}` });
    for (const f of mine) out.push({ id: f.id, lng: f.lng, lat: f.lat, color: f.id === selected ? "#7e2a22" : "#d07a1c", radius: 7, stroke: "#fff", label: tx(f.reason) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, after, existing, mine, govId, selected, kind, ar]);
  const polygons = useMemo<MapPolygon[]>(() => mine.map((f) => ({ coords: circle(f.lng, f.lat, world.district[f.districtId].urbanShare >= 0.7 ? norms.radiusUrban : norms.radiusRural), color: "#d07a1c", opacity: 0.1, outline: "#d07a1c" })), [mine, norms, world]);
  const districtGapPct = useMemo(() => Object.fromEntries(Object.entries(after.byDistrict).map(([k, v]) => [k, v.demand ? v.gap / v.demand : 0])), [after]);

  const capex = mine.length * norms.costM;
  const rows = world.districts
    .filter((d) => !govId || d.govId === govId)
    .map((d) => ({ d, b: before.byDistrict[d.id], a: after.byDistrict[d.id] }))
    .sort((x, y) => y.b.gap - x.b.gap)
    .slice(0, 15);

  const exportCsv = () =>
    downloadCsv(`facility-siting-${kind.toLowerCase()}-${year}.csv`, [
      ...mine.map((f) => ({ record: "PROPOSED_SITE", facility: kind, id: f.id, lng: f.lng.toFixed(5), lat: f.lat.toFixed(5), governorate: world.gov[f.govId].name.en, district: world.district[f.districtId].name.en, capacity: f.capacity, access_gain: Math.round(f.gainAccess ?? 0), capacity_gain: Math.round(f.gainCapacity ?? 0), method: f.manual ? "analyst" : "optimiser", reason: f.reason?.en ?? "", year, scenario: scenarioName, data_nature: "SIMULATED" })),
      ...world.districts.map((d) => ({ record: "DISTRICT_GAP", facility: kind, id: d.id, lng: "", lat: "", governorate: world.gov[d.govId].name.en, district: d.name.en, capacity: Math.round(after.byDistrict[d.id].capacity), access_gain: "", capacity_gain: "", method: "", reason: `demand ${Math.round(after.byDistrict[d.id].demand)}; gap ${Math.round(after.byDistrict[d.id].gap)}; access ${(after.byDistrict[d.id].accessCovered / Math.max(1, after.byDistrict[d.id].accessDemand)).toFixed(3)}`, year, scenario: scenarioName, data_nature: "SIMULATED" })),
    ]);

  return (
    <div>
      <PageHeader index={navIndex("/siting")} title={t("navSiting")} subtitle={L("Where should the next schools, health centres and hospitals go? Projected demand from the small-area projection is compared with a synthetic facility inventory for access (distance) and capacity (seats / catchment). Suggest optimal sites, or place them yourself.", "أين يجب إنشاء المدارس والمراكز الصحية والمستشفيات القادمة؟ يُقارن الطلب المسقط من إسقاط المناطق الصغيرة بمخزون مرافق اصطناعي من حيث الوصول (المسافة) والطاقة (المقاعد / نطاق الخدمة). اقترح المواقع المثلى أو حددها بنفسك.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <LabBar />
      <Callout tone="sim" className="mb-3">{L("Existing facilities are a synthetic inventory generated from the census frame — not Ministry of Education or Ministry of Health registers. Replace them before using results for decisions.", "المرافق الحالية مخزون اصطناعي مولّد من إطار التعداد — وليست سجلات وزارتي التربية والتعليم والصحة. يجب استبدالها قبل استخدام النتائج في القرار.")}</Callout>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented value={kind} onChange={(k) => { setKind(k); setSelected(null); }} options={KINDS.map((k) => ({ value: k, label: kindLabel(k) }))} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`${L("Demand", "الطلب")} ${year}`} value={fmtCompact(after.demandTotal, locale)} sub={`${unit} · ${L("today", "اليوم")} ${fmtCompact(today.demandTotal, locale)}`} nature="SIMULATED" sources={["SIM_SMALL_AREA"]} />
        <Kpi label={L("Within access standard", "ضمن معيار الوصول")} value={fmtPct(after.accessPct)} sub={mine.length ? `${L("was", "كان")} ${fmtPct(before.accessPct)}` : `${L("today", "اليوم")} ${fmtPct(today.accessPct)}`} tone={after.accessPct < 0.9 ? "warn" : undefined} nature="SIMULATED" sources={["SIM_FACILITIES"]} />
        <Kpi label={L("Capacity gap", "فجوة الطاقة")} value={fmtCompact(after.capacityGap, locale)} sub={mine.length ? `${L("was", "كان")} ${fmtCompact(before.capacityGap, locale)}` : `${L("today", "اليوم")} ${fmtCompact(today.capacityGap, locale)}`} tone={after.capacityGap > 0 ? "crit" : "ok"} nature="SIMULATED" />
        <Kpi label={L("Facilities to close gap", "مرافق لسد الفجوة")} value={fmtInt(after.facilitiesNeeded)} sub={`${L("capacity", "الطاقة")} ${fmtInt(norms.capacity)} ${unit}`} nature="SIMULATED" />
        <Kpi label={L("Proposed", "المقترح")} value={fmtInt(mine.length)} sub={`${mine.filter((x) => x.manual).length} ${L("manual", "يدوي")}`} nature="SIMULATED" />
        <Kpi label={L("Capital cost", "الكلفة الرأسمالية")} value={`${fmtInt(capex)}M`} sub={`JOD · ${fmt1(norms.costM)}M ${L("each (assumption)", "لكل مرفق (افتراض)")}`} nature="SIMULATED" />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <Panel title={L("Standards & optimiser", "المعايير والمُحسِّن")} nature="SIMULATED" sources={["SIM_FACILITIES"]}>
          <div className="space-y-3.5">
            <Slider label={L("Access standard — urban", "معيار الوصول — حضر")} value={norms.radiusUrban} min={0.5} max={kind === "HOSPITAL" ? 40 : 6} step={0.5} onChange={(v) => setNorm("radiusUrban", v)} format={(v) => `${fmt1(v)} km`} />
            <Slider label={L("Access standard — rural", "معيار الوصول — ريف")} value={norms.radiusRural} min={1} max={kind === "HOSPITAL" ? 80 : 15} step={0.5} onChange={(v) => setNorm("radiusRural", v)} format={(v) => `${fmt1(v)} km`} />
            <Slider label={L("Capacity per new facility", "طاقة المرفق الجديد")} value={norms.capacity} min={kind === "SCHOOL" ? 200 : kind === "PHC" ? 5000 : 30000} max={kind === "SCHOOL" ? 1500 : kind === "PHC" ? 40000 : 200000} step={kind === "SCHOOL" ? 20 : 1000} onChange={(v) => setNorm("capacity", v)} format={(v) => fmtInt(v)} />
            <Slider label={L("Priority: capacity ← → access", "الأولوية: الطاقة ← → الوصول")} value={alpha} min={0} max={1} step={0.05} onChange={setAlpha} format={(v) => `${Math.round((1 - v) * 100)} / ${Math.round(v * 100)}`} />
            <Slider label={L("Sites to suggest", "عدد المواقع المقترحة")} value={count} min={1} max={40} step={1} onChange={setCount} />
            <p className="text-[11.5px] text-ink-500">{govId ? L(`Search limited to ${world.gov[govId].name.en}.`, `البحث محصور في ${world.gov[govId].name.ar}.`) : L("Search covers all of Jordan. Click a governorate on the map to focus.", "يشمل البحث الأردن كله. انقر على محافظة في الخريطة للتركيز.")}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={suggest} data-testid="suggest-sites"><Sparkles size={14} />{L("Suggest optimal sites", "اقترح المواقع المثلى")}</Button>
              <Button variant={placing ? "accent" : "outline"} onClick={() => setPlacing((x) => !x)}><MousePointerClick size={14} />{placing ? L("Placing — click map", "وضع — انقر الخريطة") : L("Place manually", "وضع يدوي")}</Button>
              {mine.length ? <Button variant="ghost" onClick={() => setProposals((s) => ({ ...s, [kind]: [] }))}><Trash2 size={14} />{L("Clear", "مسح")}</Button> : null}
            </div>
          </div>
        </Panel>

        <JordanMap
          height={560}
          title={`${kindLabel(kind)} — ${L("capacity gap by district", "فجوة الطاقة حسب اللواء")} ${year}`}
          districtValues={districtGapPct}
          districtMode={govId ? "drill" : "all"}
          scale="risk"
          domain={[0, 0.35]}
          format={(v) => fmtPct(v, 0)}
          legendTitle={L("Gap ÷ demand", "الفجوة ÷ الطلب")}
          selectedGov={govId}
          onSelectGov={selectGov}
          markers={markers}
          polygons={polygons}
          clickMode={placing ? "place" : "select"}
          onMapClick={placing ? place : undefined}
          onSelectMarker={(id) => setSelected(id)}
          legendExtra={[{ color: "#4a5a74", label: L("Existing (synthetic)", "قائم (اصطناعي)") }, { color: "#d07a1c", label: L("Proposed", "مقترح") }, { color: "#b5453a", label: L("Demand outside standard", "طلب خارج المعيار") }]}
          sources={["SIM_FACILITIES", "SIM_SMALL_AREA", "GEO_ADM2"]}
          showLabelsDefault={false}
        />

        <Panel title={L("Proposed sites", "المواقع المقترحة")} subtitle={L("Each pick explains its access and capacity gain.", "يشرح كل اختيار مكسبه في الوصول والطاقة.")} nature="SIMULATED" bodyClass="p-0">
          {mine.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-ink-500">{L("No proposals yet. Use “Suggest optimal sites” or place sites on the map.", "لا توجد مقترحات بعد. استخدم «اقترح المواقع المثلى» أو ضع مواقع على الخريطة.")}</p>
          ) : (
            <ol className="thin-scroll max-h-[520px] divide-y divide-line/70 overflow-y-auto">
              {mine.map((f, i) => (
                <li key={f.id} className={cn("flex gap-2 px-4 py-2.5 text-[12.5px]", f.id === selected && "bg-sand-50")} onMouseEnter={() => setSelected(f.id)}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d07a1c] text-[10.5px] font-semibold text-white tabular">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink-900">{tx(world.district[f.districtId].name)} <span className="text-ink-400">· {tx(world.gov[f.govId].name)}</span></div>
                    <p className="mt-0.5 text-ink-700">{tx(f.reason)}</p>
                  </div>
                  <button type="button" onClick={() => remove(f.id)} className="h-6 w-6 shrink-0 rounded text-ink-400 hover:bg-sand-100 hover:text-ink-900" aria-label={L("Remove", "إزالة")}><X size={14} className="mx-auto" /></button>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel className="mt-3" title={L("Districts with the largest capacity gap", "الألوية ذات أكبر فجوة في الطاقة")} subtitle={`${kindLabel(kind)} · ${year} · ${scenarioName}`} nature="SIMULATED" sources={["SIM_FACILITIES", "SIM_SMALL_AREA"]}>
        <SimpleTable
          minWidth={720}
          head={[t("district"), L("Demand", "الطلب"), L("Capacity", "الطاقة"), L("Gap", "الفجوة"), L("Facilities needed", "مرافق لازمة"), L("Access", "الوصول"), L("Proposed", "مقترح"), L("Gap after", "الفجوة بعد")]}
          rows={rows.map(({ d, b, a }) => [
            <span key="n"><b>{tx(d.name)}</b> <span className="text-ink-400">· {tx(world.gov[d.govId].name)}</span></span>,
            fmtInt(b.demand),
            fmtInt(b.capacity),
            <span key="g" className={b.gap > 0 ? "font-semibold text-crit" : "text-ok"}>{fmtInt(b.gap)}</span>,
            fmtInt(Math.ceil(b.gap / norms.capacity)),
            fmtPct(b.accessCovered / Math.max(1, b.accessDemand), 0),
            a.proposed ? fmtInt(a.proposed) : "—",
            a.proposed ? fmtInt(a.gap) : "—",
          ])}
        />
      </Panel>

      <AreaActions sectors={["EDUCATION", "HEALTH"]} />
      <Method>
        <Formula>{kind === "SCHOOL" ? "demand = node population × (6–17 share of district) × 0.95 enrolment" : "demand = node population (residents)"}</Formula>
        <Formula>{"access = nearest facility ≤ standard (urban / rural radius)   ·   gap = max(0, district demand − capacity located in district)"}</Formula>
        <Formula>{"score(c) = α · min(C, uncovered demand within reach of c) + (1 − α) · min(C, remaining gap of c's district)"}</Formula>
        <p>{L("The optimiser is a greedy maximal-covering heuristic: it repeatedly picks the candidate demand node with the highest score, then updates coverage and the district gap. Candidates are the ≈1,800 demand nodes (EAs aggregated on a 2 km grid). Results are near-optimal, fast and fully explainable; an exact p-median/MCLP solver can replace it in production.", "المُحسِّن خوارزمية جشعة للتغطية القصوى: يختار مراراً نقطة الطلب ذات أعلى نتيجة ثم يحدّث التغطية وفجوة اللواء. المرشحون هم نحو 1,800 نقطة طلب (مناطق العدّ مجمعة على شبكة 2 كم). النتائج قريبة من المثلى وسريعة وقابلة للتفسير بالكامل؛ ويمكن استبدالها بحل دقيق في التشغيل الفعلي.")}</p>
      </Method>
    </div>
  );
}

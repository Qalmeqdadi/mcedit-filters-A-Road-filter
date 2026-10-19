"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileWarning, Landmark, ListTree, ScrollText, Telescope } from "lucide-react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { Panel, Callout } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { barH } from "@/components/charts/builders";
import { JordanMap } from "@/features/gis/JordanMap";
import { cn } from "@/lib/utils";
import type { GovId } from "@/types/census";
import { AS_OF, ENTITIES, GOVS, HEADLINE, indicator, INDICATORS, PILLAR_LABEL, PILLARS, freshness, fmtValue, proposedRequests, scorecards, type Indicator, type Status } from "@/data/registry";
import { ConceptBanner, FreshDot, govName, OwnerChip, SourcePop, Spark, StatusBadge } from "./parts";

/** Governorate columns of the Kingdom table (missing series are shown as requests). */
export const MICRO_COLS = ["GOV_POP", "GOV_DENSITY", "GOV_UNEMP_Q", "GOV_UNEMP_JOR_Q", "GOV_UNEMP_JOR_A", "GOV_EMP_CHANGE", "GOV_REFUGEES", "GOV_POVERTY", "GOV_BEDS", "GOV_WATER", "GOV_MUNI_REV"];

export function sparkOf(i: Indicator): number[] {
  if (i.quarterly?.length) return i.quarterly.map((q) => q[1]);
  return (i.series ?? []).filter((x) => x[0] >= 2010).map((x) => x[1]);
}

export function HeadlineTile({ i }: { i: Indicator }) {
  const { tx, L } = useI18n();
  const f = freshness(i);
  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-line bg-card px-3.5 py-3" data-testid="headline-tile">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11.5px] font-medium leading-tight text-ink-500">{tx(i.name)}</div>
        <OwnerChip id={i.owner} />
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[21px] font-semibold leading-none tracking-[-0.02em] text-ink-900 tabular">{fmtValue(i, i.value)}</span>
        <span className="text-[11.5px] text-ink-500">{tx(i.unit)}</span>
      </div>
      <div className="mt-1.5"><Spark data={sparkOf(i)} color={i.status === "OFFICIAL" || i.status === "REPORTED" ? "#1f7a4d" : "#5a4a94"} w={150} /></div>
      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-[11px] text-ink-500">
        <StatusBadge s={i.status} />
        <SourcePop i={i}>{i.period}</SourcePop>
        <FreshDot f={f.state} />
      </div>
      <span className="sr-only">{L("Latest period", "آخر فترة")}</span>
    </div>
  );
}

export function GovCell({ i, g }: { i: Indicator; g: GovId }) {
  const { L, tx } = useI18n();
  const st: Status = i.govStatus?.[g] ?? i.status;
  const v = i.byGov?.[g];
  if (st === "MISSING" || v === undefined) return <span className="text-[11px] font-medium text-crit" title={L("Requested from", "مطلوب من") + " " + tx(ENTITIES.find((e) => e.id === i.owner)!.name)}>{L("Requested", "مطلوب")}</span>;
  return <span className={cn("tabular", st === "DERIVED" && "italic")} title={tx({ en: st, ar: st })}>{fmtValue(i, v)}</span>;
}

export function Dashboard() {
  const { tx, L, ar, t } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const mapable = INDICATORS.filter((i) => i.level === "MICRO" && i.byGov && Object.keys(i.byGov).length >= 4);
  const [layer, setLayer] = useState("GOV_UNEMP_Q");
  const li = indicator(layer);
  const counts = useMemo(() => {
    const c: Record<Status, number> = { OFFICIAL: 0, REPORTED: 0, DERIVED: 0, INTERNATIONAL: 0, MISSING: 0 };
    INDICATORS.forEach((i) => { c[i.status]++; });
    return c;
  }, []);
  const fresh = INDICATORS.filter((i) => freshness(i).state === "CURRENT").length;
  const reqs = proposedRequests();
  const cards = scorecards();
  const unemp = indicator("GOV_UNEMP_Q");
  const order = [...GOVS].sort((a, b) => unemp.byGov![b]! - unemp.byGov![a]!);
  const spread = useMemo(() => {
    const o = barH(order.map((g) => govName(g, ar)), [{ name: L("Unemployment rate", "معدل البطالة"), data: order.map((g) => unemp.byGov![g]!), color: "#b5453a" }], { rtl: ar, showLabels: true, fmt: (v) => `${v}%` });
    const s = (o.series as Record<string, unknown>[])[0];
    s.markLine = { symbol: "none", silent: true, lineStyle: { color: "#141a24", type: "dashed", width: 1 }, label: { position: "start", formatter: `${L("Kingdom", "المملكة")} ${unemp.value}%`, fontSize: 10.5, color: "#141a24" }, data: [{ xAxis: unemp.value }] };
    return o;
  }, [order, unemp, ar, L]);
  const popI = indicator("DOS_POP_TOTAL");
  const wbPop = indicator("WDI_SP_POP_TOTL");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sand-500">{L("The Hashemite Kingdom of Jordan · snapshot", "المملكة الأردنية الهاشمية · لقطة")} {AS_OF}</div>
          <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.015em] text-ink-900 text-balance">{L("National Macro–Micro Dashboard", "لوحة المؤشرات الوطنية الكلية والجزئية")}</h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-500">{L("One view of the Kingdom: national (macro) indicators and the same picture for every governorate (micro), each figure tied to the entity accountable for supplying it, how fresh it is and where it came from. Gaps are not hidden — they become data requests.", "رؤية واحدة للمملكة: المؤشرات الوطنية (الكلية) والصورة نفسها لكل محافظة (الجزئية)، وكل رقم مرتبط بالجهة المسؤولة عن تزويده ومدى حداثته ومصدره. الفجوات لا تُخفى — بل تتحول إلى طلبات بيانات.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/indicators"><Button><ListTree size={14} />{t("navIndicators")}</Button></Link>
          <Link href="/accountability"><Button><Landmark size={14} />{t("navAccountability")}</Button></Link>
          <Link href="/data-requests"><Button variant="primary"><FileWarning size={14} />{t("navRequests")} ({reqs.length})</Button></Link>
        </div>
      </div>
      <ConceptBanner />

      {/* data health */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7" data-testid="data-health">
        {([["OFFICIAL", counts.OFFICIAL], ["REPORTED", counts.REPORTED], ["DERIVED", counts.DERIVED], ["INTERNATIONAL", counts.INTERNATIONAL], ["MISSING", counts.MISSING]] as [Status, number][]).map(([s, n]) => (
          <div key={s} className="flex flex-col gap-1 rounded-md border border-line bg-card px-3 py-2"><StatusBadge s={s} className="self-start" /><span className="text-[19px] font-semibold tabular text-ink-900">{n}</span><span className="text-[11px] text-ink-500">{L("indicators", "مؤشراً")}</span></div>
        ))}
        <div className="flex flex-col gap-1 rounded-md border border-line bg-card px-3 py-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-ok">{L("Current", "محدّث")}</span><span className="text-[19px] font-semibold tabular text-ink-900">{Math.round((fresh / INDICATORS.length) * 100)}%</span><span className="text-[11px] text-ink-500">{L("within the proposed delivery window", "ضمن نافذة التسليم المقترحة")}</span></div>
        <div className="flex flex-col gap-1 rounded-md border border-line bg-card px-3 py-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-navy-700">{L("Accountable entities", "الجهات المسؤولة")}</span><span className="text-[19px] font-semibold tabular text-ink-900">{cards.length}</span><span className="text-[11px] text-ink-500">{reqs.length} {L("data requests drafted", "طلب بيانات مُعدّ")}</span></div>
      </div>

      {/* macro */}
      <h2 className="mb-2 mt-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-navy-800">{L("Macro · the Kingdom", "الكلي · المملكة")}</h2>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {HEADLINE.map((id) => <HeadlineTile key={id} i={indicator(id)} />)}
      </div>
      <Callout className="mt-2.5">
        <b>{L("One number per question.", "رقم واحد لكل سؤال.")}</b> {L(`Population: DoS reports ${fmtValue(popI, popI.value)} million (end-2025); the World Bank series used internationally shows ${fmtValue(wbPop, wbPop.value)} million for 2025 — a gap of ${Math.round((popI.value! - wbPop.value!) / 1000)} thousand people. Under the proposed charter the DoS figure is the national reference and international series are shown only for comparison.`, `السكان: تقدّر الدائرة ${fmtValue(popI, popI.value)} مليون نسمة (نهاية 2025)، بينما تُظهر سلسلة البنك الدولي المستخدمة دولياً ${fmtValue(wbPop, wbPop.value)} مليون لعام 2025 — بفارق ${Math.round((popI.value! - wbPop.value!) / 1000)} ألف نسمة. وفق الميثاق المقترح يكون رقم الدائرة هو المرجع الوطني وتُعرض السلاسل الدولية للمقارنة فقط.`)}
      </Callout>

      {/* micro */}
      <h2 className="mb-2 mt-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-navy-800">{L("Micro · the twelve governorates", "الجزئي · المحافظات الاثنتا عشرة")}</h2>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Panel title={tx(li.name)} subtitle={`${li.period} · ${tx(li.unit)}`} actions={<StatusBadge s={li.status} />} bodyClass="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{L("Map layer", "طبقة الخريطة")}</span>
            <Select value={layer} onChange={(e) => setLayer(e.target.value)} data-testid="micro-layer">{mapable.map((i) => <option key={i.id} value={i.id}>{tx(i.name)}</option>)}</Select>
            <SourcePop i={li} />
          </div>
          <JordanMap height={430} govValues={li.byGov} scale={li.better === "down" ? "risk" : "seq"} format={(v) => fmtValue(li, v)} legendTitle={tx(li.unit)} selectedGov={govId} onSelectGov={selectGov} showLabelsDefault />
        </Panel>
        <Panel title={L("Unemployment by governorate against the Kingdom", "البطالة حسب المحافظة مقارنة بالمملكة")} subtitle={`${unemp.period} · ${L("DoS Labour Force Survey", "مسح قوة العمل")} · ${L("range", "المدى")} ${Math.min(...Object.values(unemp.byGov!) as number[])}–${Math.max(...Object.values(unemp.byGov!) as number[])}%`} actions={<StatusBadge s="OFFICIAL" />}>
          <EChart option={spread} height={360} />
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">{L("The national rate hides a three-fold gap between governorates. Macro targets need micro delivery: this is the link the dashboard keeps visible.", "يخفي المعدل الوطني فجوة بثلاثة أضعاف بين المحافظات. الأهداف الكلية تحتاج إلى تنفيذ جزئي: وهذا هو الرابط الذي تُبقيه اللوحة ظاهراً.")}</p>
        </Panel>
      </div>

      <Panel className="mt-3" title={L("Governorate table — latest available figures", "جدول المحافظات — آخر الأرقام المتاحة")} subtitle={L("Click a governorate for its dossier. Red 'Requested' cells are series no entity publishes openly at governorate level — each one is in the data-request register.", "انقر على محافظة لفتح ملفها. الخلايا الحمراء «مطلوب» سلاسل لا تنشرها أي جهة علناً على مستوى المحافظة — وكل منها مدرج في سجل طلبات البيانات.")} bodyClass="p-0">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[1080px] text-[12px]" data-testid="gov-table">
            <thead>
              <tr className="border-b border-line text-[10.5px] text-ink-500">
                <th className="px-3 py-2 text-start font-semibold uppercase tracking-wide">{t("governorate")}</th>
                {MICRO_COLS.map((id) => { const i = indicator(id); return <th key={id} className="px-2 py-2 text-end align-bottom font-medium"><div className="font-semibold text-ink-700">{tx(i.name)}</div><div className="mt-0.5 flex flex-wrap justify-end gap-1"><span>{i.period ?? "—"}</span><OwnerChip id={i.owner} /></div><div className="mt-1 flex justify-end"><StatusBadge s={i.status} /></div></th>; })}
              </tr>
            </thead>
            <tbody>
              {GOVS.map((g) => (
                <tr key={g} onClick={() => selectGov(g)} className={cn("cursor-pointer border-b border-line/60 hover:bg-sand-50", govId === g && "bg-navy-100/50")}>
                  <td className="px-3 py-1.5 font-semibold text-ink-900"><Link href="/governorates" onClick={() => selectGov(g)} className="hover:underline">{govName(g, ar)}</Link></td>
                  {MICRO_COLS.map((id) => <td key={id} className="px-2 py-1.5 text-end"><GovCell i={indicator(id)} g={g} /></td>)}
                </tr>
              ))}
              <tr className="bg-sand-50 font-semibold">
                <td className="px-3 py-1.5 text-ink-900">{L("Kingdom", "المملكة")}</td>
                {MICRO_COLS.map((id) => { const i = indicator(id); return <td key={id} className="px-2 py-1.5 text-end tabular">{i.value !== undefined ? fmtValue(i, i.value) : "—"}</td>; })}
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* pillars */}
      <h2 className="mb-2 mt-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-navy-800">{L("Six pillars", "ست ركائز")}</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PILLARS.map((p) => {
          const items = INDICATORS.filter((i) => i.pillar === p);
          const cur = items.filter((i) => freshness(i).state === "CURRENT").length;
          const miss = items.filter((i) => i.status === "MISSING").length;
          const show = items.filter((i) => i.level === "MACRO" && i.value !== undefined).slice(0, 5);
          return (
            <Panel key={p} title={tx(PILLAR_LABEL[p])} subtitle={`${items.length} ${L("indicators", "مؤشراً")} · ${cur} ${L("current", "محدّث")} · ${miss} ${L("missing", "غير متاح")}`}>
              <ul className="divide-y divide-line/60">
                {show.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 py-1.5">
                    <div className="min-w-0"><div className="truncate text-[12.5px] text-ink-900">{tx(i.name)}</div><div className="flex items-center gap-1.5 text-[11px] text-ink-500"><SourcePop i={i}>{i.period}</SourcePop><FreshDot f={freshness(i).state} /></div></div>
                    <Spark data={sparkOf(i)} w={70} h={22} />
                    <div className="w-[88px] shrink-0 text-end"><div className="text-[13px] font-semibold tabular text-ink-900">{fmtValue(i, i.value)}</div><div className="truncate text-[10.5px] text-ink-500">{tx(i.unit)}</div></div>
                  </li>
                ))}
              </ul>
              <Link href="/indicators" className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-navy-600 hover:underline">{L("All indicators in this pillar", "كل مؤشرات هذه الركيزة")}<ArrowRight size={12} className="rtl:rotate-180" /></Link>
            </Panel>
          );
        })}
      </div>

      {/* accountability teaser */}
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title={L("Who owes the Kingdom which data", "من يُطلب منه أي بيانات")} subtitle={L("Indicative readiness score per entity (proposed method) — based only on what was found in open channels", "درجة جاهزية تأشيرية لكل جهة (منهجية مقترحة) — بناءً فقط على ما وُجد في القنوات المفتوحة")} actions={<Link href="/accountability" className="whitespace-nowrap text-[12px] font-medium text-navy-600 hover:underline">{L("Scorecards", "بطاقات الأداء")} →</Link>}>
          <ul className="space-y-1.5">
            {[...cards].sort((a, b) => a.score - b.score).slice(0, 8).map((c) => (
              <li key={c.entity.id} className="flex items-center gap-2 text-[12.5px]">
                <span className="w-[150px] shrink-0 truncate text-ink-900" title={tx(c.entity.name)}>{tx(c.entity.short)}</span>
                <div className="h-2 flex-1 rounded-full bg-sand-100"><div className="h-2 rounded-full" style={{ width: `${c.score}%`, background: c.score >= 70 ? "#1f7a4d" : c.score >= 45 ? "#b97a0f" : "#b5453a" }} /></div>
                <span className="w-8 text-end font-semibold tabular">{c.score}</span>
                <span className="w-[92px] text-end text-[11px] text-crit">{c.missing ? `${c.missing} ${L("missing", "غير متاح")}` : ""}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={L("From measurement to foresight", "من القياس إلى الاستشراف")} subtitle={L("The official baseline above feeds UFUQ's planning models (simulated)", "يغذي خط الأساس الرسمي أعلاه نماذج أفق للتخطيط (محاكاة)")}>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["/foresight", Telescope, L("Foresight hub", "مركز الاستشراف"), L("Scenarios, projections and sector models to 2050", "السيناريوهات والإسقاطات والنماذج القطاعية حتى 2050")],
              ["/action-plans", ListTree, L("Area action plans", "خطط العمل للمناطق"), L("Corrective actions per governorate", "إجراءات تصحيحية لكل محافظة")],
              ["/delivery", Landmark, L("Delivery tracker", "متابعة التنفيذ"), L("Approved actions followed to delivery", "متابعة الإجراءات المعتمدة حتى التنفيذ")],
              ["/governance", ScrollText, L("Governance charter", "ميثاق الحوكمة"), L("Owner, validator, channel and service levels", "المالك والمعتمد والقناة ومستويات الخدمة")],
            ].map(([href, Icon, a, b]) => {
              const I = Icon as typeof Telescope;
              return <Link key={href as string} href={href as string} className="flex gap-2.5 rounded-md border border-line px-3 py-2 hover:bg-sand-50"><I size={16} className="mt-0.5 shrink-0 text-navy-600" /><div><div className="text-[13px] font-semibold text-ink-900">{a as string}</div><div className="text-[11.5px] leading-snug text-ink-500">{b as string}</div></div></Link>;
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { EChart } from "@/components/charts/echart";
import { barV, line, VIZ } from "@/components/charts/builders";
import { navIndex } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { GOV_LABOUR } from "@/data/governorates.generated";
import { GOVS, indicator, INDICATORS, entity, freshness, fmtValue, proposedRequests, type Status } from "@/data/registry";
import { Button } from "@/components/ui/button";
import { saveBlob } from "@/lib/hosted";
import { FileText } from "lucide-react";
import type { GovId } from "@/types/census";
import { ConceptBanner, FreshDot, govName, OwnerChip, SourcePop, StatusBadge } from "./parts";

export function Governorates() {
  const { tx, L, ar, t } = useI18n();
  const sel = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const g: GovId = sel ?? "AMM";
  const micro = INDICATORS.filter((i) => i.level === "MICRO");
  const reqs = proposedRequests();
  const rank = (id: string) => {
    const i = indicator(id);
    const v = i.byGov?.[g];
    if (v === undefined) return null;
    return 1 + GOVS.filter((x) => (i.byGov?.[x] ?? -Infinity) > v).length;
  };
  const A = GOV_LABOUR.annual;
  const Q = GOV_LABOUR.quarterly;
  const annual = useMemo(() => {
    const nat = A.years.map((y) => { const s = GOVS.reduce((a, x) => { const r = A.byGov[x].find((k) => k.year === y)!; return { e: a.e + r.employed, u: a.u + r.unemployed }; }, { e: 0, u: 0 }); return +((s.u / (s.e + s.u)) * 100).toFixed(1); });
    return line(A.years, [
      { name: govName(g, ar), data: A.byGov[g].map((r) => +r.rate.toFixed(1)), color: VIZ[0] },
      { name: L("Kingdom", "المملكة"), data: nat, color: "#8c8a83", dashed: true },
    ], { rtl: ar, legend: true, fmt: (v) => `${v}%` });
  }, [A, g, ar, L]);
  const quarterly = useMemo(() => barV(Q.map((q) => q.period), [
    { name: `${govName(g, ar)} — ${L("all residents", "جميع السكان")}`, data: Q.map((q) => q.total.byGov[g]), color: VIZ[0] },
    { name: `${L("Kingdom", "المملكة")} — ${L("all residents", "جميع السكان")}`, data: Q.map((q) => q.total.national ?? 0), color: "#b9c3d3" },
    { name: `${govName(g, ar)} — ${L("Jordanians", "الأردنيون")}`, data: Q.map((q) => q.jordanians.byGov[g]), color: VIZ[2] },
  ], { rtl: ar, legend: true, fmt: (v) => `${v}%` }), [Q, g, ar, L]);
  const employed = useMemo(() => barV(A.years.map(String), [{ name: L("Employed Jordanians", "الأردنيون العاملون"), data: A.byGov[g].map((r) => r.employed), color: VIZ[1] }, { name: L("Unemployed Jordanians", "الأردنيون المتعطلون"), data: A.byGov[g].map((r) => r.unemployed), color: "#b5453a" }], { rtl: ar, legend: true, stack: true, fmt: (v) => v.toLocaleString("en-US") }), [A, g, ar, L]);
  const tiles = ["GOV_POP", "GOV_SHARE", "GOV_DENSITY", "GOV_UNEMP_Q", "GOV_UNEMP_JOR_Q", "GOV_EMPLOYED_JOR", "GOV_EMP_CHANGE", "GOV_REFUGEES"];
  const [busy, setBusy] = useState(false);
  const exportDossier = async () => {
    setBusy(true);
    try {
      const { buildDossierDocx } = await import("@/lib/dossierDocx");
      await saveBlob(`dossier-${g}${ar ? "-ar" : ""}.docx`, await buildDossierDocx(g, govName(g, ar), ar));
    } finally {
      setBusy(false);
    }
  };
  const missingHere = micro.filter((i) => (i.govStatus?.[g] ?? i.status) === "MISSING");

  return (
    <div>
      <PageHeader index={navIndex("/governorates")} title={t("navGovernorates")} subtitle={L("Each governorate on one page: the latest official and derived figures, its rank among the twelve, how it compares with the Kingdom, and which figures no entity yet publishes for it.", "كل محافظة في صفحة واحدة: آخر الأرقام الرسمية والمشتقة وترتيبها بين المحافظات الاثنتي عشرة ومقارنتها بالمملكة، والأرقام التي لا تنشرها أي جهة لها بعد.")}>
        <Button onClick={exportDossier} disabled={busy} data-testid="dossier-docx"><FileText size={14} />{busy ? L("Preparing…", "جارٍ الإعداد…") : L("Dossier (Word)", "الملف (Word)")}</Button>
      </PageHeader>
      <ConceptBanner />
      <div className="mb-3 flex flex-wrap gap-1.5" data-testid="gov-chips">
        {GOVS.map((x) => <button key={x} type="button" onClick={() => selectGov(x)} className={cn("rounded-full border px-3 py-1 text-[12.5px]", x === g ? "border-navy-700 bg-navy-800 text-white" : "border-line bg-card text-ink-700 hover:bg-sand-50")}>{govName(x, ar)}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {tiles.map((id) => {
          const i = indicator(id);
          const st: Status = i.govStatus?.[g] ?? i.status;
          const v = i.byGov?.[g];
          const r = rank(id);
          return (
            <div key={id} className="flex min-w-0 flex-col rounded-lg border border-line bg-card px-3.5 py-3" data-testid="dossier-tile">
              <div className="flex items-start justify-between gap-2"><span className="text-[11.5px] font-medium leading-tight text-ink-500">{tx(i.name)}</span><OwnerChip id={i.owner} /></div>
              <div className="mt-1.5 flex items-baseline gap-1.5"><span className={cn("text-[21px] font-semibold leading-none tabular", st === "MISSING" ? "text-crit" : "text-ink-900")}>{st === "MISSING" ? L("Requested", "مطلوب") : fmtValue(i, v)}</span><span className="text-[11.5px] text-ink-500">{st === "MISSING" ? "" : tx(i.unit)}</span></div>
              <div className="mt-1.5 text-[11.5px] text-ink-500 tabular">{L("Kingdom", "المملكة")} {fmtValue(i, i.value)}{r ? ` · ${L("rank", "الترتيب")} ${r}/12` : ""}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]"><StatusBadge s={st} /><SourcePop i={i}>{i.period}</SourcePop></div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <Panel title={L("Jordanian unemployment, 2017–2025", "البطالة بين الأردنيين 2017–2025")} subtitle={L("Derived from official DoS counts (unemployed ÷ labour force)", "مشتقة من أعداد الدائرة الرسمية (المتعطلون ÷ القوى العاملة)")} actions={<StatusBadge s="DERIVED" />}><EChart option={annual} height={260} /></Panel>
        <Panel title={L("Unemployment rate, last four quarters", "معدل البطالة في آخر أربعة أرباع")} subtitle={L("Published DoS rates by governorate", "معدلات الدائرة المنشورة حسب المحافظة")} actions={<StatusBadge s="OFFICIAL" />}><EChart option={quarterly} height={260} /></Panel>
        <Panel title={L("Employed and unemployed Jordanians", "الأردنيون العاملون والمتعطلون")} subtitle={L("DoS PxWeb tables EMPALL / EMPALL1", "جداول الدائرة EMPALL / EMPALL1")} actions={<StatusBadge s="OFFICIAL" />}><EChart option={employed} height={260} /></Panel>
      </div>
      <Panel className="mt-3" title={`${L("Every governorate indicator", "كل مؤشرات المحافظة")} — ${govName(g, ar)}`} subtitle={`${micro.length - missingHere.length} ${L("available", "متاح")} · ${missingHere.length} ${L("requested from the accountable entity", "مطلوب من الجهة المسؤولة")}`} bodyClass="p-0">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[860px] text-[12px]" data-testid="dossier-table">
            <thead><tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-500"><th className="px-3 py-2 text-start">{L("Indicator", "المؤشر")}</th><th className="px-2 text-end">{govName(g, ar)}</th><th className="px-2 text-end">{L("Kingdom", "المملكة")}</th><th className="px-2 text-end">{L("Rank", "الترتيب")}</th><th className="px-2 text-start">{L("Status", "الحالة")}</th><th className="px-2 text-start">{L("Period", "الفترة")}</th><th className="px-2 text-start">{L("Accountable", "المسؤول")}</th><th className="px-2 text-start">{L("Freshness", "الحداثة")}</th></tr></thead>
            <tbody>
              {micro.map((i) => {
                const st: Status = i.govStatus?.[g] ?? i.status;
                const req = reqs.find((r) => r.indicatorIds.includes(i.id));
                const r = rank(i.id);
                return (
                  <tr key={i.id} className="border-b border-line/60">
                    <td className="px-3 py-1.5 text-ink-900"><SourcePop i={i}>{tx(i.name)}</SourcePop> <span className="text-[11px] text-ink-500">({tx(i.unit)})</span></td>
                    <td className={cn("px-2 text-end font-semibold tabular", st === "MISSING" && "text-crit")}>{st === "MISSING" ? (req ? <Link href="/data-requests" className="hover:underline">{req.id}</Link> : L("Requested", "مطلوب")) : fmtValue(i, i.byGov?.[g])}</td>
                    <td className="px-2 text-end tabular text-ink-700">{fmtValue(i, i.value)}</td>
                    <td className="px-2 text-end tabular text-ink-700">{r ? `${r}/12` : "—"}</td>
                    <td className="px-2"><StatusBadge s={st} /></td>
                    <td className="px-2 text-ink-700">{i.period ?? "—"}</td>
                    <td className="px-2"><span title={tx(entity(i.owner).name)}><OwnerChip id={i.owner} /></span></td>
                    <td className="px-2"><FreshDot f={st === "MISSING" ? "MISSING" : freshness(i).state} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Callout className="mt-3">
        {L("The planning layer of UFUQ (projections, action plans, siting, water, energy) runs on a simulated census frame sized to these official population figures. ", "تعمل طبقة التخطيط في أفق (الإسقاطات وخطط العمل والمواقع والمياه والطاقة) على إطار تعداد محاكى مضبوط على أرقام السكان الرسمية هذه. ")}
        <Link href="/action-plans" className="inline-flex items-center gap-1 font-medium text-navy-700 hover:underline">{L("Open the action plan for", "افتح خطة العمل لـ")} {govName(g, ar)}<ArrowRight size={12} className="rtl:rotate-180" /></Link>
      </Callout>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { EChart } from "@/components/charts/echart";
import { barH } from "@/components/charts/builders";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { AS_OF, CHANNEL_SCORE, INDICATORS, PROPOSED_LAG, freshness, fmtValue, proposedRequests, scorecards } from "@/data/registry";
import { ConceptBanner, FreshDot, SourcePop, StatusBadge } from "./parts";

const CHANNEL: Record<string, { en: string; ar: string }> = { API: { en: "API / databank", ar: "واجهة / قاعدة بيانات" }, FILES: { en: "Files (Excel/CSV)", ar: "ملفات (Excel/CSV)" }, PDF: { en: "PDF reports", ar: "تقارير PDF" }, NONE: { en: "No open channel found", ar: "لا قناة مفتوحة" } };

export function Accountability() {
  const { tx, L, ar, t } = useI18n();
  const cards = useMemo(() => scorecards(), []);
  const reqs = proposedRequests();
  const [open, setOpen] = useState<string | null>("DOS");
  const chart = useMemo(() => {
    const s = [...cards].sort((a, b) => b.score - a.score);
    return barH(s.map((c) => tx(c.entity.short)), [{ name: L("Readiness score", "درجة الجاهزية"), data: s.map((c) => c.score), color: "#2f62a6" }], { rtl: ar, showLabels: true });
  }, [cards, tx, ar, L]);
  const exportCsv = () => downloadCsv(`entity-scorecards-${AS_OF}.csv`, cards.map((c) => ({ entity: c.entity.name.en, indicators_owned: c.owned, available: c.available, current: c.current, late: c.late, stale: c.stale, missing: c.missing, machine_read_official: c.machineRead, channel: c.entity.channel.type, indicative_score: c.score, snapshot: AS_OF, method: "proposed: 50% coverage + 35% timeliness + 15% machine-readable channel" })));
  return (
    <div>
      <PageHeader index={navIndex("/accountability")} title={t("navAccountability")} subtitle={L("Every indicator has one accountable entity. This page shows, for each entity, what the dashboard needs from it, what could be found in open channels on the snapshot date, how fresh it is, and what has been requested.", "لكل مؤشر جهة مسؤولة واحدة. تعرض هذه الصفحة لكل جهة ما تحتاجه اللوحة منها، وما أمكن العثور عليه في القنوات المفتوحة بتاريخ اللقطة، ومدى حداثته، وما طُلب منها.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <ConceptBanner />
      <Callout tone="warn" className="mb-3">{L("Scores are indicative and use a proposed method. They measure only what UFUQ could obtain from open public channels — an entity may hold or publish more than was found. They are a starting point for the data agreement, not an assessment of any entity's performance.", "الدرجات تأشيرية وتستخدم منهجية مقترحة. تقيس فقط ما أمكن لأفق الحصول عليه من القنوات العامة المفتوحة — وقد تملك الجهة أو تنشر أكثر مما وُجد. هي نقطة انطلاق لاتفاقية البيانات وليست تقييماً لأداء أي جهة.")}</Callout>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title={L("Entity scorecards", "بطاقات أداء الجهات")} subtitle={`${L("Snapshot", "اللقطة")} ${AS_OF} · ${cards.length} ${L("entities", "جهة")} · ${INDICATORS.length} ${L("indicators", "مؤشراً")}`} bodyClass="p-0">
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[820px] text-[12px]" data-testid="scorecards">
              <thead><tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-500"><th className="px-3 py-2 text-start">{L("Entity", "الجهة")}</th><th className="px-2 text-end">{L("Owned", "المسؤول عنها")}</th><th className="px-2 text-end text-ok">{L("Current", "محدّث")}</th><th className="px-2 text-end text-warn">{L("Late", "متأخر")}</th><th className="px-2 text-end text-serious">{L("Stale", "قديم")}</th><th className="px-2 text-end text-crit">{L("Missing", "غير متاح")}</th><th className="px-2 text-start">{L("Channel found", "القناة")}</th><th className="px-2 text-end">{L("Score", "الدرجة")}</th><th className="w-8" /></tr></thead>
              <tbody>
                {cards.map((c) => {
                  const own = INDICATORS.filter((i) => i.owner === c.entity.id);
                  const isOpen = open === c.entity.id;
                  return [
                    <tr key={c.entity.id} onClick={() => setOpen(isOpen ? null : c.entity.id)} className={cn("cursor-pointer border-b border-line/60 hover:bg-sand-50", isOpen && "bg-sand-50")} data-testid="scorecard-row">
                      <td className="px-3 py-2"><div className="font-semibold text-ink-900">{tx(c.entity.name)}</div><div className="text-[11px] text-ink-500">{tx(c.entity.role)}</div></td>
                      <td className="px-2 text-end tabular">{c.owned}</td>
                      <td className="px-2 text-end tabular">{c.current}</td>
                      <td className="px-2 text-end tabular">{c.late}</td>
                      <td className="px-2 text-end tabular">{c.stale}</td>
                      <td className="px-2 text-end font-semibold tabular text-crit">{c.missing || ""}</td>
                      <td className="px-2 text-[11.5px] text-ink-700">{c.entity.channel.url ? <a href={c.entity.channel.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="hover:underline">{tx(CHANNEL[c.entity.channel.type])}</a> : tx(CHANNEL[c.entity.channel.type])}</td>
                      <td className="px-2 text-end"><span className={cn("inline-block min-w-[34px] rounded px-1.5 py-0.5 text-center font-semibold tabular text-white", c.score >= 70 ? "bg-ok" : c.score >= 45 ? "bg-warn" : "bg-crit")}>{c.score}</span></td>
                      <td className="px-2"><ChevronDown size={14} className={cn("text-ink-400 transition-transform", isOpen && "rotate-180")} /></td>
                    </tr>,
                    isOpen ? (
                      <tr key={`${c.entity.id}-d`} className="border-b border-line/60 bg-sand-50/60">
                        <td colSpan={9} className="px-3 py-2">
                          <ul className="grid gap-x-4 gap-y-1 md:grid-cols-2">
                            {own.map((i) => <li key={i.id} className="flex items-center justify-between gap-2 text-[12px]"><span className="min-w-0 truncate"><SourcePop i={i}>{tx(i.name)}</SourcePop></span><span className="flex shrink-0 items-center gap-2"><span className="tabular text-ink-700">{i.status === "MISSING" ? "—" : `${fmtValue(i, i.value)} · ${i.period}`}</span><StatusBadge s={i.status} /><FreshDot f={freshness(i).state} /></span></li>)}
                          </ul>
                          {reqs.filter((r) => r.entityId === c.entity.id).length ? <Link href="/data-requests" className="mt-2 inline-block text-[12px] font-medium text-navy-600 hover:underline">{reqs.filter((r) => r.entityId === c.entity.id).map((r) => r.id).join(", ")} → {L("data requests", "طلبات البيانات")}</Link> : null}
                        </td>
                      </tr>
                    ) : null,
                  ];
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="space-y-3">
          <Panel title={L("Indicative readiness", "الجاهزية التأشيرية")}><EChart option={chart} height={Math.max(300, cards.length * 22)} /></Panel>
          <Panel title={L("How the score is built (proposed)", "كيف تُبنى الدرجة (مقترح)")}>
            <ul className="space-y-1.5 text-[12px] leading-relaxed text-ink-700">
              <li><b>50%</b> {L("coverage — share of the entity's indicators with any public figure", "التغطية — نسبة مؤشرات الجهة التي يتوفر لها رقم منشور")}</li>
              <li><b>35%</b> {L("timeliness — current = 1, late = ½, stale = 0", "الحداثة — محدّث = 1، متأخر = ½، قديم = 0")}</li>
              <li><b>15%</b> {L("channel —", "القناة —")} API {CHANNEL_SCORE.API}, {L("files", "ملفات")} {CHANNEL_SCORE.FILES}, PDF {CHANNEL_SCORE.PDF}, {L("none", "لا شيء")} {CHANNEL_SCORE.NONE}</li>
              <li>{L("Proposed delivery windows after period end:", "نوافذ التسليم المقترحة بعد انتهاء الفترة:")} {L("monthly", "شهري")} {PROPOSED_LAG.M}d · {L("quarterly", "ربعي")} {PROPOSED_LAG.Q}d · {L("annual", "سنوي")} {PROPOSED_LAG.A}d</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

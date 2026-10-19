"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { ENTITIES, FREQ_LABEL, GOVS, INDICATORS, PILLAR_LABEL, PILLARS, PROPOSED_LAG, STATUS_LABEL, AS_OF, freshness, fmtValue, type Status } from "@/data/registry";
import { FreshDot, OwnerChip, SourcePop, Spark, StatusBadge } from "./parts";
import { sparkOf } from "./Dashboard";

export function Registry() {
  const { tx, L, t } = useI18n();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const rows = useMemo(() => INDICATORS.filter((i) => (!level || i.level === level) && (!status || i.status === status) && (!owner || i.owner === owner) && (!q || `${i.name.en} ${i.name.ar} ${i.id}`.toLowerCase().includes(q.toLowerCase()))), [q, level, status, owner]);
  const owners = ENTITIES.filter((e) => INDICATORS.some((i) => i.owner === e.id));
  const exportCsv = () => downloadCsv(`national-indicator-registry-${AS_OF}.csv`, INDICATORS.map((i) => ({
    id: i.id, level: i.level, pillar: i.pillar, name_en: i.name.en, name_ar: i.name.ar, unit: i.unit.en, accountable_entity: i.owner, frequency: i.freq, proposed_lag_days: PROPOSED_LAG[i.freq],
    status: i.status, latest_period: i.period ?? "", latest_value: i.value ?? "", freshness: freshness(i).state, source: i.source.name, url: i.source.url ?? "", retrieved: i.source.retrieved ?? "", sha256_prefix: i.source.sha ?? "",
    ...Object.fromEntries(GOVS.map((g) => [`gov_${g}`, i.byGov?.[g] ?? ""])),
  })));
  return (
    <div>
      <PageHeader index={navIndex("/indicators")} title={t("navIndicators")} subtitle={L("The single list of what the Kingdom measures: every indicator with its accountable entity, frequency, proposed delivery window, latest value, status and source. Export it as the annex of a data agreement.", "القائمة الموحدة لما تقيسه المملكة: كل مؤشر مع الجهة المسؤولة والدورية ونافذة التسليم المقترحة وآخر قيمة والحالة والمصدر. صدّرها كملحق لاتفاقية البيانات.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card px-3 py-2">
        <div className="relative min-w-[200px] flex-1"><Search size={13} className="absolute start-2 top-2.5 text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("Search indicators…", "ابحث في المؤشرات…")} className="h-8 w-full rounded-md border border-line-strong bg-card ps-7 pe-2 text-[13px] focus:border-navy-500 focus:outline-none" data-testid="registry-search" /></div>
        <Select value={level} onChange={(e) => setLevel(e.target.value)} aria-label={L("Level", "المستوى")}><option value="">{L("Macro and micro", "الكلي والجزئي")}</option><option value="MACRO">{L("Macro (national)", "كلي (وطني)")}</option><option value="MICRO">{L("Micro (governorate)", "جزئي (محافظة)")}</option></Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={L("Status", "الحالة")}><option value="">{L("All statuses", "كل الحالات")}</option>{(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{tx(STATUS_LABEL[s])}</option>)}</Select>
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label={L("Accountable entity", "الجهة المسؤولة")}><option value="">{L("All entities", "كل الجهات")}</option>{owners.map((e) => <option key={e.id} value={e.id}>{tx(e.short)} — {tx(e.name)}</option>)}</Select>
        <span className="text-[12px] text-ink-500 tabular">{rows.length} / {INDICATORS.length}</span>
      </div>
      <div className="space-y-3">
        {PILLARS.map((p) => {
          const list = rows.filter((i) => i.pillar === p);
          if (!list.length) return null;
          return (
            <Panel key={p} id={p.toLowerCase()} title={tx(PILLAR_LABEL[p])} subtitle={`${list.length} ${L("indicators", "مؤشراً")}`} bodyClass="p-0">
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full min-w-[980px] text-[12px]" data-testid="registry-table">
                  <thead><tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-500"><th className="px-3 py-2 text-start">{L("Indicator", "المؤشر")}</th><th className="px-2 text-start">{L("Level", "المستوى")}</th><th className="px-2 text-end">{L("Latest", "آخر قيمة")}</th><th className="px-2 text-start">{L("Period", "الفترة")}</th><th className="px-2">{L("Trend", "الاتجاه")}</th><th className="px-2 text-start">{L("Accountable", "المسؤول")}</th><th className="px-2 text-start">{L("Frequency", "الدورية")}</th><th className="px-2 text-start">{L("Status", "الحالة")}</th><th className="px-2 text-start">{L("Freshness", "الحداثة")}</th></tr></thead>
                  <tbody>
                    {list.map((i) => (
                      <tr key={i.id} className="border-b border-line/60 align-middle">
                        <td className="px-3 py-1.5"><SourcePop i={i}>{tx(i.name)}</SourcePop><div className="text-[10.5px] text-ink-400">{i.id}</div></td>
                        <td className="px-2 text-ink-700">{i.level === "MACRO" ? L("Macro", "كلي") : L("Micro", "جزئي")}</td>
                        <td className="px-2 text-end"><span className="font-semibold tabular text-ink-900">{fmtValue(i, i.value)}</span> <span className="text-[10.5px] text-ink-500">{tx(i.unit)}</span></td>
                        <td className="px-2 text-ink-700">{i.period ?? "—"}</td>
                        <td className="px-2"><Spark data={sparkOf(i)} w={80} h={20} /></td>
                        <td className="px-2"><OwnerChip id={i.owner} /></td>
                        <td className="px-2 text-ink-700">{tx(FREQ_LABEL[i.freq])}</td>
                        <td className="px-2"><StatusBadge s={i.status} /></td>
                        <td className="px-2"><FreshDot f={freshness(i).state} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          );
        })}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-500">{L(`Freshness compares the latest period with a proposed delivery window after the period ends (monthly ${PROPOSED_LAG.M} days, quarterly ${PROPOSED_LAG.Q}, annual ${PROPOSED_LAG.A}, five-yearly ${PROPOSED_LAG["5Y"]}). Current = within the window; Late = one period behind; Stale = more. International series reflect the compiler's release cycle, not necessarily the national publication.`, `تقارن الحداثة آخر فترة بنافذة تسليم مقترحة بعد انتهاء الفترة (شهري ${PROPOSED_LAG.M} يوماً، ربعي ${PROPOSED_LAG.Q}، سنوي ${PROPOSED_LAG.A}، خمسي ${PROPOSED_LAG["5Y"]}). محدّث = ضمن النافذة؛ متأخر = بفترة واحدة؛ قديم = أكثر. السلاسل الدولية تعكس دورة إصدار الجهة الدولية وليس بالضرورة النشر الوطني.`)}</p>
    </div>
  );
}

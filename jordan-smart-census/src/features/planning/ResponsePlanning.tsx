"use client";

import { useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/form";
import { EChart } from "@/components/charts/echart";
import { barV, VIZ } from "@/components/charts/builders";
import { DEFAULT_RESPONSE, planResponse, type ResponseInputs } from "@/simulation/lab/responsePlan";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { StatRow } from "@/components/charts/common";

/** Non-response & revisit planning panel (Census Planning module). */
export function ResponsePlanning({ households }: { households: number }) {
  const engine = useEngine();
  const { L, ar, locale } = useI18n();
  const [x, setX] = useState<Omit<ResponseInputs, "households">>(DEFAULT_RESPONSE);
  const set = <K extends keyof typeof x>(k: K, v: (typeof x)[K]) => setX((s) => ({ ...s, [k]: v }));
  const plan = useMemo(() => planResponse({ households, ...x }), [households, x]);
  const agg = engine.aggregate();
  const live = useMemo(() => {
    const contacted = agg.completed + agg.refusals;
    const reached = contacted + agg.noContactPending + agg.noContactFinal;
    if (contacted < 2000) return null;
    return { firstContact: Math.min(0.97, contacted / Math.max(1, reached)), refusal: agg.refusals / Math.max(1, contacted) };
  }, [agg]);
  const chart = useMemo(() => barV(plan.byRevisits.map((b) => `${b.k}`), [{ name: L("Final response rate", "معدل الاستجابة النهائي"), data: plan.byRevisits.map((b) => +(b.response * 100).toFixed(1)), color: VIZ[2] }], { rtl: ar, fmt: (v) => `${v}%` }), [plan, ar, L]);
  return (
    <Panel title={L("Non-response & revisit planning", "التخطيط لعدم الاستجابة وزيارات المتابعة")} subtitle={L("How many callbacks are needed, what response rate they buy, and how big the follow-up team must be", "كم زيارة متابعة يلزم، وأي معدل استجابة تحققه، وما حجم فريق المتابعة اللازم")} nature="SIMULATED" sources={["SIM_FRAME", "OPS_FIELDWORK"]} actions={live ? <Button size="xs" onClick={() => setX((s) => ({ ...s, firstContact: +live.firstContact.toFixed(2), refusal: +live.refusal.toFixed(3) }))}><Activity size={12} />{L("Use live fieldwork rates", "استخدم معدلات الميدان الحية")}</Button> : undefined}>
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
        <div className="space-y-3">
          <Slider label={L("First-visit contact rate", "معدل الاتصال في الزيارة الأولى")} value={x.firstContact} min={0.5} max={0.97} step={0.01} onChange={(v) => set("firstContact", v)} format={(v) => fmtPct(v, 0)} />
          <Slider label={L("Success per revisit", "النجاح في كل زيارة متابعة")} value={x.revisitSuccess} min={0.15} max={0.9} step={0.05} onChange={(v) => set("revisitSuccess", v)} format={(v) => fmtPct(v, 0)} />
          <Slider label={L("Maximum revisits", "الحد الأقصى للزيارات")} value={x.maxRevisits} min={0} max={5} step={1} onChange={(v) => set("maxRevisits", v)} />
          <Slider label={L("Refusal rate", "معدل الرفض")} value={x.refusal} min={0} max={0.15} step={0.005} onChange={(v) => set("refusal", v)} format={(v) => fmtPct(v)} />
          <Slider label={L("Refusals converted by supervisors", "حالات الرفض المحوَّلة من المشرفين")} value={x.conversion} min={0} max={0.7} step={0.05} onChange={(v) => set("conversion", v)} format={(v) => fmtPct(v, 0)} />
          <Slider label={L("Follow-up window", "فترة المتابعة")} value={x.windowDays} min={3} max={21} step={1} onChange={(v) => set("windowDays", v)} format={(v) => `${v} ${L("days", "أيام")}`} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-[12px] font-medium text-ink-700">{L("Final response rate by maximum revisits", "معدل الاستجابة النهائي حسب الحد الأقصى للزيارات")}</div>
          <EChart option={chart} height={230} />
        </div>
        <div>
          <StatRow label={L("Final response rate", "معدل الاستجابة النهائي")} value={<b className={plan.finalResponse >= 0.95 ? "text-ok" : plan.finalResponse < 0.9 ? "text-crit" : ""}>{fmtPct(plan.finalResponse)}</b>} />
          <StatRow label={L("Households not enumerated", "أسر لم تُعَدّ")} value={fmtCompact(plan.nonResponse, locale)} />
          <StatRow label={L("Revisits to make", "زيارات متابعة")} value={fmtCompact(plan.revisits, locale)} />
          <StatRow label={L("Refusals converted", "رفض محوَّل")} value={fmtInt(plan.converted)} />
          <StatRow label={L("Follow-up enumerator-days", "أيام عمل المتابعة")} value={fmtInt(plan.enumeratorDays)} sub={`${fmtPct(plan.workloadShare, 0)} ${L("of total workload", "من إجمالي العمل")}`} />
          <StatRow label={L("Dedicated follow-up team", "فريق متابعة مخصص")} value={<b>{fmtInt(plan.team)}</b>} sub={`${L("for", "لمدة")} ${x.windowDays} ${L("days", "أيام")}`} />
          {live ? <p className="mt-2 text-[11.5px] text-ink-500">{L(`Live fieldwork: first-contact ${fmtPct(live.firstContact, 0)}, refusals ${fmtPct(live.refusal)}.`, `الميدان الحي: الاتصال الأول ${fmtPct(live.firstContact, 0)}، الرفض ${fmtPct(live.refusal)}.`)}</p> : null}
        </div>
      </div>
      <p className="mt-2 font-mono text-[11px] text-ink-500" dir="ltr">final contact = 1 − (1 − c₁)(1 − s)^k · response = contact × (1 − r) + refusals × conversion · team = ⌈ revisit minutes ÷ 420 ÷ window ⌉</p>
    </Panel>
  );
}

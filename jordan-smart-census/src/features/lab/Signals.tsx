"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Slider } from "@/components/ui/form";
import { Pill } from "@/components/ui/badges";
import { EChart } from "@/components/charts/echart";
import { base, INK } from "@/components/charts/builders";
import { AXES } from "@/simulation/lab/futures";
import { SECTOR_LABEL } from "@/simulation/lab/actions";
import { DEFAULT_SIGNALS, signalScore, signalUrgency, STEEP_COLOR, STEEP_LABEL, type Signal, type Steep } from "@/simulation/lab/signals";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { cn } from "@/lib/utils";

const STEEPS: Steep[] = ["SOCIAL", "TECH", "ECONOMIC", "ENVIRONMENT", "POLITICAL"];

export function Signals() {
  const { t, tx, L, ar } = useI18n();
  const stored = useApp((s) => s.signals);
  const setSignals = useApp((s) => s.setSignals);
  const setAxes = useApp((s) => s.setFutureAxes);
  const axes = useApp((s) => s.futureAxes);
  const list = stored ?? DEFAULT_SIGNALS;
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", steep: "SOCIAL" as Steep, impact: 3, likelihood: 3, years: 3 });
  const update = (id: string, patch: Partial<Signal>) => setSignals(list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const ranked = useMemo(() => [...list].sort((a, b) => signalUrgency(b) - signalUrgency(a)), [list]);
  const current = list.find((x) => x.id === sel) ?? null;

  const chart = useMemo(() => ({
    ...base(ar),
    grid: { left: 40, right: 16, top: 58, bottom: 36 },
    tooltip: { trigger: "item", formatter: (p: { data: { name: string; value: number[] } }) => `${p.data.name}<br/>${L("Impact", "الأثر")} ${p.data.value[1]} · ${L("Likelihood", "الاحتمال")} ${p.data.value[0]}` },
    xAxis: { type: "value", min: 0.5, max: 5.5, interval: 1, inverse: ar, name: L("Likelihood →", "الاحتمال ←"), nameLocation: "middle", nameGap: 24, axisLabel: { color: INK.muted }, splitLine: { lineStyle: { color: INK.grid } } },
    yAxis: { type: "value", min: 0.5, max: 5.5, interval: 1, name: L("Impact", "الأثر"), nameLocation: "middle", nameGap: 26, position: ar ? "right" : "left", axisLabel: { color: INK.muted }, splitLine: { lineStyle: { color: INK.grid } } },
    series: STEEPS.map((st) => ({
      type: "scatter",
      name: tx(STEEP_LABEL[st]),
      itemStyle: { color: STEEP_COLOR[st], borderColor: "#fffefb", borderWidth: 1.5, opacity: 0.9 },
      symbolSize: (v: number[]) => 10 + 26 / Math.max(1, v[2]),
      data: list.filter((x) => x.steep === st).map((x, i) => ({ name: tx(x.title), value: [x.likelihood + ((i % 3) - 1) * 0.12, x.impact + ((i % 2) - 0.5) * 0.12, x.years] })),
      markArea: st === "SOCIAL" ? { silent: true, itemStyle: { color: "rgba(181,69,58,0.06)" }, data: [[{ xAxis: 3.5, yAxis: 3.5 }, { xAxis: 5.5, yAxis: 5.5 }]] } : undefined,
    })),
    legend: { top: 0, [ar ? "right" : "left"]: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: INK.secondary, fontSize: 11 } },
  }), [list, ar, tx, L]);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const sig: Signal = { id: `U${Date.now().toString(36)}`, steep: draft.steep, title: { en: draft.title.trim(), ar: draft.title.trim() }, description: { en: L("Added in a foresight session.", "أضيف في جلسة استشراف."), ar: "أضيف في جلسة استشراف." }, impact: draft.impact, likelihood: draft.likelihood, years: draft.years, sectors: [], custom: true };
    setSignals([...list, sig]);
    setDraft((d) => ({ ...d, title: "" }));
    setSel(sig.id);
  };
  const exportCsv = () => downloadCsv("horizon-scanning.csv", ranked.map((x, i) => ({ rank: i + 1, steep: x.steep, signal: x.title.en, signal_ar: x.title.ar, description: x.description.en, impact: x.impact, likelihood: x.likelihood, years_to_impact: x.years, score: signalScore(x), urgency: signalUrgency(x).toFixed(1), sectors: x.sectors.join(" "), scenario_axis: x.axis ?? "", source: x.custom ? "workshop" : "default register" })));

  return (
    <div>
      <PageHeader index={navIndex("/signals")} title={t("navSignals")} subtitle={L("A register of emerging signals of change — social, technological, economic, environmental and political — rated by impact, likelihood and time to impact. Rate them in a workshop, add your own, and promote the most important uncertainties to the scenario matrix.", "سجل لإشارات التغير الناشئة — الاجتماعية والتقنية والاقتصادية والبيئية والسياسية — مصنفة حسب الأثر والاحتمال والوقت حتى التأثير. قيّمها في ورشة عمل وأضف إشاراتك وارفع أهم مصادر عدم اليقين إلى مصفوفة السيناريوهات.")}>
        <Button onClick={() => setSignals(null)}><RotateCcw size={13} />{L("Restore defaults", "استعادة الافتراضي")}</Button>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <Callout tone="sim" className="mb-3">{L("Default ratings are illustrative starting points for discussion, not measurements. Your edits are saved in this browser.", "التقييمات الافتراضية نقاط انطلاق توضيحية للنقاش وليست قياسات. تُحفظ تعديلاتك في هذا المتصفح.")}</Callout>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title={L("Impact × likelihood", "الأثر × الاحتمال")} subtitle={L("Bubble size = sooner impact. Shaded corner = act first.", "حجم الفقاعة = تأثير أقرب. الزاوية المظللة = الأولوية.")} nature="SIMULATED"><EChart option={chart as never} height={380} /></Panel>
        <Panel title={current ? tx(current.title) : L("Add a signal", "أضف إشارة")} nature="SIMULATED" actions={current ? <Button size="xs" onClick={() => setSel(null)}><Plus size={12} />{L("New", "جديد")}</Button> : undefined}>
          {current ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5"><Pill><span className="me-1 inline-block h-2 w-2 rounded-full" style={{ background: STEEP_COLOR[current.steep] }} />{tx(STEEP_LABEL[current.steep])}</Pill>{current.sectors.map((s) => <Pill key={s}>{tx(SECTOR_LABEL[s])}</Pill>)}</div>
              <p className="text-[12.5px] text-ink-700">{tx(current.description)}</p>
              <Slider label={L("Impact", "الأثر")} value={current.impact} min={1} max={5} step={1} onChange={(v) => update(current.id, { impact: v })} />
              <Slider label={L("Likelihood", "الاحتمال")} value={current.likelihood} min={1} max={5} step={1} onChange={(v) => update(current.id, { likelihood: v })} />
              <Slider label={L("Years to impact", "سنوات حتى التأثير")} value={current.years} min={1} max={15} step={1} onChange={(v) => update(current.id, { years: v })} />
              {current.axis ? (
                <div className="rounded-md bg-sand-50 px-2.5 py-2 text-[12px]">
                  <div className="text-ink-700">{L("Linked uncertainty", "مصدر عدم اليقين المرتبط")}: <b>{tx(AXES.find((a) => a.id === current.axis)!.name)}</b></div>
                  <Link href="/futures" onClick={() => setAxes([current.axis!, axes[0] === current.axis ? axes[1] : axes[0]])} className="mt-1 inline-block font-medium text-navy-600 hover:underline">{L("Use it as scenario axis A →", "استخدمه محوراً أ للسيناريو ←")}</Link>
                </div>
              ) : null}
              {current.custom ? <Button size="xs" variant="ghost" onClick={() => { setSignals(list.filter((x) => x.id !== current.id)); setSel(null); }}><Trash2 size={12} />{L("Remove", "إزالة")}</Button> : null}
            </div>
          ) : (
            <form onSubmit={add} className="space-y-3">
              <Field label={L("Signal", "الإشارة")}><Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder={L("e.g. Water-saving technology in agriculture", "مثال: تقنيات توفير المياه في الزراعة")} data-testid="signal-title" /></Field>
              <Field label={L("Category", "الفئة")}><Select value={draft.steep} onChange={(e) => setDraft((d) => ({ ...d, steep: e.target.value as Steep }))}>{STEEPS.map((s) => <option key={s} value={s}>{tx(STEEP_LABEL[s])}</option>)}</Select></Field>
              <Slider label={L("Impact", "الأثر")} value={draft.impact} min={1} max={5} step={1} onChange={(v) => setDraft((d) => ({ ...d, impact: v }))} />
              <Slider label={L("Likelihood", "الاحتمال")} value={draft.likelihood} min={1} max={5} step={1} onChange={(v) => setDraft((d) => ({ ...d, likelihood: v }))} />
              <Slider label={L("Years to impact", "سنوات حتى التأثير")} value={draft.years} min={1} max={15} step={1} onChange={(v) => setDraft((d) => ({ ...d, years: v }))} />
              <Button type="submit" variant="primary" data-testid="signal-add"><Plus size={13} />{L("Add to register", "أضف إلى السجل")}</Button>
            </form>
          )}
        </Panel>
      </div>
      <Panel className="mt-3" title={L("Signals ranked by urgency", "الإشارات مرتبة حسب الإلحاح")} subtitle={L("urgency = impact × likelihood × (1 + 3 ÷ years to impact)", "الإلحاح = الأثر × الاحتمال × (1 + 3 ÷ سنوات حتى التأثير)")} nature="SIMULATED">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">#</th><th className="text-start">{L("Signal", "الإشارة")}</th><th className="text-start">{L("Category", "الفئة")}</th><th className="px-2 text-end">{L("Impact", "الأثر")}</th><th className="px-2 text-end">{L("Likelihood", "الاحتمال")}</th><th className="px-2 text-end">{L("Years", "سنوات")}</th><th className="px-2 text-end">{L("Urgency", "الإلحاح")}</th><th className="text-start">{L("Sectors", "القطاعات")}</th></tr></thead>
            <tbody>
              {ranked.map((x, i) => (
                <tr key={x.id} onClick={() => setSel(x.id)} className={cn("cursor-pointer border-b border-line/60 hover:bg-sand-50", sel === x.id && "bg-navy-100/50")} data-testid="signal-row">
                  <td className="py-1.5 text-ink-400 tabular">{i + 1}</td>
                  <td className="pe-2 font-medium text-ink-900">{tx(x.title)}</td>
                  <td><span className="inline-flex items-center gap-1 text-ink-700"><span className="h-2 w-2 rounded-full" style={{ background: STEEP_COLOR[x.steep] }} />{tx(STEEP_LABEL[x.steep])}</span></td>
                  <td className="px-2 text-end tabular">{x.impact}</td>
                  <td className="px-2 text-end tabular">{x.likelihood}</td>
                  <td className="px-2 text-end tabular">{x.years}</td>
                  <td className="px-2 text-end font-semibold tabular">{signalUrgency(x).toFixed(0)}</td>
                  <td className="text-[11.5px] text-ink-500">{x.sectors.map((s) => tx(SECTOR_LABEL[s])).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

"use client";

import { AiAnalyst } from "./AiAnalyst";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, MessageSquareText, Send, X } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ProvenanceButton } from "@/components/ui/provenance";
import { NatureBadge } from "@/components/ui/badges";
import { EChart } from "@/components/charts/echart";
import { barV, line, VIZ } from "@/components/charts/builders";
import { answer, SUGGESTIONS, type Answer } from "@/simulation/lab/ask";
import { navIndex } from "@/lib/nav";
import { fmtCompact } from "@/lib/format";
import { useLab, LabBar, SimpleTable } from "./shared";

function AnswerChart({ a }: { a: Answer }) {
  const { tx, ar, locale } = useI18n();
  const option = useMemo(() => {
    if (!a.chart) return null;
    const series = a.chart.series.map((s, i) => ({ name: tx(s.name), data: s.data, color: VIZ[i] }));
    const fmt = (v: number) => (a.chart!.unit === "%" ? `${v}%` : fmtCompact(v, locale));
    return a.chart.kind === "bar" ? barV(a.chart.categories.map(String), series, { rtl: ar, fmt, rotate: 30 }) : line(a.chart.categories, series.map((s) => ({ ...s, area: true })), { rtl: ar, fmt });
  }, [a, tx, ar, locale]);
  return option ? <EChart option={option} height={220} /> : null;
}

export function Ask() {
  const lab = useLab();
  const { t, tx, L, ar } = useI18n();
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<Answer[]>([]);
  const ask = (text: string) => {
    const s = text.trim();
    if (!s) return;
    const a = answer({ world: lab.world, engine: lab.engine, run: lab.run, areaFor: lab.areaFor, scenarioName: lab.scenarioName }, s);
    setHistory((h) => [a, ...h].slice(0, 12));
    setQ("");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(q);
  };
  return (
    <div>
      <PageHeader index={navIndex("/ask")} title={t("navAsk")} subtitle={L("Ask a planning question in English or Arabic. The question is matched to one of the platform's own models, which computes the answer; every number shows how it was calculated and where it comes from.", "اطرح سؤالاً تخطيطياً بالعربية أو الإنجليزية. يُطابَق السؤال مع أحد نماذج المنصة الذي يحسب الإجابة؛ ويظهر لكل رقم طريقة حسابه ومصدره.")} />
      <LabBar hideYear />
      <Callout className="mb-3">{L("Rule-based query engine: it runs entirely in your browser and does not use a language model. It never invents numbers — if a question cannot be matched to a model, it says so and suggests what it can answer.", "محرك استعلام قائم على القواعد: يعمل بالكامل في متصفحك ولا يستخدم نموذجاً لغوياً. لا يختلق أرقاماً أبداً — إذا تعذرت مطابقة السؤال مع نموذج يوضح ذلك ويقترح ما يمكنه الإجابة عنه.")}</Callout>
      <AiAnalyst />
      <Panel>
        <form onSubmit={submit} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <MessageSquareText size={15} className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("e.g. Which governorates will grow fastest by 2040?", "مثال: أي المحافظات ستنمو أسرع حتى 2040؟")} className="h-10 w-full ps-8 text-[14px]" aria-label={L("Your question", "سؤالك")} data-testid="ask-input" />
          </div>
          <Button type="submit" variant="primary" size="md" data-testid="ask-submit"><Send size={14} />{L("Ask", "اسأل")}</Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s.en} type="button" onClick={() => ask(tx(s))} className="rounded-full border border-line bg-sand-50 px-3 py-1 text-[12px] text-ink-700 hover:border-navy-300 hover:bg-navy-100/50 hover:text-ink-900">{tx(s)}</button>
          ))}
        </div>
      </Panel>
      <div className="mt-3 space-y-3">
        {history.map((a, i) => (
          <Panel key={`${history.length - i}`} title={<span className="text-ink-700">“{a.question}”</span>} nature={a.ok ? (a.sources.some((x) => x.startsWith("OPS")) ? "SYNTHETIC_OPERATIONAL" : "SIMULATED") : undefined} sources={a.sources.length ? a.sources : undefined} actions={<button type="button" onClick={() => setHistory((h) => h.filter((x) => x !== a))} className="rounded p-1 text-ink-400 hover:bg-sand-100 hover:text-ink-900" aria-label={L("Remove", "إزالة")}><X size={14} /></button>}>
            <p className="text-[15px] font-medium leading-relaxed text-ink-900" data-testid="ask-answer">{tx(a.headline)}</p>
            {a.detail ? <p className="mt-1 text-[12.5px] text-ink-500">{tx(a.detail)}</p> : null}
            {a.ok && (a.table || a.chart) ? (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {a.table ? <SimpleTable minWidth={360} head={a.table.head.map((h) => tx(h))} rows={a.table.rows.map((r) => r.map((c) => (typeof c === "string" && c.includes(" / ") ? (ar ? c.split(" / ")[1] : c.split(" / ")[0]) : c)))} /> : <div />}
                {a.chart ? <AnswerChart a={a} /> : null}
              </div>
            ) : null}
            {a.ok ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/70 pt-2.5 text-[11.5px] text-ink-500">
                <span className="font-semibold uppercase tracking-wide">{L("Understood as", "فُهم على أنه")}</span>
                <code className="rounded bg-sand-50 px-1.5 py-0.5 text-ink-700" dir="ltr">{[a.parsed.topic, a.parsed.op, a.parsed.govId, a.parsed.districtId, a.parsed.year].filter(Boolean).join(" · ")}</code>
                {a.formula ? <code className="rounded bg-sand-50 px-1.5 py-0.5 text-ink-700" dir="ltr">{a.formula}</code> : null}
                <NatureBadge nature={a.sources.some((x) => x.startsWith("OPS")) ? "SYNTHETIC_OPERATIONAL" : "SIMULATED"} compact />
                <ProvenanceButton ids={a.sources} />
                {a.link ? <Link href={a.link.href} className="ms-auto inline-flex items-center gap-1 font-medium text-navy-600 hover:underline">{tx(a.link.label)}<ArrowRight size={12} className="rtl:rotate-180" /></Link> : null}
              </div>
            ) : null}
          </Panel>
        ))}
        {history.length === 0 ? <p className="py-6 text-center text-[12.5px] text-ink-500">{L("Ask a question or tap a suggestion.", "اطرح سؤالاً أو اختر اقتراحاً.")}</p> : null}
      </div>
    </div>
  );
}

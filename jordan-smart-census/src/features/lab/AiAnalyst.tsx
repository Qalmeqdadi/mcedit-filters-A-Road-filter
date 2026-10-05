"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Square } from "lucide-react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { isHosted } from "@/lib/hosted";
import { ACTION_SECTORS, SECTOR_LABEL, type NationalPlan, type PlanSnapshot } from "@/simulation/lab/actions";
import type { World } from "@/simulation/generate";
import type { GovId } from "@/types/census";
import { usePlans, useLab } from "./shared";

type SampleFn = ((input: string, opts?: { onText?: (e: { text: string }) => void; signal?: AbortSignal; modelTier?: string }) => Promise<{ text: string; truncated: boolean }>);

const r0 = (v: number) => Math.round(v);
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Compact, factual context from the platform's own model outputs (the only data the AI may use). */
function buildContext(world: World, plans: NationalPlan, s: PlanSnapshot, govId: GovId | null, scenario: string) {
  const gov = (id: GovId) => {
    const p = plans.plans[id];
    return {
      name: world.gov[id].name.en,
      population: { [s.baseYear]: r0(s.sa0.gov[id].pop), [s.year]: r0(s.saH.gov[id].pop) },
      aged65: { [s.baseYear]: r0(s.sa0.gov[id].a65), [s.year]: r0(s.saH.gov[id].a65) },
      outputPerResidentJOD: r0(s.economy.byGov[id].perCapH), outputIndexVsJordan: r2(s.economy.byGov[id].index),
      opportunityIndex: r0(s.equity.index[id]),
      peakMW: { [s.baseYear]: r0(s.energy.byGov[id].peakBase), [s.year]: r0(s.energy.byGov[id].peakH) }, gridCapacityExceededYear: s.energy.byGov[id].capacityYear,
      waterStressYear: s.water.stressYear[id], landYearsOfSupply: r0(Math.min(999, s.land.byGov[id].yearsSupply)),
      fundingCoverage: r2(plans.finance.byGov[id].coverage),
      indicators: p.indicators.map((i) => ({ label: i.label.en, value: r2(i.value), jordan: r2(i.national), unit: i.unit, severity: i.severity })),
      topActions: p.actions.slice(0, 8).map((a) => ({ title: a.title.en, sector: a.sector, severity: a.severity, horizon: a.horizon, costJODm: r2(a.costM), lead: a.lead.en, target: a.kpi.en })),
    };
  };
  return {
    note: "All values are SIMULATED planning-model outputs of the UFUQ prototype (synthetic census on real boundaries; national GDP and electricity calibrated to open data). Not official statistics.",
    scenario, baseYear: s.baseYear, horizon: s.year,
    national: {
      population: { [s.baseYear]: r0(s.sa0.national.pop), [s.year]: r0(s.saH.national.pop) },
      gdpJODbn: r2(s.economy.gdpBase / 1000), theilIndex: r2(s.economy.national.theilH), opportunityIndex: r0(s.equity.nationalIndex),
      waterStressYear: s.water.nationalStressYear, actions: Object.values(plans.plans).reduce((a, p) => a + p.actions.length, 0), totalCostJODm: r0(plans.totalCostM),
      fundingCoverage: r2(plans.finance.national.coverage), themes: plans.themes.map((x) => x.en),
      sdgs: s.equity.sdgs.map((x) => ({ target: x.target, label: x.label.en, value: r2(x.national), goal: x.goal, status: x.status })),
      bySector: Object.fromEntries(ACTION_SECTORS.map((k) => [SECTOR_LABEL[k].en, { actions: plans.bySector[k].actions, costJODm: r0(plans.bySector[k].costM) }])),
      topActions: plans.top.slice(0, 8).map((a) => ({ governorate: world.gov[a.govId].name.en, title: a.title.en, severity: a.severity, costJODm: r2(a.costM) })),
    },
    governorates: Object.fromEntries(world.governorates.map((g) => [g.id, { name: g.name.en, population: r0(s.saH.gov[g.id].pop), opportunityIndex: r0(s.equity.index[g.id]), outputIndex: r2(s.economy.byGov[g.id].index), actions: plans.plans[g.id].actions.length, highOrCritical: plans.plans[g.id].actions.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL").length, fundingCoverage: r2(plans.finance.byGov[g.id].coverage) }])),
    focus: govId ? gov(govId) : null,
  };
}

const PAGES = "Pages: Population Projections, Scenario Futures, Robustness Test, Area Action Plans, Facility Siting, Housing Need, Water Security, Mobility, Climate Risk, Jobs, Ageing, Regional Economy, Land & Terrain, Energy & Utilities, Municipal Finance, Equity & SDGs, Delivery Tracker, Model Validation.";

export function AiAnalyst() {
  const engine = useEngine();
  const { L, ar } = useI18n();
  const govId = useApp((s) => s.govId);
  const { scenarioName } = useLab();
  const { plans, snap } = usePlans();
  const [sample, setSample] = useState<SampleFn | null | undefined>(undefined);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<{ q: string; text: string; done: boolean; error?: string } | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => {
    const c = (window as unknown as { claude?: { use(n: string): Promise<unknown> } }).claude;
    if (!isHosted() || !c?.use) { const h = setTimeout(() => setSample(null), 0); return () => clearTimeout(h); }
    let live = true;
    void c.use("sample").then((s) => { if (live) setSample((s as SampleFn) ?? null); }).catch(() => live && setSample(null));
    return () => { live = false; };
  }, []);
  const ask = async (question: string) => {
    if (!sample || !plans || !snap || !question.trim()) return;
    ctrl.current?.abort();
    const ac = new AbortController();
    ctrl.current = ac;
    setAnswer({ q: question, text: "", done: false });
    const ctx = buildContext(engine.world, plans, snap, govId, scenarioName);
    const prompt = `You are UFUQ's planning analyst for Jordan. Answer the question using ONLY the JSON data below, which comes from the platform's simulation models. Rules: answer in ${ar ? "Arabic" : "English"}; be concise (under 180 words) with concrete numbers; say clearly that figures are simulated planning estimates, not official statistics; if the data does not contain the answer, say so and name the UFUQ page that would help. Never invent figures. End with one line "Pages:" naming the UFUQ pages that show the evidence. ${PAGES}\n\nDATA:\n${JSON.stringify(ctx)}\n\nQUESTION: ${question}`;
    try {
      const res = await sample(prompt, { signal: ac.signal, onText: (e) => setAnswer({ q: question, text: e.text, done: false }) });
      setAnswer({ q: question, text: res.text, done: true });
    } catch (e) {
      const code = (e as { code?: string }).code;
      const msg = code === "not_granted" ? L("The AI analyst was not allowed for this page.", "لم يُسمح بالمحلل الذكي لهذه الصفحة.") : code === "rate_limited" ? L("Too many requests — wait a moment and try again.", "طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة.") : code === "cancelled" ? L("Stopped.", "أُوقف.") : L("The AI analyst could not answer right now.", "تعذر على المحلل الذكي الإجابة الآن.");
      setAnswer((a) => ({ q: question, text: a?.text ?? "", done: true, error: msg }));
    }
  };
  const examples = [L("What are the three biggest risks for Mafraq by 2040, and what should be done first?", "ما أكبر ثلاثة مخاطر في المفرق بحلول 2040، وما الذي يجب فعله أولاً؟"), L("Which governorates are least able to fund their plans?", "أي المحافظات الأقل قدرة على تمويل خططها؟"), L("Summarise Jordan's SDG position in five bullet points.", "لخّص وضع الأردن في أهداف التنمية المستدامة في خمس نقاط.")];
  return (
    <Panel className="mb-3" title={<span className="inline-flex items-center gap-1.5"><Sparkles size={15} className="text-navy-600" />{L("AI analyst", "المحلل الذكي")}</span>} subtitle={L("Generative AI that reads only UFUQ's model outputs for the current scenario and horizon. It explains and summarises — it never changes data. Check important numbers on the pages it cites.", "ذكاء اصطناعي توليدي يقرأ مخرجات نماذج أفق فقط للسيناريو والأفق الحاليين. يشرح ويلخص — ولا يغيّر البيانات أبداً. تحقق من الأرقام المهمة في الصفحات التي يذكرها.")} nature="SIMULATED">
      <div data-testid="ai-analyst">
        {sample === null ? (
          <p className="text-[12.5px] text-ink-500">{L("Available on the hosted UFUQ link (you will be asked once to allow it). In this copy, use the model-based assistant below.", "متاح على رابط أفق المستضاف (سيُطلب منك السماح مرة واحدة). في هذه النسخة استخدم المساعد القائم على النماذج أدناه.")}</p>
        ) : (
          <>
            <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} className="flex flex-wrap gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("Ask anything about Jordan's plans…", "اسأل أي شيء عن خطط الأردن…")} className="h-9 min-w-0 flex-1 rounded-md border border-line-strong bg-card px-3 text-[13px] focus:border-navy-500 focus:outline-none" data-testid="ai-input" />
              <Button type="submit" variant="primary" disabled={!sample || !plans || !q.trim()}><Sparkles size={13} />{L("Ask the AI", "اسأل الذكاء الاصطناعي")}</Button>
              {answer && !answer.done ? <Button type="button" onClick={() => ctrl.current?.abort()}><Square size={12} />{L("Stop", "إيقاف")}</Button> : null}
            </form>
            <div className="mt-2 flex flex-wrap gap-1.5">{examples.map((x) => <button key={x} type="button" onClick={() => { setQ(x); void ask(x); }} disabled={!sample || !plans} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-ink-700 hover:bg-sand-50 disabled:opacity-50">{x}</button>)}</div>
            {answer ? (
              <div className="mt-3 rounded-md bg-sand-50 px-3 py-2.5 text-[13px] leading-relaxed text-ink-900">
                <div className="mb-1 text-[11.5px] font-semibold text-ink-500">“{answer.q}” · {L("AI-generated — verify before use", "مولّد بالذكاء الاصطناعي — تحقق قبل الاستخدام")}</div>
                <div className="whitespace-pre-wrap">{answer.text || (answer.done ? "" : L("Thinking…", "يفكر…"))}</div>
                {answer.error ? <div className="mt-1 text-[12px] text-crit">{answer.error}</div> : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </Panel>
  );
}

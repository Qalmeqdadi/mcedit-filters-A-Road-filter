"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { SeverityBadge } from "@/components/ui/badges";
import { navIndex } from "@/lib/nav";
import { fmtDate, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ACTION_SECTORS, SECTOR_LABEL, sevRank } from "@/simulation/lab/actions";
import type { GovId } from "@/types/census";
import { HEALTH_COLOR, HEALTH_LABEL, STAGES, healthOf, isoDay, kpiProgress, overdue, stageOf, type Health } from "@/delivery/model";
import { useDelivery } from "@/delivery/store";
import { usePlans } from "@/features/lab/shared";
import { fmtInd } from "@/features/lab/ActionPlans";
import { HealthBadge, StageBadge, jod } from "./parts";

function Slide({ kicker, title, children, n, total }: { kicker: string; title: string; children: ReactNode; n: number; total: number }) {
  return (
    <div className="flex h-full flex-col" data-testid="slide">
      <div className="flex items-center justify-between bg-navy-900 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-100">
        <span>UFUQ · {kicker}</span><span className="tabular">{n} / {total}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-6 py-5 sm:px-9 sm:py-7">
        <h2 className="text-balance text-[22px] font-semibold leading-tight text-ink-900 sm:text-[28px]">{title}</h2>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto thin-scroll">{children}</div>
      </div>
    </div>
  );
}

export function Briefing() {
  const engine = useEngine();
  const { t, tx, L, locale, ar } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const { plans, year } = usePlans();
  const { data } = useDelivery();
  const [i, setI] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const scope = govId ? tx(engine.world.gov[govId].name) : L("Jordan", "الأردن");
  const today = new Date();
  const items = Object.values(data.items).filter((x) => !govId || x.govId === govId).map((x) => ({ x, stage: stageOf(x, data.approvals), health: healthOf(x, data.approvals, today), od: overdue(x, today) })).filter((r) => r.stage !== "DROPPED");
  const plan = plans && govId ? plans.plans[govId] : null;
  const top = plans ? (plan ? [...plan.actions].sort((a, b) => b.score - a.score) : plans.top).slice(0, 5) : [];
  const decisions = items.filter((r) => r.stage === "PROPOSED");
  const trouble = items.filter((r) => r.health === "OFF_TRACK" || r.health === "AT_RISK").sort((a, b) => b.od.length - a.od.length);
  const horizon90 = isoDay(new Date(today.getTime() + 90 * 864e5));
  const upcoming = items.flatMap((r) => r.x.milestones.filter((m) => !m.done && m.due <= horizon90).map((m) => ({ r, m }))).sort((a, b) => a.m.due.localeCompare(b.m.due)).slice(0, 8);
  const healthCounts = (["ON_TRACK", "AT_RISK", "OFF_TRACK", "NOT_STARTED", "DONE"] as Health[]).map((h) => ({ h, n: items.filter((r) => r.health === h).length }));
  const approved = items.filter((r) => r.stage !== "PROPOSED");

  const slides: { kicker: string; title: string; body: ReactNode }[] = [
    {
      kicker: L("Briefing", "إحاطة"),
      title: `${scope} — ${L("planning and delivery briefing", "إحاطة التخطيط والتنفيذ")}`,
      body: (
        <div className="flex h-full flex-col justify-between gap-6">
          <div className="space-y-2 text-[15px] text-ink-700">
            <p>{L(`Horizon ${year} · prepared ${fmtDate(today, locale)}`, `الأفق ${year} · أُعدّت في ${fmtDate(today, locale)}`)}</p>
            <p>{L("Contents: the situation, strategy, top priorities, delivery status, decisions needed and the next 90 days.", "المحتويات: الوضع، الاستراتيجية، أهم الأولويات، حالة التنفيذ، القرارات المطلوبة، والأيام التسعون القادمة.")}</p>
          </div>
          <p className="rounded-md border border-warn/40 bg-warn-bg px-3 py-2 text-[12.5px] text-ink-700">{L("Prototype briefing built from simulated census data and rule-based models. UFUQ is not an official government product; figures are not official statistics.", "إحاطة نموذجية مبنية على بيانات تعداد محاكاة ونماذج قائمة على القواعد. أفق ليس منتجاً حكومياً رسمياً؛ والأرقام ليست إحصاءات رسمية.")}</p>
        </div>
      ),
    },
    {
      kicker: L("The situation", "الوضع"),
      title: plan ? L(`Where ${scope} stands against Jordan`, `موقع ${scope} مقارنة بالأردن`) : L("National themes", "المحاور الوطنية"),
      body: !plans ? <p className="text-ink-500">{L("Preparing…", "جارٍ الإعداد…")}</p> : plan ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[...plan.indicators].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).slice(0, 8).map((ind) => (
            <div key={ind.key} className="flex items-center gap-3 rounded-md border border-line px-3 py-2">
              <SeverityBadge s={ind.severity} />
              <div className="min-w-0 flex-1 text-[13px] text-ink-700">{tx(ind.label)}</div>
              <div className="text-end"><div className="text-[16px] font-semibold tabular text-ink-900">{fmtInd(ind, ind.value)}</div><div className="text-[11px] text-ink-500 tabular">{L("Jordan", "الأردن")} {fmtInd(ind, ind.national)}</div></div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2.5 text-[15px] text-ink-700">{plans.themes.map((th, k) => <li key={k} className="flex gap-2.5"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-serious" /><span>{tx(th)}</span></li>)}</ul>
      ),
    },
    {
      kicker: L("Strategy", "الاستراتيجية"),
      title: L("What the plan sets out to do", "ما تسعى إليه الخطة"),
      body: !plans ? null : plan ? (
        <ul className="space-y-2">{ACTION_SECTORS.filter((s) => plan.strategy[s]).sort((a, b) => sevRank(plan.sectorSeverity[b]) - sevRank(plan.sectorSeverity[a])).slice(0, 7).map((s) => <li key={s} className="grid gap-1 text-[13.5px] sm:grid-cols-[140px_minmax(0,1fr)]"><b className="text-ink-900">{tx(SECTOR_LABEL[s])}</b><span className="text-ink-700">{tx(plan.strategy[s]!)}</span></li>)}</ul>
      ) : (
        <table className="w-full text-[13.5px]"><thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{L("Sector", "القطاع")}</th><th className="text-end">{L("Actions", "الإجراءات")}</th><th className="text-end">{L("Critical", "حرجة")}</th><th className="text-end">{L("Indicative cost", "الكلفة التقديرية")}</th></tr></thead>
          <tbody>{ACTION_SECTORS.filter((s) => plans.bySector[s].actions).sort((a, b) => plans.bySector[b].costM - plans.bySector[a].costM).map((s) => <tr key={s} className="border-b border-line/60"><td className="py-1.5">{tx(SECTOR_LABEL[s])}</td><td className="text-end tabular">{plans.bySector[s].actions}</td><td className="text-end tabular">{plans.bySector[s].critical}</td><td className="text-end tabular">{jod(plans.bySector[s].costM, locale)}</td></tr>)}</tbody>
        </table>
      ),
    },
    {
      kicker: L("Priorities", "الأولويات"),
      title: L("Top five corrective actions", "أهم خمسة إجراءات تصحيحية"),
      body: (
        <ol className="space-y-2.5">{top.map((a, k) => (
          <li key={a.id} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[13px] font-semibold text-white">{k + 1}</span>
            <div className="min-w-0"><div className="text-[14.5px] font-semibold text-ink-900">{tx(a.title)}{govId ? "" : ` — ${tx(engine.world.gov[a.govId].name)}`}</div><div className="text-[12.5px] text-ink-500">{tx(a.lead)} · {a.costM > 0 ? jod(a.costM, locale) : L("no capital cost", "دون كلفة رأسمالية")} · {tx(a.kpi)}</div></div>
          </li>
        ))}</ol>
      ),
    },
    {
      kicker: L("Delivery", "التنفيذ"),
      title: L("Delivery status of the approved portfolio", "حالة تنفيذ المحفظة المعتمدة"),
      body: items.length === 0 ? <p className="text-[14px] text-ink-500">{L("No actions are in the delivery portfolio for this scope yet.", "لا توجد إجراءات في محفظة التنفيذ لهذا النطاق بعد.")}</p> : (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            {STAGES.map((s) => { const n = items.filter((r) => r.stage === s).length; return <div key={s} className="flex items-center gap-2"><span className="w-28"><StageBadge s={s} /></span><div className="h-3 flex-1 rounded-sm bg-sand-100"><div className="h-3 rounded-sm bg-navy-600" style={{ width: `${(n / items.length) * 100}%` }} /></div><span className="w-8 text-end font-semibold tabular">{n}</span></div>; })}
            <p className="pt-2 text-[13px] text-ink-700">{L("Approved investment", "الاستثمار المعتمد")}: <b className="tabular">{jod(approved.reduce((s, r) => s + r.x.costM, 0), locale)}</b> · {L("spent", "المنفق")} <b className="tabular">{jod(approved.reduce((s, r) => s + r.x.spentM, 0), locale)}</b></p>
          </div>
          <div className="space-y-2">
            {healthCounts.map(({ h, n }) => <div key={h} className="flex items-center gap-2 text-[13.5px]"><span className="h-3 w-3 rounded-full" style={{ background: HEALTH_COLOR[h] }} /><span className="flex-1">{tx(HEALTH_LABEL[h])}</span><b className="tabular">{n}</b></div>)}
          </div>
        </div>
      ),
    },
    {
      kicker: L("Decisions", "القرارات"),
      title: L("Decisions needed", "القرارات المطلوبة"),
      body: (
        <div className="grid gap-5 md:grid-cols-2">
          <div><h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-500">{L("Awaiting approval", "بانتظار الاعتماد")} · {decisions.length}</h3>
            <ul className="space-y-1.5 text-[13px]">{decisions.slice(0, 6).map((r) => <li key={r.x.id} className="flex justify-between gap-2"><span>{tx(r.x.title)}</span><span className="shrink-0 tabular text-ink-500">{r.x.costM > 0 ? jod(r.x.costM, locale) : "—"}</span></li>)}{decisions.length === 0 ? <li className="text-ink-500">{L("None.", "لا يوجد.")}</li> : null}</ul>
          </div>
          <div><h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-500">{L("Needing intervention", "تتطلب تدخلاً")} · {trouble.length}</h3>
            <ul className="space-y-1.5 text-[13px]">{trouble.slice(0, 6).map((r) => <li key={r.x.id} className="flex items-start justify-between gap-2"><span>{tx(r.x.title)} <span className="text-ink-500">· {Math.round(kpiProgress(r.x) * 100)}%{r.od.length ? ` · ${L(`${r.od.length} overdue`, `${r.od.length} متأخر`)}` : ""}</span></span><HealthBadge h={r.health} /></li>)}{trouble.length === 0 ? <li className="text-ink-500">{L("None — all active actions are on track.", "لا يوجد — جميع الإجراءات النشطة على المسار.")}</li> : null}</ul>
          </div>
        </div>
      ),
    },
    {
      kicker: L("Next 90 days", "التسعون يوماً القادمة"),
      title: L("Milestones due in the next 90 days", "المراحل المستحقة خلال 90 يوماً"),
      body: upcoming.length === 0 ? <p className="text-[14px] text-ink-500">{L("No milestones fall due in the next 90 days.", "لا مراحل مستحقة خلال 90 يوماً.")}</p> : (
        <ul className="space-y-1.5 text-[13.5px]">{upcoming.map(({ r, m }) => <li key={`${r.x.id}-${m.id}`} className="grid gap-1 sm:grid-cols-[110px_minmax(0,1fr)]"><span className={cn("tabular", m.due < isoDay(today) ? "font-semibold text-crit" : "text-ink-500")}>{fmtDate(m.due, locale)}</span><span><b className="text-ink-900">{tx(m.title)}</b> — {tx(r.x.title)}</span></li>)}</ul>
      ),
    },
  ];
  const total = slides.length;
  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(total - 1, x + d))), [total]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,select,textarea")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") go(ar ? -1 : 1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(ar ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, ar]);
  const s = slides[Math.min(i, total - 1)];

  return (
    <div>
      <PageHeader index={navIndex("/briefing")} title={t("navBriefing")} subtitle={L("A ready-to-present briefing for a minister, governor or council, built live from the plans and the delivery portfolio. Use the arrow keys to move between slides.", "إحاطة جاهزة للعرض على وزير أو محافظ أو مجلس، مبنية مباشرة من الخطط ومحفظة التنفيذ. استخدم مفاتيح الأسهم للتنقل بين الشرائح.")}>
        <Select value={govId ?? ""} onChange={(e) => { selectGov((e.target.value || null) as GovId | null); setI(0); }} aria-label={t("governorate")}><option value="">{t("allJordan")}</option>{engine.world.governorates.map((g) => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}</Select>
        <Button onClick={() => { void stage.current?.requestFullscreen?.().catch(() => undefined); }}><Maximize2 size={13} />{L("Full screen", "ملء الشاشة")}</Button>
      </PageHeader>
      <div ref={stage} className="mx-auto flex max-w-[1100px] flex-col bg-paper [&:fullscreen]:max-w-none [&:fullscreen]:justify-center [&:fullscreen]:p-6">
        <div className="aspect-[16/9] max-h-[78vh] w-full max-w-full overflow-hidden rounded-lg border border-line bg-card shadow-sm max-sm:aspect-auto max-sm:min-h-[460px]">
          <Slide kicker={s.kicker} title={s.title} n={i + 1} total={total}>{s.body}</Slide>
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button size="icon" onClick={() => go(-1)} disabled={i === 0} aria-label={L("Previous slide", "الشريحة السابقة")}><ChevronLeft size={16} className="rtl:rotate-180" /></Button>
          <div className="flex gap-1.5">{slides.map((_, k) => <button key={k} type="button" onClick={() => setI(k)} aria-label={`${k + 1}`} className={cn("h-2 rounded-full transition-all", k === i ? "w-6 bg-navy-700" : "w-2 bg-sand-300")} />)}</div>
          <Button size="icon" onClick={() => go(1)} disabled={i === total - 1} aria-label={L("Next slide", "الشريحة التالية")} data-testid="slide-next"><ChevronRight size={16} className="rtl:rotate-180" /></Button>
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-[1100px] text-center text-[11.5px] text-ink-500">{fmtInt(Object.keys(data.items).length)} {L("actions in the delivery portfolio · simulated data", "إجراء في محفظة التنفيذ · بيانات محاكاة")}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ListChecks } from "lucide-react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { Panel } from "@/components/ui/panel";
import { Pill, SeverityBadge } from "@/components/ui/badges";
import { ProvenanceButton } from "@/components/ui/provenance";
import { SECTOR_LABEL, type ActionItem, type ActionSector, type Horizon } from "@/simulation/lab/actions";
import { useEngine } from "@/store/engine";
import { fmt1, fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlans } from "./shared";
import { AddToPortfolio } from "@/features/delivery/parts";

export const HORIZON_LABEL: Record<Horizon, { en: string; ar: string }> = {
  IMMEDIATE: { en: "Immediate · < 1 year", ar: "فوري · أقل من سنة" },
  SHORT: { en: "Short term · 1–3 years", ar: "قصير المدى · 1–3 سنوات" },
  LONG: { en: "Long term · 3–10 years", ar: "طويل المدى · 3–10 سنوات" },
};

export function ActionCard({ a, compact, showGov }: { a: ActionItem; compact?: boolean; showGov?: boolean }) {
  const engine = useEngine();
  const { tx, L, locale } = useI18n();
  const path = usePathname();
  const here = path === a.href;
  return (
    <article className={cn("rounded-lg border border-line bg-card px-3.5 py-3", a.severity === "CRITICAL" && "border-crit/40", a.severity === "HIGH" && "border-serious/30")} data-testid="action-card">
      <div className="flex flex-wrap items-center gap-1.5">
        <SeverityBadge s={a.severity} />
        <Pill>{tx(SECTOR_LABEL[a.sector])}</Pill>
        {showGov ? <Pill>{tx(engine.world.gov[a.govId].name)}</Pill> : null}
        <span className="ms-auto text-[11px] text-ink-500 tabular">{a.costM > 0 ? `≈ JOD ${a.costM >= 100 ? fmtCompact(a.costM * 1e6, locale) : `${fmt1(a.costM)}M`}` : L("no capital cost", "دون كلفة رأسمالية")}</span>
      </div>
      <h4 className="mt-1.5 text-[13.5px] font-semibold leading-snug text-ink-900">{tx(a.title)}</h4>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-700">{tx(a.rationale)}</p>
      {compact ? null : (
        <>
          <ul className="mt-2 space-y-0.5 text-[12.5px] text-ink-700">
            {a.steps.map((s, i) => <li key={i} className="flex gap-1.5"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-navy-600" /><span>{tx(s)}</span></li>)}
          </ul>
          <div className="mt-2 grid gap-x-4 gap-y-0.5 rounded-md bg-sand-50 px-2.5 py-1.5 text-[11.5px] sm:grid-cols-2">
            <div><span className="text-ink-500">{L("Lead", "الجهة القائدة")}: </span><span className="font-medium text-ink-900">{tx(a.lead)}</span></div>
            <div><span className="text-ink-500">{L("People reached", "المستفيدون")}: </span><span className="font-medium text-ink-900 tabular">{fmtCompact(a.beneficiaries, locale)}</span></div>
            <div className="sm:col-span-2"><span className="text-ink-500">{L("Target", "المستهدف")}: </span><span className="font-medium text-ink-900">{tx(a.kpi)}</span></div>
          </div>
        </>
      )}
      <div className="mt-2 flex items-center gap-2 text-[11.5px]">
        <ProvenanceButton ids={["SIM_ACTIONS", ...a.sources]} />
        <AddToPortfolio a={a} />
        {here ? <span className="ms-auto text-ink-400">{L("Model shown on this page", "النموذج معروض في هذه الصفحة")}</span> : <Link href={a.href} className="ms-auto inline-flex items-center gap-1 font-medium text-navy-600 hover:underline">{L("Open the model", "افتح النموذج")}<ArrowRight size={12} className="rtl:rotate-180" /></Link>}
      </div>
    </article>
  );
}

/** "Recommended actions" panel for a Planning Lab module: actions of the given sectors for the selected governorate (or the top national ones). */
export function AreaActions({ sectors, className }: { sectors: ActionSector[]; className?: string }) {
  const { tx, L } = useI18n();
  const govId = useApp((s) => s.govId);
  const engine = useEngine();
  const { plans, loading, year } = usePlans();
  const list = plans ? (govId ? plans.plans[govId].actions : Object.values(plans.plans).flatMap((p) => p.actions).sort((a, b) => b.score - a.score)).filter((a) => sectors.includes(a.sector)).slice(0, govId ? 8 : 6) : [];
  return (
    <Panel className={cn("mt-3", className)} title={<span className="inline-flex items-center gap-1.5"><ListChecks size={15} className="text-navy-600" />{L("Recommended actions", "الإجراءات الموصى بها")} — {govId ? tx(engine.world.gov[govId].name) : L("top priorities across Jordan", "أهم الأولويات على مستوى الأردن")}</span>} subtitle={L(`Corrective actions generated from this model and the others (horizon ${year}). Proposals for the responsible ministry — not automatic decisions.`, `إجراءات تصحيحية مولّدة من هذا النموذج والنماذج الأخرى (الأفق ${year}). مقترحات للجهة المسؤولة — وليست قرارات تلقائية.`)} nature="SIMULATED" actions={<Link href="/action-plans" className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-medium text-navy-600 hover:underline">{L("Full action plan", "خطة العمل الكاملة")}<ArrowRight size={12} className="rtl:rotate-180" /></Link>}>
      {loading ? <p className="py-4 text-[12.5px] text-ink-500">{L("Preparing recommendations from all Planning Lab models…", "جارٍ إعداد التوصيات من جميع نماذج مختبر التخطيط…")}</p> : list.length === 0 ? <p className="py-4 text-[12.5px] text-ink-500">{L("No corrective action needed for this sector under the current scenario.", "لا حاجة لإجراء تصحيحي لهذا القطاع في السيناريو الحالي.")}</p> : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {list.map((a) => <ActionCard key={a.id} a={a} showGov={!govId} />)}
        </div>
      )}
    </Panel>
  );
}

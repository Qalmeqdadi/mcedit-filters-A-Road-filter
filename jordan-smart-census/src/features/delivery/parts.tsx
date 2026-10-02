"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { fmt1 } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/simulation/lab/actions";
import type { Locale } from "@/types/census";
import { HEALTH_COLOR, HEALTH_LABEL, STAGE_LABEL, itemIdFor, stageOf, type AuditEvent, type Health, type PortfolioItem, type Stage } from "@/delivery/model";
import { propose, useDelivery, useDeliveryStore } from "@/delivery/store";

export const jod = (m: number, locale: Locale) => (m >= 1000 ? `JOD ${fmt1(m / 1000)}${locale === "ar" ? " مليار" : "bn"}` : `JOD ${fmt1(m)}M`);

export function HealthBadge({ h, className }: { h: Health; className?: string }) {
  const { tx } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded border border-line bg-card px-1.5 py-0.5 text-[11px] font-medium text-ink-700", className)} data-health={h}>
      <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_COLOR[h] }} />
      {tx(HEALTH_LABEL[h])}
    </span>
  );
}

const STAGE_CLS: Record<Stage, string> = {
  PROPOSED: "border-line-strong bg-sand-50 text-ink-700",
  APPROVED: "border-navy-300 bg-navy-100 text-navy-800",
  IN_DELIVERY: "border-navy-600 bg-navy-600 text-white",
  DONE: "border-ok/40 bg-ok-bg text-ok",
  DROPPED: "border-line bg-sand-100 text-ink-500 line-through",
};

export function StageBadge({ s }: { s: Stage }) {
  const { tx } = useI18n();
  return <span className={cn("inline-flex whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold", STAGE_CLS[s])}>{tx(STAGE_LABEL[s])}</span>;
}

export function DemoBadge() {
  const { L } = useI18n();
  return <span className="rounded border border-nat-simulated/40 bg-warn-bg px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-nat-simulated" title={L("Created by “Load demo portfolio”: progress values are simulated.", "أنشئ عبر «تحميل محفظة تجريبية»: قيم التقدم محاكاة.")}>{L("Demo", "تجريبي")}</span>;
}

/** On an action card: propose the action into the delivery portfolio, or show where it stands. */
export function AddToPortfolio({ a }: { a: ActionItem }) {
  const { L, tx } = useI18n();
  const { data, canPlan } = useDelivery();
  const setFocus = useDeliveryStore((s) => s.setFocus);
  const [busy, setBusy] = useState(false);
  const item = data.items[itemIdFor(a)];
  if (item) {
    return (
      <Link href="/delivery" onClick={() => setFocus(item.id)} className="inline-flex items-center gap-1 rounded border border-ok/40 bg-ok-bg px-1.5 py-0.5 text-[11px] font-medium text-ok hover:underline" data-testid="in-portfolio">
        <Check size={11} />{L("In portfolio", "في المحفظة")} · {tx(STAGE_LABEL[stageOf(item, data.approvals)])}
      </Link>
    );
  }
  if (!canPlan) return null;
  return (
    <Button size="xs" variant="ghost" disabled={busy} className="h-6 px-1.5 text-[11.5px] text-navy-700" onClick={async () => { setBusy(true); await propose(a); setBusy(false); }} data-testid="add-to-portfolio">
      <Plus size={12} />{L("Propose for delivery", "اقترح للتنفيذ")}
    </Button>
  );
}

const EVENT_TEXT: Record<AuditEvent["kind"], { en: string; ar: string }> = {
  PROPOSED: { en: "proposed", ar: "اقترح" },
  APPROVED: { en: "approved", ar: "اعتمد" },
  RETURNED: { en: "returned for revision", ar: "أعاد للمراجعة" },
  STAGE: { en: "changed the stage of", ar: "غيّر مرحلة" },
  OWNER: { en: "set the owner of", ar: "حدد الجهة المسؤولة عن" },
  MILESTONE: { en: "updated a milestone of", ar: "حدّث مرحلة رئيسية في" },
  MILESTONE_ADDED: { en: "added a milestone to", ar: "أضاف مرحلة رئيسية إلى" },
  KPI: { en: "recorded progress on", ar: "سجل تقدماً في" },
  SPEND: { en: "updated spending on", ar: "حدّث الإنفاق على" },
  COMMENT: { en: "commented on", ar: "علّق على" },
  VERSION: { en: "saved the portfolio version", ar: "حفظ نسخة المحفظة" },
  REMOVED: { en: "removed", ar: "أزال" },
  DEMO: { en: "loaded the demo portfolio", ar: "حمّل المحفظة التجريبية" },
};

export function EventLine({ e, items, nameOf }: { e: AuditEvent; items: Record<string, PortfolioItem>; nameOf: (a: AuditEvent["by"]) => string }) {
  const { L, tx, locale } = useI18n();
  const it = e.itemId ? items[e.itemId] : null;
  const when = new Date(e.at).toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <li className="flex gap-2 border-b border-line/60 py-1.5 text-[12.5px] last:border-0" data-testid="event">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy-500" />
      <div className="min-w-0">
        <span className="font-medium text-ink-900">{nameOf(e.by)}</span>{" "}
        <span className="text-ink-700">{L(EVENT_TEXT[e.kind].en, EVENT_TEXT[e.kind].ar)}</span>{" "}
        {it ? <span className="font-medium text-ink-900">“{tx(it.title)}”</span> : e.kind === "VERSION" || e.kind === "REMOVED" ? <span className="font-medium text-ink-900">“{e.detail}”</span> : null}
        {e.detail && (e.kind === "STAGE" || e.kind === "KPI" || e.kind === "OWNER" || e.kind === "SPEND" || e.kind === "RETURNED" || e.kind === "MILESTONE") ? <span className="text-ink-500"> — {e.detail}</span> : null}
        <div className="text-[11px] text-ink-400 tabular">{when}</div>
      </div>
    </li>
  );
}

"use client";

import { useState } from "react";
import { FileText, RotateCcw } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { saveBlob } from "@/lib/hosted";
import { navIndex } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useRequests } from "@/store/requests";
import { AS_OF, entity, indicator, proposedRequests, REQUEST_STAGES, STAGE_LABEL_R, type DataRequest, type RequestStage } from "@/data/registry";
import { ConceptBanner, OwnerChip, SourcePop, StatusBadge } from "./parts";

export function Requests() {
  const { tx, L, t, ar } = useI18n();
  const reqs = proposedRequests();
  const tracks = useRequests((s) => s.tracks);
  const setStage = useRequests((s) => s.setStage);
  const reset = useRequests((s) => s.reset);
  const [busy, setBusy] = useState<string | null>(null);
  const stageOf = (r: DataRequest): RequestStage => tracks[r.id]?.stage ?? "DRAFT";
  const due = new Date(Date.parse(AS_OF) + 30 * 86_400_000).toISOString().slice(0, 10);
  const letter = async (r: DataRequest, inArabic: boolean) => {
    setBusy(`${r.id}${inArabic}`);
    try {
      const { buildRequestLetter } = await import("@/lib/requestLetter");
      await saveBlob(`${r.id}-${r.entityId}-${inArabic ? "ar" : "en"}.docx`, await buildRequestLetter(r, inArabic));
    } finally {
      setBusy(null);
    }
  };
  const exportCsv = () => downloadCsv(`data-requests-${AS_OF}.csv`, reqs.map((r) => ({ id: r.id, entity: entity(r.entityId).name.en, reason: r.reason, priority: r.priority, stage: stageOf(r), indicators: r.indicatorIds.map((i) => indicator(i).name.en).join("; "), proposed_due: due, last_update: tracks[r.id]?.history.at(-1)?.at ?? "" })));
  const byStage = (s: RequestStage) => reqs.filter((r) => stageOf(r) === s).length;
  return (
    <div>
      <PageHeader index={navIndex("/data-requests")} title={t("navRequests")} subtitle={L("Every gap in the dashboard becomes a formal request to the entity accountable for it. Track each request from draft to validated delivery, and download a ready-to-edit request letter in Arabic or English.", "كل فجوة في اللوحة تتحول إلى طلب رسمي إلى الجهة المسؤولة عنها. تابع كل طلب من المسودة حتى التسليم المعتمد، ونزّل كتاب طلب جاهزاً للتحرير بالعربية أو الإنجليزية.")}>
        <Button onClick={exportCsv}>{t("exportCsv")}</Button>
      </PageHeader>
      <ConceptBanner />
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {[...REQUEST_STAGES, "DECLINED" as RequestStage].map((s) => (
          <div key={s} className="rounded-md border border-line bg-card px-3 py-2"><div className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{tx(STAGE_LABEL_R[s])}</div><div className="text-[20px] font-semibold tabular text-ink-900">{byStage(s)}</div></div>
        ))}
      </div>
      <div className="space-y-2.5">
        {reqs.map((r) => {
          const st = stageOf(r);
          const idx = REQUEST_STAGES.indexOf(st);
          const next = idx >= 0 && idx < REQUEST_STAGES.length - 1 ? REQUEST_STAGES[idx + 1] : null;
          const e = entity(r.entityId);
          return (
            <Panel key={r.id} title={<span className="inline-flex flex-wrap items-center gap-2"><span className="font-mono text-[12px] text-sand-500">{r.id}</span>{tx(e.name)}</span>} subtitle={`${r.reason === "MISSING" ? L("Missing series", "سلاسل غير متاحة") : L("Stale series", "سلاسل قديمة")} · ${L("priority", "الأولوية")} ${r.priority === "HIGH" ? L("high", "مرتفعة") : L("medium", "متوسطة")} · ${L("proposed due", "الموعد المقترح")} ${due}`}
              actions={<span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", st === "VALIDATED" ? "bg-ok text-white" : st === "DECLINED" ? "bg-crit text-white" : st === "DRAFT" ? "bg-sand-100 text-ink-700" : "bg-navy-100 text-navy-800")} data-testid="request-stage">{tx(STAGE_LABEL_R[st])}</span>}>
              <div className="flex flex-wrap items-start justify-between gap-3" data-testid="request">
                <ul className="min-w-0 flex-1 space-y-1">
                  {r.indicatorIds.map((id) => { const i = indicator(id); return <li key={id} className="flex flex-wrap items-center gap-2 text-[12.5px]"><StatusBadge s={i.status} /><SourcePop i={i}>{tx(i.name)}</SourcePop><span className="text-[11px] text-ink-500">{i.level === "MICRO" ? L("by governorate", "حسب المحافظة") : L("national", "وطني")} · {i.period ?? L("none found", "لا يوجد")}</span></li>; })}
                </ul>
                <div className="flex flex-wrap items-center gap-1.5">
                  <OwnerChip id={r.entityId} />
                  <Button size="xs" onClick={() => letter(r, true)} disabled={!!busy} data-testid="letter-ar"><FileText size={12} />{busy === `${r.id}true` ? "…" : L("Letter (Arabic)", "الكتاب (عربي)")}</Button>
                  <Button size="xs" onClick={() => letter(r, false)} disabled={!!busy} data-testid="letter-en"><FileText size={12} />{busy === `${r.id}false` ? "…" : L("Letter (English)", "الكتاب (إنجليزي)")}</Button>
                  {next ? <Button size="xs" variant="primary" onClick={() => setStage(r.id, next)} data-testid="request-advance">{L("Mark", "تحديد")}: {tx(STAGE_LABEL_R[next])}</Button> : null}
                  {st !== "DECLINED" && st !== "VALIDATED" ? <Button size="xs" variant="ghost" onClick={() => setStage(r.id, "DECLINED")}>{tx(STAGE_LABEL_R.DECLINED)}</Button> : null}
                  {tracks[r.id] ? <Button size="xs" variant="ghost" onClick={() => reset(r.id)} aria-label={L("Reset", "إعادة")}><RotateCcw size={12} /></Button> : null}
                </div>
              </div>
              {tracks[r.id]?.history.length ? <div className="mt-2 text-[11px] text-ink-500">{tracks[r.id].history.map((h) => `${tx(STAGE_LABEL_R[h.stage])} ${new Date(h.at).toLocaleDateString(ar ? "ar-JO-u-nu-latn" : "en-GB")}`).join(" → ")}</div> : null}
            </Panel>
          );
        })}
      </div>
      <Callout className="mt-3">{L("Workflow: Draft → Sent (letter issued by the owner's office) → Acknowledged (focal point named) → Data delivered (through the Government data exchange) → Validated by the Department of Statistics, after which the figure appears on the dashboard as Official. Progress is kept in this browser.", "سير العمل: مسودة ← أُرسل (يصدر الكتاب من مكتب الجهة المالكة) ← تم الاستلام (تسمية ضابط الارتباط) ← سُلّمت البيانات (عبر منصة تبادل البيانات الحكومية) ← اعتمدتها دائرة الإحصاءات العامة، وبعدها يظهر الرقم على اللوحة بصفة رسمي. يُحفظ التقدم في هذا المتصفح.")}</Callout>
    </div>
  );
}

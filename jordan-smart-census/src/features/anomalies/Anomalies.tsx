"use client";

import { Brain, CheckCircle2, ShieldAlert, UserCheck, ArrowUpCircle, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { SeverityBadge, Pill, NatureBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/dialog";
import { EChart } from "@/components/charts/echart";
import { base, INK } from "@/components/charts/builders";
import { medianFromHist } from "@/simulation/anomalies";
import { downloadCsv } from "@/lib/csv";
import { fmtDateTime, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnomalyDecision, AnomalyKind, Severity } from "@/types/census";
import { LABELS } from "@/lib/i18n/labels";

const SEVS: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export function Anomalies() {
  const engine = useEngine();
  const { t, tx, L, lb, ar, locale } = useI18n();
  const { govId } = useScope();
  const actor = useApp((s) => s.actor);
  const bump = useApp((s) => s.bump);
  const focus = useApp((s) => s.focusAnomalyId);
  const [kind, setKind] = useState("ALL");
  const [sev, setSev] = useState("ALL");
  const [status, setStatus] = useState("OPEN");
  const [sel, setSel] = useState<string | null>(null);
  const [decision, setDecision] = useState<AnomalyDecision | null>(null);
  const [note, setNote] = useState("");
  const v = engine.version;

  const list = useMemo(() => engine.anomalies.filter((a) => (!govId || a.govId === govId) && (kind === "ALL" || a.kind === kind) && (sev === "ALL" || a.severity === sev) && (status === "ALL" || a.status === status)).sort((a, b) => SEVS.indexOf(a.severity) - SEVS.indexOf(b.severity) || b.score - a.score), [engine, v, govId, kind, sev, status, engine.anomalies.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedId = sel ?? focus;
  const a = (selectedId && engine.anomalies.find((x) => x.id === selectedId)) || list[0] || null;
  const scoped = engine.anomalies.filter((x) => !govId || x.govId === govId);

  const scatter = useMemo(() => {
    const normal: [number, number, string][] = [];
    const flagged: [number, number, string][] = [];
    const flaggedIds = new Set(engine.anomalies.filter((x) => x.subjectType === "ENUMERATOR").map((x) => x.subjectId));
    engine.world.enumerators.forEach((e, i) => {
      if (govId && e.govId !== govId) return;
      const s = engine.en[i];
      const ad = engine.activeDays[i];
      if (s.completed < 10 || !ad) return;
      const pt: [number, number, string] = [+(s.completed / ad).toFixed(2), +medianFromHist(s.durHist).toFixed(1), e.id];
      (flaggedIds.has(e.id) ? flagged : normal).push(pt);
    });
    const thinned = normal.filter((_, k) => k % Math.max(1, Math.floor(normal.length / 2500)) === 0);
    return {
      ...base(ar),
      grid: { left: 8, right: 16, top: 52, bottom: 26, containLabel: true },
      legend: { top: 0, [ar ? "left" : "right"]: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: INK.secondary, fontSize: 11 } },
      tooltip: { trigger: "item", backgroundColor: "#fffefb", borderColor: "#e3ddd0", textStyle: { color: INK.primary, fontSize: 12 }, formatter: (p: { value: [number, number, string] }) => `<b>${p.value[2]}</b><br/>${L("Interviews/day", "مقابلات/يوم")}: ${p.value[0]}<br/>${L("Median minutes", "الوسيط بالدقائق")}: ${p.value[1]}` },
      xAxis: { type: "value", name: L("Interviews per active day", "المقابلات لكل يوم عمل"), nameLocation: "middle", nameGap: 24, nameTextStyle: { color: INK.secondary, fontSize: 11 }, inverse: ar, splitLine: { lineStyle: { color: INK.grid } }, axisLabel: { color: INK.muted, fontSize: 10.5 } },
      yAxis: { type: "value", name: L("Median interview (min)", "وسيط المقابلة (دقيقة)"), nameTextStyle: { color: INK.secondary, fontSize: 11, align: ar ? "right" : "left" }, position: ar ? "right" : "left", splitLine: { lineStyle: { color: INK.grid } }, axisLabel: { color: INK.muted, fontSize: 10.5 } },
      series: [
        { type: "scatter", name: L("Enumerators", "العدّادون"), data: thinned, symbolSize: 5, itemStyle: { color: "#9db4d6", opacity: 0.55 } },
        { type: "scatter", name: L("Flagged by engine", "رصدها المحرك"), data: flagged, symbolSize: 9, itemStyle: { color: "#b5453a", borderColor: "#fffefb", borderWidth: 1.5 }, markLine: { silent: true, symbol: "none", lineStyle: { color: INK.secondary, type: "dashed" }, label: { color: INK.secondary, fontSize: 10, formatter: "{b}" }, data: [{ name: L("8 min threshold", "عتبة 8 دقائق"), yAxis: 8 }, { name: L("2× plan", "ضعف الخطة"), xAxis: engine.config.interviewsPerDay * 2 }] } },
      ],
    };
  }, [engine, v, govId, ar, L]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = () => {
    if (!a || !decision) return;
    if (decision === "DISMISSED" && note.trim().length < 5) return;
    engine.anomalyDecision(a.id, decision, actor, note || "—");
    setDecision(null);
    setNote("");
    bump();
  };

  return (
    <div>
      <PageHeader index="09" title={t("nav09")} subtitle={L("Explainable, rule-based and statistical detection: z-scores against district peers, IQR fences, heaping and pattern tests. No LLM or external AI service is used. The engine never alters census responses — every finding waits for a human decision.", "كشف قابل للتفسير قائم على القواعد والإحصاء: درجات معيارية مقارنة بأقران اللواء، وحدود المدى الربيعي، واختبارات التكدّس والأنماط. لا يُستخدم نموذج لغوي أو خدمة ذكاء اصطناعي خارجية. لا يغيّر المحرك إجابات التعداد — كل نتيجة تنتظر قراراً بشرياً.")}>
        <Button onClick={() => downloadCsv("anomalies.csv", scoped.map((x) => ({ id: x.id, kind: x.kind, severity: x.severity, subject_type: x.subjectType, subject: x.subjectId, governorate: x.govId, method: x.method, score: x.score, detected: engine.timeOf(x.step).toISOString(), what: x.what.en, why: x.why.en, recommendation: x.recommendation.en, affected_records: x.affectedRecords.join(" "), status: x.status, decision: x.decision?.action ?? "", decided_by: x.decision?.by ?? "", decision_note: x.decision?.note ?? "" })))}>{t("exportCsv")} ({fmtInt(scoped.length)})</Button>
      </PageHeader>
      <Callout tone="sim" className="mb-3 flex items-center gap-2"><Brain size={15} /><b>{L("AI-assisted anomaly simulation.", "محاكاة كشف الشذوذ بمساعدة الذكاء الاصطناعي.")}</b> {L("Detection is statistical and rule-based on synthetic operational data. Human authority remains final.", "الكشف إحصائي وقائم على القواعد ويعمل على بيانات تشغيلية اصطناعية. تبقى السلطة النهائية للإنسان.")}</Callout>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-6">
        <Kpi label={L("Anomalies detected", "حالات الشذوذ المرصودة")} value={fmtInt(scoped.length)} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_ANOMALY"]} />
        <Kpi label={L("Awaiting decision", "بانتظار القرار")} value={fmtInt(scoped.filter((x) => x.status === "OPEN").length)} tone={scoped.some((x) => x.status === "OPEN" && x.severity === "CRITICAL") ? "crit" : undefined} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={t("sevCRITICAL")} value={fmtInt(scoped.filter((x) => x.severity === "CRITICAL").length)} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Confirmed → revisits", "مؤكدة ← زيارات")} value={fmtInt(scoped.filter((x) => x.decision?.action === "CONFIRMED_REVISIT").length)} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Dismissed", "مستبعدة")} value={fmtInt(scoped.filter((x) => x.decision?.action === "DISMISSED").length)} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Escalated", "مُصعّدة")} value={fmtInt(scoped.filter((x) => x.decision?.action === "ESCALATED").length)} nature="SYNTHETIC_OPERATIONAL" />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[400px_minmax(0,1fr)]">
        <Panel title={L("Findings", "النتائج")} nature="SYNTHETIC_OPERATIONAL" bodyClass="p-0">
          <div className="flex flex-wrap gap-1.5 border-b border-line/70 px-3 py-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("status")}><option value="OPEN">{L("Awaiting decision", "بانتظار القرار")}</option><option value="DECIDED">{L("Decided", "تم البت")}</option><option value="ALL">{t("all")}</option></Select>
            <Select value={sev} onChange={(e) => setSev(e.target.value)} aria-label={t("severity")}><option value="ALL">{t("severity")}</option>{SEVS.map((s) => <option key={s} value={s}>{t(`sev${s}`)}</option>)}</Select>
            <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label={L("Type", "النوع")} className="max-w-[150px]"><option value="ALL">{L("Type", "النوع")}</option>{Object.keys(LABELS.anomalyKind).map((k) => <option key={k} value={k}>{lb("anomalyKind", k)}</option>)}</Select>
          </div>
          <ul className="thin-scroll max-h-[640px] divide-y divide-line/70 overflow-y-auto">
            {list.length === 0 ? <li className="px-3 py-10 text-center text-[12.5px] text-ink-500">{engine.phase === "READY" ? L("Start the census simulation — anomalies appear from day 2.", "ابدأ محاكاة التعداد — تظهر حالات الشذوذ من اليوم الثاني.") : t("noData")}</li> : null}
            {list.slice(0, 200).map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => setSel(x.id)} className={cn("w-full px-3 py-2.5 text-start hover:bg-sand-50", a?.id === x.id && "bg-navy-100/50")}>
                  <div className="flex items-center gap-2"><SeverityBadge s={x.severity} /><span className="text-[12px] font-semibold text-ink-900">{lb("anomalyKind", x.kind)}</span><span className="ms-auto font-mono text-[10.5px] text-ink-400">{x.subjectId}</span></div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-ink-700">{tx(x.what)}</p>
                  {x.decision ? <div className="mt-1 text-[11px] font-medium text-ok">✓ {lb("decision", x.decision.action)} · {x.decision.by}</div> : null}
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="min-w-0 space-y-3">
          {a ? (
            <Panel title={<span className="flex items-center gap-2"><span className="font-mono">{a.id}</span>{lb("anomalyKind", a.kind as AnomalyKind)}</span>} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_ANOMALY"]} actions={<SeverityBadge s={a.severity} />}>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <Section title={L("What happened", "ما الذي حدث")}><p className="text-[13.5px] font-medium leading-relaxed text-ink-900">{tx(a.what)}</p></Section>
                  <Section title={L("Why it was flagged", "لماذا رُصد")}><p className="text-[12.5px] leading-relaxed text-ink-700">{tx(a.why)}</p><div className="mt-1.5 flex flex-wrap gap-1.5"><Pill>{L("Method", "الأسلوب")}: {lb("anomalyMethod", a.method)}</Pill><Pill>{L("Score", "الدرجة")}: {a.score.toFixed(2)}</Pill><Pill>{fmtDateTime(engine.timeOf(a.step), locale)}</Pill></div></Section>
                  <Section title={L("Recommended action", "الإجراء الموصى به")}><p className="text-[12.5px] leading-relaxed text-ink-700">{tx(a.recommendation)}</p></Section>
                </div>
                <div className="space-y-3">
                  <Section title={L("Evidence", "الأدلة")}>
                    <table className="w-full text-[12.5px]"><tbody>{a.evidence.map((ev, i) => <tr key={i} className="border-b border-line/60 last:border-0"><td className="py-1.5 text-ink-500">{tx(ev.label)}</td><td className="text-end font-semibold text-ink-900 tabular">{ev.value}</td></tr>)}</tbody></table>
                  </Section>
                  <Section title={L("Affected records", "السجلات المتأثرة")}>
                    <div className="flex flex-wrap gap-1">{a.affectedRecords.slice(0, 16).map((r) => <span key={r} className="rounded border border-line bg-sand-50 px-1.5 py-0.5 font-mono text-[11px]">{r}</span>)}{a.affectedRecords.length > 16 ? <span className="text-[11px] text-ink-500">+{a.affectedRecords.length - 16}</span> : null}</div>
                    <div className="mt-1 text-[11.5px] text-ink-500">{tx(engine.world.gov[a.govId].name)} · {a.subjectType}</div>
                  </Section>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-line bg-sand-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-ink-900"><ShieldAlert size={14} className="text-navy-700" />{L("Human decision", "القرار البشري")} <span className="font-normal text-ink-500">— {L("acting as", "بصفة")} {actor}</span></div>
                {a.decision ? (
                  <div className="text-[12.5px] text-ink-700"><CheckCircle2 size={14} className="me-1 inline text-ok" /><b>{lb("decision", a.decision.action)}</b> · {a.decision.by} · {fmtDateTime(engine.timeOf(a.decision.step), locale)}<div className="mt-1 text-ink-500">“{a.decision.note}”</div></div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="primary" onClick={() => { setSel(a.id); setDecision("CONFIRMED_REVISIT"); }}><CheckCircle2 size={13} />{L("Confirm — schedule verification revisits", "تأكيد — جدولة زيارات تحقق")}</Button>
                    <Button size="sm" onClick={() => { setSel(a.id); setDecision("ASSIGNED_SUPERVISOR"); }}><UserCheck size={13} />{L("Assign to supervisor", "إسناد للمشرف")}</Button>
                    <Button size="sm" onClick={() => { setSel(a.id); setDecision("ESCALATED"); }}><ArrowUpCircle size={13} />{L("Escalate", "تصعيد")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setSel(a.id); setDecision("DISMISSED"); }}><XCircle size={13} />{L("Dismiss", "استبعاد")}</Button>
                  </div>
                )}
                <p className="mt-2 text-[11.5px] text-ink-500">{L("The engine never edits responses. Confirming schedules field verification; corrections only come from re-interviews.", "لا يعدّل المحرك الإجابات أبداً. يؤدي التأكيد إلى جدولة تحقق ميداني؛ ولا تأتي التصحيحات إلا من إعادة المقابلة.")}</p>
              </div>
            </Panel>
          ) : <Panel><p className="py-12 text-center text-[12.5px] text-ink-500">{L("No anomaly selected.", "لم يتم اختيار حالة شذوذ.")}</p></Panel>}

          <Panel title={L("Productivity vs interview duration — all enumerators", "الإنتاجية مقابل مدة المقابلة — جميع العدّادين")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_ANOMALY", "OPS_ENUMERATORS"]} subtitle={L("Flagged enumerators sit far right (fast) and/or low (short interviews), away from the dense peer cloud.", "يقع العدّادون المرصودون أقصى اليمين (سرعة) و/أو في الأسفل (مقابلات قصيرة) بعيداً عن سحابة الأقران.")}>
            <EChart option={scatter} height={320} />
          </Panel>
        </div>
      </div>

      <Modal open={!!decision} onOpenChange={(o) => !o && setDecision(null)} title={decision ? lb("decision", decision) : ""} description={a ? `${a.id} · ${a.subjectId}` : undefined} footer={<><Button onClick={() => setDecision(null)}>{t("cancel")}</Button><Button variant="primary" onClick={decide} disabled={decision === "DISMISSED" && note.trim().length < 5}>{t("confirm")}</Button></>}>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-ink-500"><NatureBadge nature="SYNTHETIC_OPERATIONAL" />{L("Decision recorded against", "يُسجل القرار باسم")} {actor}</div>
          <Field label={decision === "DISMISSED" ? L("Reason for dismissal (required)", "سبب الاستبعاد (مطلوب)") : L("Decision note", "ملاحظة القرار")}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} autoFocus placeholder={decision === "DISMISSED" ? L("e.g. Productivity explained by dense apartment blocks", "مثال: الإنتاجية مبررة بكثافة العمارات السكنية") : ""} />
          </Field>
          {decision === "CONFIRMED_REVISIT" ? <Callout>{L("Verification revisits for ~10% of the subject's completed households will be added to the field schedule and the enumerator placed under review.", "ستُضاف زيارات تحقق لنحو 10% من الأسر المكتملة إلى الجدول الميداني ويوضع العدّاد قيد المراجعة.")}</Callout> : null}
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">{title}</div>
      {children}
    </div>
  );
}

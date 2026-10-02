"use client";

import { useMemo, useState } from "react";
import { LifeBuoy, UserPlus } from "lucide-react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented } from "@/components/ui/form";
import { Modal } from "@/components/ui/dialog";
import { EChart } from "@/components/charts/echart";
import { barH } from "@/components/charts/builders";
import { JordanMap, type EAPoint } from "@/features/gis/JordanMap";
import { useEngine } from "@/store/engine";
import { backtest, predictLateness, type Prediction, type RiskBand } from "@/simulation/lab/earlyWarning";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Formula, Method, SimpleTable } from "./shared";

const BAND_COLOR: Record<RiskBand, string> = { HIGH: "#b5453a", MEDIUM: "#d4a017", LOW: "#1f8a3b" };

export function EarlyWarning() {
  const engine = useEngine();
  const { t, tx, L, ar } = useI18n();
  const actor = useApp((s) => s.actor);
  const bump = useApp((s) => s.bump);
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const [band, setBand] = useState<RiskBand | "ALL">("HIGH");
  const [pending, setPending] = useState<{ p: Prediction; kind: "RESERVE" | "HELPER" } | null>(null);
  const [note, setNote] = useState("");
  const v = engine.version;
  const ew = useMemo(() => predictLateness(engine), [engine, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const finished = engine.day > engine.config.fieldDays;
  const backtests = useMemo(() => (finished ? [3, 5, 7, 10].map((d) => backtest(engine, d)).filter((x) => x !== null) : []), [engine, finished, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const started = engine.phase !== "READY" && engine.day >= 2;
  const rows = ew.predictions.filter((p) => (band === "ALL" || p.band === band) && (!govId || p.govId === govId));
  const byIdx = useMemo(() => new Map(ew.predictions.map((p) => [p.index, p])), [ew]);
  const points = useMemo<EAPoint[]>(() => {
    const out: EAPoint[] = [];
    engine.world.enumerators.forEach((e, i) => {
      const p = byIdx.get(i);
      for (const k of engine.enumEas[i]) {
        const a = engine.world.eas[k];
        if (govId && a.govId !== govId) continue;
        out.push({ id: a.id, lng: a.lng, lat: a.lat, color: p ? BAND_COLOR[p.band] : "#9aa3b2", govId: a.govId, districtId: a.districtId, label: p ? `${e.id} · P(late) ${Math.round(p.pLate * 100)}%` : `${e.id} · ${L("finished / not started", "منتهٍ / لم يبدأ")}` });
      }
    });
    return out;
  }, [engine, byIdx, govId, L]);
  const govCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of ew.predictions) if (p.band === "HIGH") c[p.govId] = (c[p.govId] ?? 0) + 1;
    return c;
  }, [ew]);
  const govChart = useMemo(() => barH(engine.world.governorates.map((g) => tx(g.name)), [{ name: L("High-risk workloads", "أعباء عالية الخطر"), data: engine.world.governorates.map((g) => govCounts[g.id] ?? 0), color: BAND_COLOR.HIGH }], { rtl: ar, showLabels: true }), [engine, govCounts, tx, ar, L]);
  const confirm = () => {
    if (!pending) return;
    const ok = engine.assignSupport(pending.p.id, pending.kind, actor, note || L("Approved from Predictive Field Control", "اعتُمد من التحكم الميداني التنبؤي"), pending.kind === "HELPER" ? pending.p.helper?.id : undefined);
    if (ok) bump();
    setPending(null);
    setNote("");
  };
  const exportCsv = () => downloadCsv(`field-early-warning-day${ew.day}.csv`, ew.predictions.map((p) => ({ enumerator: p.id, governorate: engine.world.gov[p.govId as keyof typeof engine.world.gov].name.en, district: engine.world.district[p.districtId].name.en, p_late: p.pLate.toFixed(3), band: p.band, remaining_dwellings: p.remaining, pace_per_day: p.pace.toFixed(2), required_per_day: p.required.toFixed(2), predicted_finish_day: Number.isFinite(p.predictedFinishDay) ? (p.predictedFinishDay + 1).toFixed(1) : "", drivers: p.drivers.map((d) => d.key).join(" "), supported: p.supported, nearest_helper: p.helper?.id ?? "", as_of_day: ew.day + 1, data_nature: "SYNTHETIC_OPERATIONAL" })));

  return (
    <div>
      <PageHeader index={navIndex("/early-warning")} title={t("navEarly")} subtitle={L("Which enumerator workloads will miss the fieldwork deadline? A transparent pace model predicts the probability of finishing late from day 2, explains the drivers, and proposes reserve or helper support — which a supervisor approves.", "أي أعباء العدّادين ستتجاوز موعد انتهاء العمل الميداني؟ يتنبأ نموذج وتيرة شفاف باحتمال التأخر بدءاً من اليوم الثاني ويشرح العوامل ويقترح دعماً احتياطياً أو مسانداً — يعتمده المشرف.")}>
        <Button onClick={exportCsv} disabled={!started}>{t("exportCsv")}</Button>
      </PageHeader>
      {!started ? (
        <Callout className="mb-3">{L("Predictions start once fieldwork has run for two census days. Press “Start census” in the top bar (or run the Executive demo).", "تبدأ التنبؤات بعد يومين من العمل الميداني. اضغط «بدء التعداد» في الشريط العلوي (أو شغّل العرض التنفيذي).")}</Callout>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={L("As of census day", "حتى يوم التعداد")} value={String(Math.min(engine.day, engine.lastDay))} sub={`${L("of", "من")} ${engine.config.fieldDays} ${L("planned", "مخطط")}`} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_EARLY_WARNING", "OPS_FIELDWORK"]} />
        <Kpi label={L("High risk of finishing late", "خطر تأخر مرتفع")} value={fmtInt(ew.counts.HIGH)} sub={L("P(late) ≥ 60%", "احتمال التأخر ≥ 60%")} tone={ew.counts.HIGH ? "crit" : "ok"} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Medium risk", "خطر متوسط")} value={fmtInt(ew.counts.MEDIUM)} sub="30–60%" tone={ew.counts.MEDIUM ? "warn" : undefined} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("On track", "على المسار")} value={fmtInt(ew.counts.LOW)} sub={L("with work left", "مع عمل متبقٍ")} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Dwellings at risk", "مساكن معرضة")} value={fmtInt(ew.dwellingsAtRisk)} sub={L("beyond planned pace", "أبعد من الوتيرة المخططة")} nature="SYNTHETIC_OPERATIONAL" />
        <Kpi label={L("Reserve enumerators left", "عدّادون احتياطيون متبقون")} value={fmtInt(ew.reservesLeft)} sub={`${L("of", "من")} ${engine.reservePool}`} nature="SYNTHETIC_OPERATIONAL" />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <JordanMap height={460} title={L("Predicted lateness by workload", "التأخر المتوقع حسب عبء العمل")} eaPoints={points} eaLegend={[{ color: BAND_COLOR.HIGH, label: L("High", "مرتفع") }, { color: BAND_COLOR.MEDIUM, label: L("Medium", "متوسط") }, { color: BAND_COLOR.LOW, label: L("On track", "على المسار") }, { color: "#9aa3b2", label: L("Finished / not started", "منتهٍ / لم يبدأ") }]} selectedGov={govId} onSelectGov={selectGov} districtMode="drill" sources={["OPS_EARLY_WARNING"]} showLabelsDefault={false} />
        <Panel title={L("High-risk workloads by governorate", "الأعباء عالية الخطر حسب المحافظة")} nature="SYNTHETIC_OPERATIONAL"><EChart option={govChart} height={400} /></Panel>
      </div>
      <Panel className="mt-3" title={L("Workloads to act on", "أعباء تستدعي التدخل")} subtitle={L("Sorted by probability of finishing after the planned field days", "مرتبة حسب احتمال الانتهاء بعد الأيام الميدانية المخططة")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_EARLY_WARNING"]} actions={<Segmented size="xs" value={band} onChange={setBand} options={[{ value: "HIGH", label: L("High", "مرتفع") }, { value: "MEDIUM", label: L("Medium", "متوسط") }, { value: "ALL", label: t("all") }]} />}>
        {rows.length === 0 ? <p className="py-6 text-center text-[12.5px] text-ink-500">{started ? L("No workloads in this band.", "لا توجد أعباء في هذه الفئة.") : L("No predictions yet.", "لا توجد تنبؤات بعد.")}</p> : (
          <div className="thin-scroll max-h-[520px] overflow-auto">
            <table className="w-full min-w-[900px] text-[12.5px]">
              <thead className="sticky top-0 bg-card"><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{L("Enumerator", "العدّاد")}</th><th className="text-start">{t("district")}</th><th className="px-2 text-end">P(late)</th><th className="px-2 text-end">{L("Left", "متبقٍ")}</th><th className="px-2 text-end">{L("Pace / needed", "الوتيرة / المطلوب")}</th><th className="px-2 text-end">{L("Finish day", "يوم الانتهاء")}</th><th className="px-2 text-start">{L("Why", "السبب")}</th><th className="px-2 text-end">{L("Support", "الدعم")}</th></tr></thead>
              <tbody>
                {rows.slice(0, 60).map((p) => (
                  <tr key={p.id} className="border-b border-line/60 align-top">
                    <td className="py-1.5 font-mono text-[11.5px]">{p.id}</td>
                    <td className="pe-2">{tx(engine.world.district[p.districtId].name)}</td>
                    <td className="px-2 text-end"><span className="inline-block min-w-[44px] rounded px-1.5 text-center font-semibold tabular text-white" style={{ background: BAND_COLOR[p.band] }}>{Math.round(p.pLate * 100)}%</span></td>
                    <td className="px-2 text-end tabular">{fmtInt(p.remaining)}</td>
                    <td className="px-2 text-end tabular">{fmt1(p.pace)} / {fmt1(p.required)}</td>
                    <td className="px-2 text-end tabular">{Number.isFinite(p.predictedFinishDay) ? fmt1(p.predictedFinishDay + 1) : "—"}</td>
                    <td className="max-w-[300px] px-2 text-ink-700">{p.drivers.slice(0, 2).map((d) => tx(d.text)).join(" ") || "—"}</td>
                    <td className="px-2 text-end">
                      {p.supported ? <span className="text-[11.5px] font-medium text-ok">{L("Supported", "مدعوم")}</span> : (
                        <div className="flex justify-end gap-1">
                          <Button size="xs" disabled={ew.reservesLeft <= 0 || engine.phase === "FINISHED"} onClick={() => setPending({ p, kind: "RESERVE" })}><LifeBuoy size={12} />{L("Reserve", "احتياطي")}</Button>
                          {p.helper ? <Button size="xs" disabled={engine.phase === "FINISHED"} onClick={() => setPending({ p, kind: "HELPER" })}><UserPlus size={12} />{p.helper.id.split("-").pop()} · {fmt1(p.helper.km)} km</Button> : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel className="mt-3" title={L("How good are the predictions? (backtest)", "ما مدى دقة التنبؤات؟ (اختبار رجعي)")} subtitle={L("Predictions rebuilt as of earlier days and compared with what happened", "تنبؤات أعيد بناؤها كما في أيام سابقة ومقارنتها بما حدث")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_EARLY_WARNING"]}>
        {backtests.length === 0 ? <p className="py-3 text-[12.5px] text-ink-500">{L("Available once the planned field days have passed — run the simulation to the end (20× speed).", "يتاح بعد انقضاء الأيام الميدانية المخططة — شغّل المحاكاة حتى النهاية (سرعة 20×).")}</p> : (
          <SimpleTable minWidth={620} head={[L("Predicted on day", "تنبأ في اليوم"), L("Workloads", "الأعباء"), L("Precision", "الدقة"), L("Recall", "الاستدعاء"), L("Accuracy", "الصحة"), L("Brier score", "مقياس براير")]} rows={backtests.map((b) => [String(b!.asOfDay), fmtInt(b!.n), fmtPct(b!.precision, 0), fmtPct(b!.recall, 0), fmtPct(b!.accuracy, 0), b!.brier.toFixed(3)])} />
        )}
        <p className="mt-2 text-[11.5px] text-ink-500">{L("Precision: share of flagged workloads that were really late. Recall: share of late workloads that were flagged. Brier: mean squared error of the probability (lower is better). Support given after the prediction day changes outcomes, so these are slightly conservative.", "الدقة: نسبة الأعباء المؤشَّرة التي تأخرت فعلاً. الاستدعاء: نسبة الأعباء المتأخرة التي أُشِّرت. براير: متوسط مربع خطأ الاحتمال (الأقل أفضل). الدعم المقدَّم بعد يوم التنبؤ يغيّر النتائج، لذا القيم متحفظة قليلاً.")}</p>
      </Panel>
      <Method>
        <Formula>{"P(late) = Φ( (ln required − ln pace) ÷ σ ),   required = remaining ÷ days left,   σ = CV(daily output) ÷ √days left + 0.08"}</Formula>
        <Formula>{"pace = 0.4 × visited ÷ active days + 0.6 × pace of the last three productive days"}</Formula>
        <p>{L("Only information a field manager has is used (listed dwellings, visits, daily output). Reserve support raises the workload's pace × 1.8; a helper — an enumerator who has finished, within 25 km — raises it × 1.6. Both are logged as supervisor interventions and never touch submitted responses.", "تُستخدم فقط المعلومات المتاحة لمدير الميدان (المساكن المدرجة، الزيارات، الإنتاج اليومي). يرفع الدعم الاحتياطي الوتيرة × 1.8، ويرفعها المساند — عدّاد أنهى عمله على بعد 25 كم — × 1.6. يُسجَّل كلاهما تدخلاً إشرافياً ولا يمسّ الإجابات المرسلة أبداً.")}</p>
      </Method>
      <Modal open={!!pending} onOpenChange={(o) => !o && setPending(null)} title={pending?.kind === "RESERVE" ? L("Deploy a reserve enumerator", "نشر عدّاد احتياطي") : L("Assign a helper", "إسناد مساند")} footer={<><Button onClick={() => setPending(null)}>{t("cancel")}</Button><Button variant="primary" onClick={confirm}>{t("confirm")}</Button></>}>
        {pending ? (
          <div className="space-y-2 text-[13px] text-ink-700">
            <p><b className="font-mono">{pending.p.id}</b> — {Math.round(pending.p.pLate * 100)}% {L("probability of finishing late", "احتمال التأخر")}, {fmtInt(pending.p.remaining)} {L("dwellings left", "مسكناً متبقياً")}.</p>
            {pending.kind === "HELPER" && pending.p.helper ? <p>{L("Helper", "المساند")}: <b className="font-mono">{pending.p.helper.id}</b> ({fmt1(pending.p.helper.km)} km)</p> : null}
            <p className={cn("rounded bg-sand-50 px-2 py-1.5 text-[12px]")}>{L(`Approved by ${actor}. Recorded as a supervisor intervention.`, `بموافقة ${actor}. يُسجَّل تدخلاً إشرافياً.`)}</p>
            <Field label={t("notes")}><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={L("Instruction to the field team", "تعليمات للفريق الميداني")} /></Field>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

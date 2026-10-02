"use client";

import { CalendarCheck2, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { Callout, PageHeader, Panel } from "@/components/ui/panel";
import { Field, Input, Slider } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Kpi } from "@/components/ui/kpi";
import { EChart } from "@/components/charts/echart";
import { barV, VIZ } from "@/components/charts/builders";
import { PlanInputSchema, planScenarios, type PlanInput, type PlanResult } from "@/simulation/planning";
import { fmt1, fmtDate, fmtInt, fmtPct } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { navIndex } from "@/lib/nav";

export function Planning() {
  const engine = useEngine();
  const { t, L, lb, tx, ar, locale } = useI18n();
  const config = useApp((s) => s.config);
  const setConfig = useApp((s) => s.setConfig);
  const world = engine.world;
  const [input, setInput] = useState<PlanInput>({
    households: world.totals.households,
    fieldDays: config.fieldDays,
    interviewsPerDay: config.interviewsPerDay,
    efficiency: config.efficiency,
    supervisorRatio: config.supervisorRatio,
    reservePct: 0.1,
    trainingBatch: 35,
    deviceReservePct: 0.08,
    startDate: config.startDate,
    referenceDate: config.referenceDate,
    excludeFridays: true,
  });
  const [pending, setPending] = useState<PlanResult | null>(null);
  const parsed = PlanInputSchema.safeParse(input);
  const errors = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
  const plans = useMemo(() => (parsed.success ? planScenarios(input) : []), [input, parsed.success]);
  const base = plans[1];
  const set = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => setInput((s) => ({ ...s, [k]: v }));

  const rows: { key: string; label: string; get: (p: PlanResult) => string }[] = [
    { key: "fieldDays", label: L("Fieldwork days", "أيام العمل الميداني"), get: (p) => fmtInt(p.input.fieldDays) },
    { key: "cap", label: L("Effective interviews / enumerator / day", "المقابلات الفعلية / عدّاد / يوم"), get: (p) => fmt1(p.effectiveCapacity) },
    { key: "enum", label: L("Required enumerators", "العدّادون المطلوبون"), get: (p) => fmtInt(p.enumerators) },
    { key: "res", label: L("Reserve enumerators", "العدّادون الاحتياطيون"), get: (p) => fmtInt(p.reserve) },
    { key: "sup", label: L("Supervisors", "المشرفون"), get: (p) => fmtInt(p.supervisors) },
    { key: "staff", label: L("Total field staff", "إجمالي الكادر الميداني"), get: (p) => fmtInt(p.fieldStaff) },
    { key: "dev", label: L("Tablets / devices", "الأجهزة اللوحية"), get: (p) => fmtInt(p.devices) },
    { key: "train", label: L("Training cohorts", "دفعات التدريب"), get: (p) => fmtInt(p.trainingCohorts) },
    { key: "ipd", label: L("Estimated interviews / day (national)", "المقابلات المقدرة يومياً (وطنياً)"), get: (p) => fmtInt(p.interviewsPerDay) },
    { key: "hpe", label: L("Households per enumerator", "الأسر لكل عدّاد"), get: (p) => fmtInt(p.householdsPerEnumerator) },
    { key: "capr", label: L("Operational capacity vs workload", "الطاقة التشغيلية مقابل عبء العمل"), get: (p) => fmtPct(p.capacityRatio, 0) },
    { key: "wd", label: L("Working days needed", "أيام العمل اللازمة"), get: (p) => fmtInt(p.workingDaysNeeded) },
    { key: "end", label: L("Expected completion date", "تاريخ الإنجاز المتوقع"), get: (p) => fmtDate(p.completionDate, locale) },
  ];

  const staffChart = useMemo(() => {
    if (!plans.length) return null;
    const cats = plans.map((p) => lb("planName", p.name));
    return barV(cats, [
      { name: L("Enumerators", "العدّادون"), data: plans.map((p) => p.enumerators), color: VIZ[0] },
      { name: L("Reserve", "الاحتياط"), data: plans.map((p) => p.reserve), color: VIZ[1] },
      { name: L("Supervisors", "المشرفون"), data: plans.map((p) => p.supervisors), color: VIZ[2] },
    ], { rtl: ar, stack: true, fmt: (v) => fmtInt(v) });
  }, [plans, ar, L, lb]);

  const govSplit = useMemo(() => {
    if (!base) return [];
    return world.governorates.map((g) => {
      const hh = world.eas.filter((e) => e.govId === g.id).reduce((s, e) => s + e.hhEstimate, 0);
      const share = hh / input.households;
      return { id: g.id, name: tx(g.name), hh, enumerators: Math.ceil(base.enumerators * share * (1 / g.profile.accessibility) ** 0.25), supervisors: Math.ceil((base.enumerators * share) / input.supervisorRatio) };
    });
  }, [base, world, input.households, input.supervisorRatio, tx]);

  const apply = (p: PlanResult) => {
    setConfig({ fieldDays: p.input.fieldDays, interviewsPerDay: p.input.interviewsPerDay, efficiency: p.input.efficiency, supervisorRatio: p.input.supervisorRatio, startDate: p.input.startDate, referenceDate: p.input.referenceDate });
    setPending(null);
  };

  return (
    <div>
      <PageHeader index={navIndex("/planning")} title={t("nav02")} subtitle={L("Operational sizing for national enumeration. All results recalculate instantly; a plan can be applied to the fieldwork simulation, which re-delineates EAs to one enumerator workload under that plan.", "تحديد الحجم التشغيلي للعدّ الوطني. تُعاد الحسابات فوراً، ويمكن تطبيق الخطة على محاكاة العمل الميداني لإعادة رسم مناطق العدّ وفق عبء عمل عدّاد واحد.")}>
        <Button onClick={() => plans.length && downloadCsv("census-plan-scenarios.csv", plans.map((p) => ({ scenario: p.name, fieldDays: p.input.fieldDays, enumerators: p.enumerators, reserve: p.reserve, supervisors: p.supervisors, devices: p.devices, trainingCohorts: p.trainingCohorts, interviewsPerDay: Math.round(p.interviewsPerDay), capacityRatio: p.capacityRatio, completionDate: p.completionDate })))}>{t("exportCsv")}</Button>
      </PageHeader>

      <div className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title={L("Planning inputs", "مدخلات التخطيط")} nature="SIMULATED" sources={["SIM_FRAME"]} subtitle={L("Validated with Zod. Household default = simulated frame.", "يُتحقق منها بـ Zod. القيمة الافتراضية للأسر = الإطار المحاكى.")}>
          <div className="space-y-3.5">
            <Field label={L("Estimated households", "عدد الأسر المقدر")} error={errors.households}>
              <Input type="number" value={input.households} onChange={(e) => set("households", Math.round(Number(e.target.value)))} className="tabular" />
            </Field>
            <Slider label={L("Fieldwork days", "أيام العمل الميداني")} value={input.fieldDays} min={7} max={60} step={1} onChange={(v) => set("fieldDays", v)} />
            <Slider label={L("Interviews per enumerator per day", "المقابلات لكل عدّاد يومياً")} value={input.interviewsPerDay} min={6} max={30} step={1} onChange={(v) => set("interviewsPerDay", v)} />
            <Slider label={L("Efficiency", "الكفاءة")} value={input.efficiency} min={0.5} max={1} step={0.01} onChange={(v) => set("efficiency", v)} format={(v) => fmtPct(v, 0)} hint={L("Share of time productive after travel, call-backs and breaks.", "نسبة الوقت المنتج بعد التنقل والزيارات المتكررة والاستراحات.")} />
            <Slider label={L("Enumerators per supervisor", "العدّادون لكل مشرف")} value={input.supervisorRatio} min={4} max={15} step={1} onChange={(v) => set("supervisorRatio", v)} />
            <Slider label={L("Reserve staff", "الكادر الاحتياطي")} value={input.reservePct} min={0} max={0.3} step={0.01} onChange={(v) => set("reservePct", v)} format={(v) => fmtPct(v, 0)} />
            <Slider label={L("Training batch size", "حجم دفعة التدريب")} value={input.trainingBatch} min={15} max={60} step={1} onChange={(v) => set("trainingBatch", v)} />
            <Slider label={L("Device reserve", "احتياطي الأجهزة")} value={input.deviceReservePct} min={0} max={0.25} step={0.01} onChange={(v) => set("deviceReservePct", v)} format={(v) => fmtPct(v, 0)} />
            <div className="grid grid-cols-2 gap-2">
              <Field label={L("Fieldwork start", "بدء العمل الميداني")}><Input type="date" value={input.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
              <Field label={L("Reference date", "التاريخ المرجعي")}><Input type="date" value={input.referenceDate} onChange={(e) => set("referenceDate", e.target.value)} /></Field>
            </div>
            <label className="flex items-center gap-2 text-[12.5px] text-ink-700"><input type="checkbox" checked={input.excludeFridays} onChange={(e) => set("excludeFridays", e.target.checked)} />{L("Exclude Fridays from working days", "استثناء أيام الجمعة من أيام العمل")}</label>
          </div>
        </Panel>

        <div className="min-w-0 space-y-3">
          {!parsed.success ? <Callout tone="warn">{L("Some inputs are out of range — correct them to see results.", "بعض المدخلات خارج النطاق — صححها لرؤية النتائج.")}</Callout> : null}
          {base ? (
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <Kpi label={L("Required enumerators", "العدّادون المطلوبون")} value={fmtInt(base.enumerators)} sub={`+${fmtInt(base.reserve)} ${L("reserve", "احتياط")}`} nature="SIMULATED" />
              <Kpi label={L("Supervisors", "المشرفون")} value={fmtInt(base.supervisors)} sub={`1 : ${input.supervisorRatio}`} nature="SIMULATED" />
              <Kpi label={L("Tablets / devices", "الأجهزة اللوحية")} value={fmtInt(base.devices)} sub={`${fmtInt(base.trainingCohorts)} ${L("training cohorts", "دفعة تدريب")}`} nature="SIMULATED" />
              <Kpi label={L("Expected completion", "الإنجاز المتوقع")} value={<span className="text-[18px]">{fmtDate(base.completionDate, locale)}</span>} sub={`${fmtInt(base.workingDaysNeeded)} ${L("working days", "يوم عمل")} · ${fmtPct(base.capacityRatio, 0)} ${L("capacity", "طاقة")}`} nature="SIMULATED" tone={base.capacityRatio < 1 ? "warn" : "ok"} />
            </div>
          ) : null}

          <Panel title={L("Scenario comparison — Lean / Base / Accelerated", "مقارنة السيناريوهات — مقتصد / أساسي / متسارع")} nature="SIMULATED" subtitle={L("Lean: +40% days, fewer reserves, wider supervision. Accelerated: −30% days, more reserves, tighter supervision.", "المقتصد: أيام أكثر بنسبة 40% واحتياط أقل وإشراف أوسع. المتسارع: أيام أقل بنسبة 30% واحتياط أكبر وإشراف أدق.")}>
            {plans.length ? (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full min-w-[560px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500">
                      <th className="py-2 text-start font-semibold">{L("Indicator", "المؤشر")}</th>
                      {plans.map((p) => <th key={p.name} className={cn("px-2 py-2 text-end font-semibold", p.name === "BASE" && "text-navy-700")}>{lb("planName", p.name)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key} className="border-b border-line/60">
                        <td className="py-1.5 text-ink-700">{r.label}</td>
                        {plans.map((p) => <td key={p.name} className={cn("px-2 py-1.5 text-end font-medium tabular", p.name === "BASE" && "bg-navy-100/40")}>{r.get(p)}</td>)}
                      </tr>
                    ))}
                    <tr>
                      <td />
                      {plans.map((p) => (
                        <td key={p.name} className="px-2 pt-2.5 text-end">
                          <Button size="xs" variant={p.name === "BASE" ? "primary" : "outline"} onClick={() => setPending(p)}><CalendarCheck2 size={12} />{L("Apply to simulation", "تطبيق على المحاكاة")}</Button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </Panel>

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title={L("Field staffing by scenario", "الكادر الميداني حسب السيناريو")} nature="SIMULATED">
              {staffChart ? <EChart option={staffChart} height={250} /> : null}
            </Panel>
            <Panel title={t("formula")} subtitle={L("Transparent calculation chain", "سلسلة حساب شفافة")}>
              <ul className="space-y-1.5 font-mono text-[11.5px] leading-relaxed text-ink-700" dir="ltr">
                <li>capacity = interviews/day × efficiency</li>
                <li>enumerators = ⌈ households ÷ (days × capacity) ⌉</li>
                <li>reserve = ⌈ enumerators × reserve% ⌉</li>
                <li>supervisors = ⌈ (enum + reserve) ÷ ratio ⌉</li>
                <li>devices = ⌈ field staff × (1 + device reserve%) ⌉</li>
                <li>cohorts = ⌈ field staff ÷ batch size ⌉</li>
                <li>completion = start + ⌈ households ÷ national interviews/day ⌉ working days</li>
              </ul>
              <div className="mt-3 rounded-md bg-sand-50 px-3 py-2 text-[12px] text-ink-700">
                {L("Currently applied to the simulation:", "المطبق حالياً على المحاكاة:")} <b className="tabular">{config.fieldDays} {t("days")} · {config.interviewsPerDay}/{t("day").toLowerCase()} · {fmtPct(config.efficiency, 0)}</b> — {fmtInt(world.enumerators.length)} {L("enumerators deployed", "عدّاداً منتشراً")}, {fmtInt(world.supervisors.length)} {L("supervisors", "مشرفاً")}.
              </div>
            </Panel>
          </div>

          <Panel title={L("Indicative allocation by governorate (Base plan)", "التوزيع الاسترشادي حسب المحافظة (الخطة الأساسية)")} nature="SIMULATED" sources={["SIM_FRAME", "SIM_PROFILES"]} subtitle={L("Enumerators are weighted up where accessibility is lower.", "يُرفع عدد العدّادين حيث تقل سهولة الوصول.")}>
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[520px] text-[12.5px]">
                <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{t("governorate")}</th><th className="text-end">{t("households")}</th><th className="text-end">{L("Enumerators", "العدّادون")}</th><th className="text-end">{L("Supervisors", "المشرفون")}</th><th className="text-end">{L("HH / enumerator", "أسر / عدّاد")}</th></tr></thead>
                <tbody>
                  {govSplit.map((g) => (
                    <tr key={g.id} className="border-b border-line/60"><td className="py-1.5">{g.name}</td><td className="text-end tabular">{fmtInt(g.hh)}</td><td className="text-end tabular">{fmtInt(g.enumerators)}</td><td className="text-end tabular">{fmtInt(g.supervisors)}</td><td className="text-end tabular">{fmtInt(g.hh / Math.max(1, g.enumerators))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>

      <Modal open={!!pending} onOpenChange={(o) => !o && setPending(null)} title={L("Apply plan to the fieldwork simulation?", "تطبيق الخطة على محاكاة العمل الميداني؟")} footer={<><Button onClick={() => setPending(null)}>{t("cancel")}</Button><Button variant="primary" onClick={() => pending && apply(pending)}><CheckCircle2 size={14} />{t("apply")}</Button></>}>
        {pending ? (
          <p className="text-[13px] leading-relaxed text-ink-700">
            {L(`The ${pending.name.toLowerCase()} plan (${pending.input.fieldDays} days, ${pending.input.interviewsPerDay} interviews/day, ${fmtPct(pending.input.efficiency, 0)} efficiency) will regenerate the synthetic EA frame and workforce with the same seed. Current fieldwork progress will be reset.`, `ستعيد الخطة (${lb("planName", pending.name)}: ${pending.input.fieldDays} يوماً، ${pending.input.interviewsPerDay} مقابلة يومياً، كفاءة ${fmtPct(pending.input.efficiency, 0)}) توليد إطار مناطق العدّ والقوى العاملة الاصطناعية بالبذرة نفسها، وسيُعاد ضبط تقدم العمل الميداني الحالي.`)}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}

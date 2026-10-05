/**
 * Governorate / national profile as a Word document (.docx), built in the browser from the live
 * plans: today (census base year), the selected horizon, diagnosis, strategy, priority actions and
 * delivery status. Every figure is labelled as simulated where it is.
 */
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { GovId, L } from "@/types/census";
import type { World } from "@/simulation/generate";
import { ACTION_SECTORS, SECTOR_LABEL, sevRank, type NationalPlan, type PlanSnapshot } from "@/simulation/lab/actions";
import { fmtInd } from "@/features/lab/ActionPlans";
import type { DeliveryData } from "@/delivery/model";
import { healthOf, stageOf, STAGE_LABEL, HEALTH_LABEL } from "@/delivery/model";
import { fmtCompact, fmtInt } from "./format";

export async function buildProfileDocx(world: World, plans: NationalPlan, snap: PlanSnapshot, govId: GovId | null, ar: boolean, delivery: DeliveryData, scenarioName: string): Promise<Blob> {
  const t = (l: L) => (ar ? l.ar : l.en);
  const T = (en: string, a: string) => (ar ? a : en);
  const loc = ar ? "ar" : "en";
  const name = govId ? t(world.gov[govId].name) : T("Jordan", "الأردن");
  const B = snap.baseYear;
  const Y = snap.year;
  const run = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) => new TextRun({ text, bold: o.bold, size: o.size, color: o.color, rightToLeft: ar, font: "Arial" });
  const p = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) => new Paragraph({ children: [run(text, o)], bidirectional: ar, spacing: { after: 120 } });
  const h = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) => new Paragraph({ children: [run(text, { bold: true, color: "16325C" })], heading: level, bidirectional: ar, spacing: { before: 280, after: 120 } });
  const cell = (text: string, head = false) => new TableCell({ children: [new Paragraph({ children: [run(text, { bold: head, size: 18 })], bidirectional: ar, alignment: ar ? AlignmentType.RIGHT : AlignmentType.LEFT })], shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: "E3EDFA" } : undefined, margins: { top: 60, bottom: 60, left: 80, right: 80 } });
  const table = (head: string[], rows: string[][]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, visuallyRightToLeft: ar, rows: [new TableRow({ tableHeader: true, children: head.map((x) => cell(x, true)) }), ...rows.map((r) => new TableRow({ children: r.map((x) => cell(x)) }))] });

  const a0 = govId ? snap.sa0.gov[govId] : snap.sa0.national;
  const aH = govId ? snap.saH.gov[govId] : snap.saH.national;
  const ec = govId ? snap.economy.byGov[govId] : null;
  const en = govId ? snap.energy.byGov[govId] : null;
  const ch = (a: number, b: number) => `${b >= a ? "+" : "−"}${Math.abs(Math.round((b / Math.max(1, a) - 1) * 100))}%`;
  const c = (v: number) => fmtCompact(v, loc);
  const kRows: string[][] = [
    [T("Population", "السكان"), c(a0.pop), c(aH.pop), ch(a0.pop, aH.pop)],
    [T("Households", "الأسر"), c(a0.households), c(aH.households), ch(a0.households, aH.households)],
    [T("School age 6–17", "سن المدرسة 6–17"), c(a0.a6_17), c(aH.a6_17), ch(a0.a6_17, aH.a6_17)],
    [T("Aged 65+", "65 سنة فأكثر"), c(a0.a65), c(aH.a65), ch(a0.a65, aH.a65)],
    [T("Output per resident (JOD)", "الناتج للفرد (دينار)"), fmtInt(ec ? ec.perCapBase : snap.economy.national.perCapBase), fmtInt(ec ? ec.perCapH : snap.economy.national.perCapH), ch(ec ? ec.perCapBase : snap.economy.national.perCapBase, ec ? ec.perCapH : snap.economy.national.perCapH)],
    [T("Peak electricity (MW)", "ذروة الكهرباء (ميغاواط)"), fmtInt(en ? en.peakBase : snap.energy.national.peakBase), fmtInt(en ? en.peakH : snap.energy.national.peakH), ch(en ? en.peakBase : snap.energy.national.peakBase, en ? en.peakH : snap.energy.national.peakH)],
  ];
  const children: (Paragraph | Table)[] = [
    new Paragraph({ children: [run(`UFUQ · ${T("Profile", "ملف")} — ${name}`, { bold: true, size: 40, color: "16325C" })], heading: HeadingLevel.TITLE, bidirectional: ar }),
    p(`${T("Scenario", "السيناريو")}: ${scenarioName} · ${T("Horizon", "الأفق")} ${Y} · ${T("Prepared", "أُعدّ")} ${new Date().toISOString().slice(0, 10)}`, { color: "5F6876" }),
    p(T("Prototype built from simulated census data and rule-based models. UFUQ is not an official government product; figures are not official statistics.", "نموذج أولي مبني على بيانات تعداد محاكاة ونماذج قائمة على القواعد. أفق ليس منتجاً حكومياً رسمياً؛ والأرقام ليست إحصاءات رسمية."), { color: "9A5B00", size: 18 }),
    h(T(`1. Today (${B}) and ${Y}`, `1. اليوم (${B}) و${Y}`)),
    table([T("Indicator", "المؤشر"), `${T("Today", "اليوم")} ${B}`, String(Y), T("Change", "التغير")], kRows),
  ];
  if (govId) {
    const plan = plans.plans[govId];
    children.push(h(T("2. Diagnosis against Jordan", "2. التشخيص مقارنة بالأردن")));
    children.push(table([T("Indicator", "المؤشر"), name, T("Jordan", "الأردن"), T("Severity", "الخطورة")], [...plan.indicators].sort((a, b) => sevRank(b.severity) - sevRank(a.severity)).slice(0, 14).map((i) => [t(i.label), fmtInd(i, i.value), fmtInd(i, i.national), i.severity])));
    children.push(h(T("3. Strategy by sector", "3. الاستراتيجية حسب القطاع")));
    for (const s of ACTION_SECTORS) if (plan.strategy[s]) children.push(p(`${t(SECTOR_LABEL[s])}: ${t(plan.strategy[s]!)}`));
  } else {
    children.push(h(T("2. National themes", "2. المحاور الوطنية")));
    plans.themes.forEach((th) => children.push(p(`• ${t(th)}`)));
    children.push(h(T("3. Investment by sector", "3. الاستثمار حسب القطاع")));
    children.push(table([T("Sector", "القطاع"), T("Actions", "الإجراءات"), T("High / critical", "مرتفع / حرج"), T("Indicative cost (JOD M)", "الكلفة التقديرية (مليون دينار)")], ACTION_SECTORS.filter((s) => plans.bySector[s].actions).map((s) => [t(SECTOR_LABEL[s]), String(plans.bySector[s].actions), String(plans.bySector[s].critical), fmtInt(plans.bySector[s].costM)])));
  }
  const acts = (govId ? plans.plans[govId].actions : plans.top).slice(0, 12);
  children.push(h(T("4. Priority corrective actions", "4. أهم الإجراءات التصحيحية")));
  children.push(table([T("Action", "الإجراء"), T("Severity", "الخطورة"), T("Horizon", "الأفق"), T("Cost (JOD M)", "الكلفة (مليون دينار)"), T("Lead", "الجهة القائدة"), T("Target", "المستهدف")], acts.map((a) => [`${t(a.title)}${govId ? "" : ` — ${t(world.gov[a.govId].name)}`}`, a.severity, a.horizon, a.costM.toFixed(1), t(a.lead), t(a.kpi)])));
  const items = Object.values(delivery.items).filter((i) => !govId || i.govId === govId);
  children.push(h(T("5. Delivery status", "5. حالة التنفيذ")));
  if (items.length) children.push(table([T("Action", "الإجراء"), T("Stage", "المرحلة"), T("Health", "الحالة"), T("Responsible unit", "الجهة المسؤولة")], items.slice(0, 20).map((i) => [t(i.title), t(STAGE_LABEL[stageOf(i, delivery.approvals)]), t(HEALTH_LABEL[healthOf(i, delivery.approvals)]), i.owner])));
  else children.push(p(T("No actions are in the delivery portfolio for this scope yet.", "لا توجد إجراءات في محفظة التنفيذ لهذا النطاق بعد.")));
  children.push(h(T("6. Sources and notes", "6. المصادر والملاحظات")));
  children.push(p(T(`Census base year ${B} (simulated census frame on geoBoundaries geography, reference population from DoS estimates as reported in secondary sources). National GDP from World Bank WDI and electricity demand from Our World in Data (open-data connectors). Unit costs, targets and terrain constraints are illustrative. Actions are proposals for the responsible ministries — not decisions.`, `سنة أساس التعداد ${B} (إطار تعداد محاكى على جغرافيا geoBoundaries، والسكان المرجعيون من تقديرات الدائرة كما وردت في مصادر ثانوية). الناتج الوطني من البنك الدولي والطلب على الكهرباء من Our World in Data (موصلات البيانات المفتوحة). تكاليف الوحدة والمستهدفات وقيود التضاريس توضيحية. الإجراءات مقترحات للجهات المسؤولة وليست قرارات.`), { size: 18, color: "5F6876" }));
  const doc = new Document({ creator: "UFUQ", title: `UFUQ profile — ${name}`, styles: { default: { document: { run: { font: "Arial", size: 21 } } } }, sections: [{ properties: {}, children }] });
  return Packer.toBlob(doc);
}

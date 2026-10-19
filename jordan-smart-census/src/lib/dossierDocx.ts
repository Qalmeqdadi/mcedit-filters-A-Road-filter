/**
 * Governorate dossier (.docx) built only from the National Indicator Registry: every governorate
 * indicator with its value, the Kingdom figure, rank, status, period, accountable entity and source.
 * No model output is included.
 */
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { GovId } from "@/types/census";
import { AS_OF, entity, fmtValue, GOVS, INDICATORS, proposedRequests, STATUS_LABEL, type Status } from "@/data/registry";

export async function buildDossierDocx(g: GovId, name: string, ar: boolean): Promise<Blob> {
  const T = (en: string, a: string) => (ar ? a : en);
  const tx = (l: { en: string; ar: string }) => (ar ? l.ar : l.en);
  const run = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) => new TextRun({ text, bold: o.bold, size: o.size, color: o.color, rightToLeft: ar, font: "Arial" });
  const p = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) => new Paragraph({ children: [run(text, o)], bidirectional: ar, alignment: ar ? AlignmentType.RIGHT : AlignmentType.LEFT, spacing: { after: 120 } });
  const h = (text: string) => new Paragraph({ children: [run(text, { bold: true, color: "16325C" })], heading: HeadingLevel.HEADING_2, bidirectional: ar, spacing: { before: 260, after: 120 } });
  const cell = (text: string, head = false) => new TableCell({ children: [new Paragraph({ children: [run(text, { bold: head, size: 17 })], bidirectional: ar, alignment: ar ? AlignmentType.RIGHT : AlignmentType.LEFT })], shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: "E3EDFA" } : undefined, margins: { top: 50, bottom: 50, left: 70, right: 70 } });
  const table = (head: string[], rows: string[][]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, visuallyRightToLeft: ar, rows: [new TableRow({ tableHeader: true, children: head.map((x) => cell(x, true)) }), ...rows.map((r) => new TableRow({ children: r.map((x) => cell(x)) }))] });
  const micro = INDICATORS.filter((i) => i.level === "MICRO");
  const avail = micro.filter((i) => (i.govStatus?.[g] ?? i.status) !== "MISSING");
  const miss = micro.filter((i) => (i.govStatus?.[g] ?? i.status) === "MISSING");
  const rank = (i: (typeof micro)[number]) => { const v = i.byGov?.[g]; return v === undefined ? "—" : `${1 + GOVS.filter((x) => (i.byGov?.[x] ?? -Infinity) > v).length}/12`; };
  const reqs = proposedRequests();
  const doc = new Document({
    creator: "UFUQ", title: `Governorate dossier — ${name}`, styles: { default: { document: { run: { font: "Arial", size: 21 } } } },
    sections: [{ properties: {}, children: [
      new Paragraph({ children: [run(`${T("Governorate dossier", "ملف المحافظة")} — ${name}`, { bold: true, size: 38, color: "16325C" })], heading: HeadingLevel.TITLE, bidirectional: ar }),
      p(`${T("National Macro–Micro Dashboard · snapshot", "لوحة المؤشرات الوطنية الكلية والجزئية · لقطة")} ${AS_OF}`, { color: "5F6876" }),
      p(T("Concept proposal — not an official product of the Royal Hashemite Court or any government entity. Figures carry their status: Official (machine-read official file), Reported (official figure transcribed), Derived (computed from official figures), International, or Missing (requested).", "مقترح مفاهيمي — ليس منتجاً رسمياً للديوان الملكي الهاشمي أو لأي جهة حكومية. تحمل الأرقام حالتها: رسمي (ملف رسمي مقروء آلياً)، منشور (رقم رسمي منقول)، مشتق (محسوب من أرقام رسمية)، دولي، أو غير متاح (مطلوب)."), { size: 17, color: "9A5B00" }),
      h(T(`1. Available figures (${avail.length})`, `1. الأرقام المتاحة (${avail.length})`)),
      table([T("Indicator", "المؤشر"), name, T("Kingdom", "المملكة"), T("Rank", "الترتيب"), T("Status", "الحالة"), T("Period", "الفترة"), T("Accountable", "المسؤول")],
        avail.map((i) => { const st: Status = i.govStatus?.[g] ?? i.status; return [`${tx(i.name)} (${tx(i.unit)})`, fmtValue(i, i.byGov?.[g]), fmtValue(i, i.value), rank(i), tx(STATUS_LABEL[st]), i.period ?? "—", tx(entity(i.owner).short)]; })),
      h(T(`2. Figures not yet available (${miss.length})`, `2. أرقام غير متاحة بعد (${miss.length})`)),
      table([T("Indicator", "المؤشر"), T("Accountable entity", "الجهة المسؤولة"), T("Request", "الطلب"), T("Note", "ملاحظة")],
        miss.map((i) => [tx(i.name), tx(entity(i.owner).name), reqs.find((r) => r.indicatorIds.includes(i.id))?.id ?? "—", i.note ? tx(i.note) : ""])),
      h(T("3. Sources", "3. المصادر")),
      ...[...new Map(avail.map((i) => [i.source.name, i.source])).values()].map((s) => p(`• ${s.name}${s.url ? ` — ${s.url}` : ""}${s.retrieved ? ` (${T("retrieved", "تاريخ الجلب")} ${s.retrieved})` : ""}`, { size: 17 })),
    ] }],
  });
  return Packer.toBlob(doc);
}

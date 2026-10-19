/**
 * Draft data-request letter (.docx) to an accountable entity, in Arabic or English.
 * It is a DRAFT for the owner's office to review, adapt and issue on its own letterhead — the file
 * carries no emblem or letterhead and says so.
 */
import { AlignmentType, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { AS_OF, entity, FREQ_LABEL, indicator, PROPOSED_LAG, type DataRequest } from "@/data/registry";

export async function buildRequestLetter(req: DataRequest, ar: boolean): Promise<Blob> {
  const T = (en: string, a: string) => (ar ? a : en);
  const e = entity(req.entityId);
  const due = new Date(Date.parse(AS_OF) + 30 * 86_400_000).toISOString().slice(0, 10);
  const run = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) => new TextRun({ text, bold: o.bold, size: o.size, color: o.color, rightToLeft: ar, font: ar ? "Arial" : "Calibri" });
  const p = (text: string, o: { bold?: boolean; size?: number; color?: string; after?: number } = {}) => new Paragraph({ children: [run(text, o)], bidirectional: ar, alignment: ar ? AlignmentType.RIGHT : AlignmentType.LEFT, spacing: { after: o.after ?? 140 } });
  const cell = (text: string, head = false) => new TableCell({ children: [new Paragraph({ children: [run(text, { bold: head, size: 18 })], bidirectional: ar, alignment: ar ? AlignmentType.RIGHT : AlignmentType.LEFT })], shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: "EEF1F5" } : undefined, margins: { top: 60, bottom: 60, left: 80, right: 80 } });
  const rows = req.indicatorIds.map((id) => {
    const i = indicator(id);
    const scope = i.level === "MICRO" ? T("By governorate (12)", "حسب المحافظة (12)") : T("National", "وطني");
    const latest = i.status === "MISSING" ? T("Not found in open channels", "غير متاح في القنوات المفتوحة") : `${i.period}`;
    return [ar ? i.name.ar : i.name.en, scope, ar ? FREQ_LABEL[i.freq].ar : FREQ_LABEL[i.freq].en, latest, T(`${PROPOSED_LAG[i.freq]} days after period end`, `${PROPOSED_LAG[i.freq]} يوماً بعد انتهاء الفترة`)];
  });
  const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, visuallyRightToLeft: ar, rows: [new TableRow({ tableHeader: true, children: [T("Data series", "السلسلة"), T("Geography", "المستوى الجغرافي"), T("Frequency", "الدورية"), T("Latest found", "آخر فترة متاحة"), T("Proposed delivery", "التسليم المقترح")].map((x) => cell(x, true)) }), ...rows.map((r) => new TableRow({ children: r.map((x) => cell(x)) }))] });
  const why = req.reason === "MISSING"
    ? T("These series are needed for every governorate, but no public governorate-level figure could be found in open channels.", "هذه السلاسل مطلوبة لكل محافظة، ولم يُعثر على أرقام منشورة لها على مستوى المحافظة في القنوات المفتوحة.")
    : T("The latest figures found in open channels are older than the proposed delivery window.", "آخر الأرقام المتاحة في القنوات المفتوحة أقدم من نافذة التسليم المقترحة.");
  const children: (Paragraph | Table)[] = [
    p(T("DRAFT — for review and issue by the dashboard owner's office on its own letterhead. Prepared with UFUQ (concept proposal; not an official document).", "مسودة — للمراجعة والإصدار من مكتب الجهة المالكة للوحة على ترويستها الرسمية. أُعدّت باستخدام أفق (مقترح مفاهيمي؛ ليست وثيقة رسمية)."), { size: 17, color: "9A5B00", after: 280 }),
    p(`${T("Ref.", "الرقم")}: ${req.id}    ${T("Date", "التاريخ")}: ____ / ____ / ________`, { size: 20 }),
    p(T(`To: ${e.name.en}`, `${e.name.ar} المحترمين`), { bold: true }),
    p(T("Subject: Request for data for the National Macro–Micro Dashboard", "الموضوع: طلب تزويد بيانات للوحة المؤشرات الوطنية الكلية والجزئية"), { bold: true, after: 220 }),
    p(T("Greetings,", "تحية طيبة وبعد،")),
    p(T("As part of establishing a national Macro–Micro Dashboard that gives decision-makers one reliable view of the Kingdom and of each governorate, every indicator has been assigned to the entity best placed to supply it. Your entity is identified as the accountable source for the series below.", "في إطار إنشاء لوحة مؤشرات وطنية كلية وجزئية توفر لصانع القرار رؤية موحدة وموثوقة للمملكة ولكل محافظة، أُسند كل مؤشر إلى الجهة الأقدر على تزويده، وقد حُددت جهتكم الكريمة مصدراً مسؤولاً عن السلاسل الواردة أدناه.")),
    p(why),
    table,
    p("", { after: 120 }),
    p(T("We kindly request:", "نرجو التكرم بما يلي:"), { bold: true }),
    p(T(`1. Providing the latest available values and the historical series since 2015, by governorate where indicated, by ${due}.`, `1. تزويدنا بآخر القيم المتاحة والسلسلة التاريخية منذ عام 2015، وحسب المحافظة حيثما أُشير، في موعد أقصاه ${due}.`)),
    p(T("2. Machine-readable format (CSV/Excel, or an API through the Government data exchange operated by the Ministry of Digital Economy and Entrepreneurship), with definitions, units and the date of each value.", "2. أن تكون البيانات بصيغة قابلة للقراءة الآلية (CSV/Excel أو عبر واجهة برمجية من خلال منصة تبادل البيانات الحكومية لدى وزارة الاقتصاد الرقمي والريادة)، مع التعريفات والوحدات وتاريخ كل قيمة.")),
    p(T("3. Naming a focal point responsible for regular updates within the proposed delivery window.", "3. تسمية ضابط ارتباط مسؤول عن التحديث الدوري ضمن نافذة التسليم المقترحة.")),
    p(T("Only aggregated statistics are requested — no personal data — consistent with the Personal Data Protection Law No. 24 of 2023. Figures will be validated with the Department of Statistics under the General Statistics Law before publication on the dashboard, and the source will be credited to your entity.", "تُطلب الإحصاءات المجمعة فقط دون أي بيانات شخصية، انسجاماً مع قانون حماية البيانات الشخصية رقم 24 لسنة 2023. وستُعتمد الأرقام بالتنسيق مع دائرة الإحصاءات العامة وفق قانون الإحصاءات العامة قبل نشرها على اللوحة، مع نسبة المصدر إلى جهتكم.")),
    p(T("With thanks for your cooperation.", "شاكرين لكم حسن تعاونكم."), { after: 360 }),
    p(T("Name and title: ______________________", "الاسم والمنصب: ______________________")),
    p(T("Signature: ______________________", "التوقيع: ______________________")),
  ];
  const doc = new Document({ creator: "UFUQ", title: `${req.id} — ${e.name.en}`, styles: { default: { document: { run: { font: ar ? "Arial" : "Calibri", size: 22 } } } }, sections: [{ properties: {}, children }] });
  return Packer.toBlob(doc);
}

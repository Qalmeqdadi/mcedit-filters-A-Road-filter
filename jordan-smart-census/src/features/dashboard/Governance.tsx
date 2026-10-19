"use client";

import { ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel } from "@/components/ui/panel";
import { navIndex } from "@/lib/nav";
import { FREQ_LABEL, PROPOSED_LAG, type Freq } from "@/data/registry";
import { ConceptBanner } from "./parts";

type Row = [string, string, string, string];

export function Governance() {
  const { L, ar, t } = useI18n();
  const T = (r: Row) => (ar ? [r[2], r[3]] : [r[0], r[1]]);
  const roles: Row[] = [
    ["Owner (proposed): Royal Hashemite Court", "Convenes the dashboard, sets the national indicator priorities, receives the quarterly view, issues data requests through its office and chairs the quarterly accountability review.", "المالك (مقترح): الديوان الملكي الهاشمي", "يرعى اللوحة ويحدد أولويات المؤشرات الوطنية ويتسلم العرض الربعي ويصدر طلبات البيانات عبر مكتبه ويرأس مراجعة المساءلة الربعية."],
    ["Government counterpart: Prime Ministry delivery follow-up", "Links indicators to the Economic Modernisation Vision executive programme and answers for delivery against targets.", "النظير الحكومي: متابعة التنفيذ في رئاسة الوزراء", "يربط المؤشرات بالبرنامج التنفيذي لرؤية التحديث الاقتصادي ويجيب عن التنفيذ مقابل المستهدفات."],
    ["Statistical authority: Department of Statistics", "Owns definitions and metadata, validates every figure before it is shown as Official, and resolves conflicting numbers (one number per question).", "السلطة الإحصائية: دائرة الإحصاءات العامة", "تملك التعريفات والبيانات الوصفية وتعتمد كل رقم قبل عرضه رسمياً وتحسم الأرقام المتعارضة (رقم واحد لكل سؤال)."],
    ["Data channel: Ministry of Digital Economy and Entrepreneurship", "Operates the Government data exchange and open data portal through which entities deliver series; sets security and access rules.", "قناة البيانات: وزارة الاقتصاد الرقمي والريادة", "تشغّل منصة تبادل البيانات الحكومية وبوابة البيانات المفتوحة التي تسلّم عبرها الجهات سلاسلها، وتضع قواعد الأمن والوصول."],
    ["Data providers: ministries, agencies, municipalities", "Each names a focal point and supplies its series within the agreed window, at governorate level where required.", "مزودو البيانات: الوزارات والهيئات والبلديات", "تسمي كل جهة ضابط ارتباط وتزود سلاسلها ضمن النافذة المتفق عليها، وعلى مستوى المحافظة حيث يلزم."],
    ["External partners: UNHCR, World Bank and others", "Provide comparison series; never replace a national figure where one exists.", "الشركاء الخارجيون: المفوضية والبنك الدولي وغيرهما", "يوفرون سلاسل للمقارنة؛ ولا يحلّون محل الرقم الوطني حيث يوجد."],
    ["Platform operator: UFUQ team", "Builds and runs the dashboard and models. Never edits a figure: values come only from the providers through the validation step.", "مشغّل المنصة: فريق أفق", "يبني ويشغّل اللوحة والنماذج. لا يعدّل أي رقم: القيم تأتي فقط من المزودين عبر خطوة الاعتماد."],
  ];
  const principles: [string, string][] = [
    [L("One number per question", "رقم واحد لكل سؤال"), L("DoS figures are the national reference; others are shown for comparison and the gap is explained.", "أرقام الدائرة هي المرجع الوطني؛ وتُعرض غيرها للمقارنة مع شرح الفجوة.")],
    [L("Provenance on every figure", "مصدر لكل رقم"), L("Status, source, date and accountable entity are one click away everywhere.", "الحالة والمصدر والتاريخ والجهة المسؤولة على بُعد نقرة في كل مكان.")],
    [L("Gaps are visible", "الفجوات ظاهرة"), L("A missing figure is shown as a request to a named entity, never filled silently.", "يُعرض الرقم غير المتاح كطلب إلى جهة محددة ولا يُملأ بصمت.")],
    [L("Aggregates only", "بيانات مجمعة فقط"), L("No personal data is requested or held, consistent with the Personal Data Protection Law No. 24 of 2023.", "لا تُطلب ولا تُحفظ بيانات شخصية، انسجاماً مع قانون حماية البيانات الشخصية رقم 24 لسنة 2023.")],
    [L("Models are labelled", "النماذج موسومة"), L("Projections and plans are simulated planning estimates and are always marked as such.", "الإسقاطات والخطط تقديرات تخطيطية محاكاة وتُوسم دائماً بذلك.")],
    [L("People decide", "القرار للإنسان"), L("AI may explain and summarise; it never changes data, and every action needs human approval.", "يمكن للذكاء الاصطناعي أن يشرح ويلخص؛ ولا يغيّر البيانات أبداً، وكل إجراء يحتاج موافقة بشرية.")],
  ];
  const cycle = [L("Request", "الطلب"), L("Deliver", "التسليم"), L("Validate (DoS)", "الاعتماد (الدائرة)"), L("Publish", "النشر"), L("Use in decisions", "الاستخدام في القرار"), L("Quarterly review", "المراجعة الربعية")];
  const phases: [string, string, string][] = [
    [L("Days 0–30", "الأيام 0–30"), L("Agree", "الاتفاق"), L("Endorse the charter; sign data agreements with DoS and five priority providers (Education, Health, Water, Local Administration, National Aid Fund); name focal points.", "اعتماد الميثاق؛ توقيع اتفاقيات البيانات مع الدائرة وخمسة مزودين ذوي أولوية (التربية والصحة والمياه والإدارة المحلية وصندوق المعونة)؛ تسمية ضباط الارتباط.")],
    [L("Days 30–60", "الأيام 30–60"), L("Connect", "الربط"), L("Deliver the first governorate series through the Government data exchange; DoS validates; close the 'Requested' cells on the dashboard.", "تسليم أول سلاسل المحافظات عبر منصة تبادل البيانات الحكومية؛ اعتمادها من الدائرة؛ إغلاق خلايا «مطلوب» في اللوحة.")],
    [L("Days 60–90", "الأيام 60–90"), L("Review", "المراجعة"), L("Live dashboard for all twelve governorates; first quarterly accountability review chaired by the owner; decide the next wave of indicators.", "لوحة حية للمحافظات الاثنتي عشرة؛ أول مراجعة مساءلة ربعية برئاسة المالك؛ تحديد الموجة التالية من المؤشرات.")],
  ];
  return (
    <div>
      <PageHeader index={navIndex("/governance")} title={t("navGovernance")} subtitle={L("A proposed charter for a Court-owned national dashboard: who owns it, who validates, how data flows, what every entity is accountable for, and how the first 90 days would run.", "ميثاق مقترح للوحة وطنية يملكها الديوان: من يملكها ومن يعتمد وكيف تتدفق البيانات وما تُسأل عنه كل جهة وكيف تسير أول 90 يوماً.")} />
      <ConceptBanner />
      <Panel title={L("Roles and responsibilities (proposed)", "الأدوار والمسؤوليات (مقترح)")} bodyClass="p-0">
        <div className="divide-y divide-line/70" data-testid="charter-roles">
          {roles.map((r) => { const [a, b] = T(r); return <div key={r[0]} className="grid gap-1 px-4 py-2.5 md:grid-cols-[300px_minmax(0,1fr)]"><div className="text-[13px] font-semibold text-ink-900">{a}</div><div className="text-[12.5px] leading-relaxed text-ink-700">{b}</div></div>; })}
        </div>
      </Panel>
      <Panel className="mt-3" title={L("The data cycle", "دورة البيانات")}>
        <ol className="flex flex-wrap items-center gap-2">
          {cycle.map((c, i) => <li key={c} className="flex items-center gap-2"><span className="rounded-md border border-navy-300/60 bg-navy-100/60 px-3 py-1.5 text-[12.5px] font-semibold text-navy-800"><span className="me-1.5 text-sand-500">{i + 1}</span>{c}</span>{i < cycle.length - 1 ? <ArrowRight size={14} className="text-ink-400 rtl:rotate-180" /> : null}</li>)}
        </ol>
      </Panel>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <Panel title={L("Principles", "المبادئ")}>
          <ul className="space-y-2">{principles.map(([a, b]) => <li key={a}><div className="text-[13px] font-semibold text-ink-900">{a}</div><div className="text-[12.5px] leading-relaxed text-ink-700">{b}</div></li>)}</ul>
        </Panel>
        <div className="space-y-3">
          <Panel title={L("Proposed service levels", "مستويات الخدمة المقترحة")} subtitle={L("Delivery window after the end of each reference period", "نافذة التسليم بعد انتهاء كل فترة مرجعية")}>
            <table className="w-full text-[12.5px]"><tbody>
              {(["M", "Q", "A", "5Y"] as Freq[]).map((f) => <tr key={f} className="border-b border-line/60"><td className="py-1.5 text-ink-700">{ar ? FREQ_LABEL[f].ar : FREQ_LABEL[f].en}</td><td className="py-1.5 text-end font-semibold tabular">{PROPOSED_LAG[f]} {L("days", "يوماً")}</td></tr>)}
            </tbody></table>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-700">{L("Escalation: one period overdue → reminder from the dashboard secretariat; two periods → raised at the owner's quarterly review.", "التصعيد: تأخر فترة واحدة ← تذكير من أمانة اللوحة؛ فترتان ← يُرفع إلى المراجعة الربعية لدى المالك.")}</p>
          </Panel>
          <Panel title={L("Legal and policy anchors", "المرتكزات القانونية والسياساتية")}>
            <ul className="list-disc space-y-1 ps-5 text-[12.5px] leading-relaxed text-ink-700">
              <li>{L("General Statistics Law No. 12 of 2012 — DoS as the statistical authority", "قانون الإحصاءات العامة رقم 12 لسنة 2012 — الدائرة سلطةً إحصائية")}</li>
              <li>{L("Personal Data Protection Law No. 24 of 2023", "قانون حماية البيانات الشخصية رقم 24 لسنة 2023")}</li>
              <li>{L("Economic Modernisation Vision (to 2033) and its 2026–2029 executive programme", "رؤية التحديث الاقتصادي (حتى 2033) وبرنامجها التنفيذي 2026–2029")}</li>
              <li>{L("National Urban Policy (2024) and the draft Local Administration Law (2026), which proposes a municipal urban development observatory", "السياسة الحضرية الوطنية (2024) ومشروع قانون الإدارة المحلية (2026) الذي يقترح مرصداً للتنمية الحضرية البلدية")}</li>
            </ul>
          </Panel>
        </div>
      </div>
      <Panel className="mt-3" title={L("First 90 days (proposed pilot)", "أول 90 يوماً (تجربة مقترحة)")}>
        <div className="grid gap-3 md:grid-cols-3">
          {phases.map(([d, a, b]) => <div key={d} className="rounded-md border border-line px-3 py-2.5"><div className="text-[11px] font-semibold uppercase tracking-wider text-sand-500">{d}</div><div className="text-[14px] font-semibold text-ink-900">{a}</div><p className="mt-1 text-[12.5px] leading-relaxed text-ink-700">{b}</p></div>)}
        </div>
      </Panel>
    </div>
  );
}

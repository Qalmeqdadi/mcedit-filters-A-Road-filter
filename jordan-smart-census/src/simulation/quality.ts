/**
 * Census edit / validation rules (deterministic).
 *
 * Household & person rules are pure functions shared by the fieldwork engine and
 * the Digital Census Questionnaire. Cross-record rules (duplicates, identical
 * patterns) and operational rules (productivity, refusals, coverage) are run by
 * the engine at the end of each simulated field day.
 */
import type { Household, L, Severity } from "@/types/census";

export interface RuleDef {
  id: string;
  severity: Severity;
  scope: "PERSON" | "HOUSEHOLD" | "CROSS_RECORD" | "ENUMERATOR" | "EA";
  title: L;
  logic: L;
}

export const RULES: RuleDef[] = [
  { id: "R01", severity: "CRITICAL", scope: "PERSON", title: { en: "Implausible age", ar: "عمر غير معقول" }, logic: { en: "age < 0 or age > 110", ar: "العمر < 0 أو العمر > 110" } },
  { id: "R02", severity: "CRITICAL", scope: "PERSON", title: { en: "Child older than parent", ar: "الابن أكبر من الوالد" }, logic: { en: "child age ≥ age of linked mother/father (or head for CHILD relation)", ar: "عمر الابن ≥ عمر الأم/الأب المرتبط (أو رب الأسرة لعلاقة ابن)" } },
  { id: "R03", severity: "HIGH", scope: "PERSON", title: { en: "Implausible parent–child age gap", ar: "فارق عمر غير معقول بين الوالد والابن" }, logic: { en: "parent age − child age < 14, or mother's age at birth > 55", ar: "عمر الوالد − عمر الابن < 14، أو عمر الأم عند الولادة > 55" } },
  { id: "R04", severity: "HIGH", scope: "PERSON", title: { en: "Marital status inconsistent with age", ar: "الحالة الزواجية لا تتسق مع العمر" }, logic: { en: "ever-married and age < 15", ar: "سبق له الزواج والعمر < 15" } },
  { id: "R05", severity: "HIGH", scope: "PERSON", title: { en: "Employment inconsistent with age", ar: "الحالة العملية لا تتسق مع العمر" }, logic: { en: "employed/unemployed and age < 12 (HIGH), 12–14 (MEDIUM)", ar: "مشتغل/متعطل والعمر < 12 (مرتفع)، 12–14 (متوسط)" } },
  { id: "R06", severity: "CRITICAL", scope: "CROSS_RECORD", title: { en: "Duplicate household ID", ar: "رقم أسرة مكرر" }, logic: { en: "same household identifier submitted more than once", ar: "إرسال رقم الأسرة نفسه أكثر من مرة" } },
  { id: "R07", severity: "HIGH", scope: "HOUSEHOLD", title: { en: "Missing / inconsistent household members", ar: "أفراد مفقودون أو غير متسقين" }, logic: { en: "no household head, more than one head, or spouse present while head not married", ar: "لا يوجد رب أسرة، أو أكثر من رب أسرة، أو وجود زوج/زوجة مع رب أسرة غير متزوج" } },
  { id: "R08", severity: "MEDIUM", scope: "HOUSEHOLD", title: { en: "Unusually large household", ar: "أسرة كبيرة بشكل غير معتاد" }, logic: { en: "household size ≥ 16", ar: "حجم الأسرة ≥ 16" } },
  { id: "R09", severity: "MEDIUM", scope: "HOUSEHOLD", title: { en: "Interview duration too short", ar: "مدة المقابلة قصيرة جداً" }, logic: { en: "duration < 6 min or < 1.5 min per person", ar: "المدة < 6 دقائق أو < 1.5 دقيقة لكل فرد" } },
  { id: "R10", severity: "HIGH", scope: "CROSS_RECORD", title: { en: "Repeated identical household pattern", ar: "تكرار نمط أسرة متطابق" }, logic: { en: "≥ 3 households by one enumerator share an identical roster signature (relation/sex/age)", ar: "≥ 3 أسر لدى العدّاد نفسه تتطابق بصمة قائمتها (العلاقة/الجنس/العمر)" } },
  { id: "R11", severity: "MEDIUM", scope: "PERSON", title: { en: "Education inconsistent with age", ar: "التعليم لا يتسق مع العمر" }, logic: { en: "bachelor or higher and age < 19; secondary and age < 16", ar: "بكالوريوس فأعلى والعمر < 19؛ ثانوي والعمر < 16" } },
  { id: "R12", severity: "HIGH", scope: "PERSON", title: { en: "Household head too young", ar: "رب الأسرة صغير السن" }, logic: { en: "head age < 15", ar: "عمر رب الأسرة < 15" } },
  { id: "R13", severity: "HIGH", scope: "ENUMERATOR", title: { en: "Unusually high enumerator productivity", ar: "إنتاجية عدّاد مرتفعة بشكل غير معتاد" }, logic: { en: "interviews/day > 2× planned rate after ≥ 2 field days", ar: "المقابلات/اليوم > ضعف المعدل المخطط بعد يومين ميدانيين على الأقل" } },
  { id: "R14", severity: "MEDIUM", scope: "EA", title: { en: "High refusal concentration", ar: "تركّز مرتفع لحالات الرفض" }, logic: { en: "EA refusal rate > 10% with ≥ 30 contacted households", ar: "نسبة الرفض في منطقة العدّ > 10% مع ≥ 30 أسرة تم التواصل معها" } },
  { id: "R15", severity: "MEDIUM", scope: "EA", title: { en: "Expected vs visited dwellings mismatch", ar: "عدم تطابق المساكن المتوقعة والمزارة" }, logic: { en: "first visits complete and visited dwellings differ from listing by > 20%", ar: "اكتمال الزيارات الأولى واختلاف المساكن المزارة عن الحصر بأكثر من 20%" } },
  { id: "R16", severity: "HIGH", scope: "ENUMERATOR", title: { en: "Geographic mismatch", ar: "عدم تطابق جغرافي" }, logic: { en: "> 15% of interview GPS points outside the assigned EA (n ≥ 20)", ar: "> 15% من نقاط GPS للمقابلات خارج منطقة العدّ المخصصة (ن ≥ 20)" } },
  { id: "R17", severity: "HIGH", scope: "EA", title: { en: "Large EA coverage gap", ar: "فجوة تغطية كبيرة في منطقة العدّ" }, logic: { en: "in the last 2 planned days, EA progress < 70%", ar: "في آخر يومين مخططين، إنجاز منطقة العدّ < 70%" } },
];

export const RULE_INDEX = Object.fromEntries(RULES.map((r) => [r.id, r]));

export interface RuleHit {
  ruleId: string;
  severity: Severity;
  personLine?: number;
  message: L;
  evidence: L;
}

const EVER_MARRIED = new Set(["MARRIED", "DIVORCED", "WIDOWED"]);

export function validateHousehold(hh: Household): RuleHit[] {
  const hits: RuleHit[] = [];
  const byLine = new Map(hh.members.map((p) => [p.line, p]));
  const heads = hh.members.filter((p) => p.relation === "HEAD");
  const head = heads[0];

  for (const p of hh.members) {
    const who = { en: `person ${p.line}`, ar: `الفرد ${p.line}` };
    if (p.age < 0 || p.age > 110)
      hits.push({ ruleId: "R01", severity: "CRITICAL", personLine: p.line, message: { en: `Age ${p.age} recorded for ${who.en}`, ar: `تسجيل العمر ${p.age} لـ${who.ar}` }, evidence: { en: `age = ${p.age}; plausible range 0–110`, ar: `العمر = ${p.age}؛ النطاق المعقول 0–110` } });

    const parents = [p.motherLine, p.fatherLine].filter((x): x is number => x !== undefined).map((l) => byLine.get(l)).filter(Boolean);
    if (!parents.length && p.relation === "CHILD" && head) parents.push(head);
    for (const par of parents) {
      if (!par) continue;
      const gap = par.age - p.age;
      if (gap <= 0)
        hits.push({ ruleId: "R02", severity: "CRITICAL", personLine: p.line, message: { en: `${who.en} (age ${p.age}) is older than or same age as parent (line ${par.line}, age ${par.age})`, ar: `${who.ar} (العمر ${p.age}) أكبر من أو بعمر الوالد (السطر ${par.line}، العمر ${par.age})` }, evidence: { en: `parent age − child age = ${gap}`, ar: `عمر الوالد − عمر الابن = ${gap}` } });
      else if (gap < 14 || (par.sex === "F" && gap > 55))
        hits.push({ ruleId: "R03", severity: "HIGH", personLine: p.line, message: { en: `Parent–child age gap of ${gap} years (lines ${par.line}→${p.line})`, ar: `فارق عمر ${gap} سنة بين الوالد والابن (السطور ${par.line}←${p.line})` }, evidence: { en: `gap = ${gap}; expected 14–55 for mothers`, ar: `الفارق = ${gap}؛ المتوقع 14–55 للأمهات` } });
    }
    if (EVER_MARRIED.has(p.marital) && p.age < 15)
      hits.push({ ruleId: "R04", severity: "HIGH", personLine: p.line, message: { en: `${who.en} aged ${p.age} recorded as ${p.marital.toLowerCase()}`, ar: `${who.ar} بعمر ${p.age} مسجل كـ"سبق له الزواج"` }, evidence: { en: `marital = ${p.marital}; age = ${p.age} (< 15)`, ar: `الحالة الزواجية = ${p.marital}؛ العمر = ${p.age} (< 15)` } });
    if ((p.employment === "EMPLOYED" || p.employment === "UNEMPLOYED") && p.age < 15)
      hits.push({ ruleId: "R05", severity: p.age < 12 ? "HIGH" : "MEDIUM", personLine: p.line, message: { en: `${who.en} aged ${p.age} recorded as ${p.employment.toLowerCase()}`, ar: `${who.ar} بعمر ${p.age} مسجل كمشتغل/متعطل` }, evidence: { en: `employment = ${p.employment}; working-age threshold 15`, ar: `الحالة العملية = ${p.employment}؛ حد سن العمل 15` } });
    if ((p.attainment === "BACHELOR" || p.attainment === "POSTGRAD") && p.age < 19)
      hits.push({ ruleId: "R11", severity: "MEDIUM", personLine: p.line, message: { en: `${who.en} aged ${p.age} reports ${p.attainment.toLowerCase()} degree`, ar: `${who.ar} بعمر ${p.age} يحمل مؤهلاً جامعياً` }, evidence: { en: `attainment = ${p.attainment}; minimum plausible age 19`, ar: `المؤهل = ${p.attainment}؛ أدنى عمر معقول 19` } });
    else if (p.attainment === "SECONDARY" && p.age < 16)
      hits.push({ ruleId: "R11", severity: "MEDIUM", personLine: p.line, message: { en: `${who.en} aged ${p.age} reports completed secondary`, ar: `${who.ar} بعمر ${p.age} أنهى الثانوية` }, evidence: { en: `attainment = SECONDARY; minimum plausible age 16`, ar: `المؤهل = ثانوي؛ أدنى عمر معقول 16` } });
  }

  if (heads.length !== 1)
    hits.push({ ruleId: "R07", severity: "HIGH", message: { en: heads.length === 0 ? "No household reference person recorded" : `${heads.length} household heads recorded`, ar: heads.length === 0 ? "لم يُسجّل رب للأسرة" : `تسجيل ${heads.length} أرباب للأسرة` }, evidence: { en: `roster relations: ${hh.members.map((m) => m.relation).join(", ")}`, ar: `العلاقات: ${hh.members.map((m) => m.relation).join("، ")}` } });
  else if (hh.members.some((p) => p.relation === "SPOUSE") && head.marital !== "MARRIED")
    hits.push({ ruleId: "R07", severity: "HIGH", message: { en: `Spouse listed but head is ${head.marital.toLowerCase()}`, ar: "يوجد زوج/زوجة ورب الأسرة غير متزوج" }, evidence: { en: `head marital = ${head.marital}`, ar: `الحالة الزواجية لرب الأسرة = ${head.marital}` } });
  if (head && head.age < 15)
    hits.push({ ruleId: "R12", severity: "HIGH", personLine: head.line, message: { en: `Household head aged ${head.age}`, ar: `رب الأسرة بعمر ${head.age}` }, evidence: { en: "head age < 15", ar: "عمر رب الأسرة < 15" } });
  if (hh.members.length >= 16)
    hits.push({ ruleId: "R08", severity: "MEDIUM", message: { en: `Household of ${hh.members.length} usual residents`, ar: `أسرة من ${hh.members.length} فرداً` }, evidence: { en: "size ≥ 16 — verify roster for non-usual residents", ar: "الحجم ≥ 16 — تحقق من وجود أفراد غير مقيمين عادة" } });
  if (hh.interviewMinutes < 6 || hh.interviewMinutes / Math.max(1, hh.members.length) < 1.5)
    hits.push({ ruleId: "R09", severity: "MEDIUM", message: { en: `Interview lasted ${hh.interviewMinutes} min for ${hh.members.length} persons`, ar: `استغرقت المقابلة ${hh.interviewMinutes} دقيقة لـ${hh.members.length} أفراد` }, evidence: { en: `${(hh.interviewMinutes / Math.max(1, hh.members.length)).toFixed(1)} min/person (threshold 1.5)`, ar: `${(hh.interviewMinutes / Math.max(1, hh.members.length)).toFixed(1)} دقيقة/فرد (العتبة 1.5)` } });
  return hits;
}

/** Roster signature used for identical-pattern detection. */
export function rosterSignature(hh: Household): string {
  return hh.members.map((p) => `${p.relation[0]}${p.sex}${p.age}`).join("|");
}

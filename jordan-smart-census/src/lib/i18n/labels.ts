/** Bilingual labels for categorical values. */
export const LABELS: Record<string, Record<string, [string, string]>> = {
  nationality: {
    JORDANIAN: ["Jordanian", "أردني"], SYRIAN: ["Syrian", "سوري"], EGYPTIAN: ["Egyptian", "مصري"], IRAQI: ["Iraqi", "عراقي"],
    OTHER_ARAB: ["Other Arab", "عربي آخر"], OTHER: ["Other nationality", "جنسية أخرى"],
  },
  hhType: {
    SINGLE: ["One person", "فرد واحد"], COUPLE: ["Couple only", "زوجان فقط"], NUCLEAR: ["Nuclear", "أسرة نووية"],
    SINGLE_PARENT: ["Single parent", "أحد الوالدين"], EXTENDED: ["Extended", "أسرة ممتدة"], COMPOSITE: ["Composite / non-relatives", "مركبة / غير أقارب"],
  },
  dwellingType: {
    APARTMENT: ["Apartment", "شقة"], HOUSE: ["House (dar)", "دار"], VILLA: ["Villa", "فيلا"], TRADITIONAL: ["Traditional house", "بيت تقليدي"],
    TENT_CARAVAN: ["Tent / caravan", "خيمة / كرفان"], OTHER: ["Other", "أخرى"],
  },
  tenure: { OWNED: ["Owned", "ملك"], RENTED: ["Rented", "إيجار"], EMPLOYER: ["Provided by employer", "مقدم من صاحب العمل"], FREE: ["Without rent", "بدون أجرة"], OTHER: ["Other", "أخرى"] },
  water: { PUBLIC_NETWORK: ["Public network", "الشبكة العامة"], TANKER: ["Tanker", "صهريج"], WELL_SPRING: ["Well / spring", "بئر / نبع"], OTHER: ["Other", "أخرى"] },
  sanitation: { PUBLIC_SEWER: ["Public sewer", "الصرف الصحي العام"], CESSPIT: ["Cesspit", "حفرة امتصاصية"], NONE: ["None", "لا يوجد"] },
  heating: { GAS: ["Gas heater", "مدفأة غاز"], KEROSENE: ["Kerosene / diesel", "كاز / سولار"], ELECTRIC: ["Electric", "كهربائية"], CENTRAL: ["Central heating", "تدفئة مركزية"], WOOD: ["Wood / coal", "حطب / فحم"], NONE: ["None", "لا يوجد"] },
  cooling: { AC: ["Air conditioning", "مكيف هواء"], FANS: ["Fans", "مراوح"], EVAPORATIVE: ["Evaporative cooler", "مبرد تبخيري"], NONE: ["None", "لا يوجد"] },
  employment: {
    EMPLOYED: ["Employed", "مشتغل"], UNEMPLOYED: ["Unemployed", "متعطل"], STUDENT: ["Student", "طالب"], HOMEMAKER: ["Homemaker", "متفرغ للأعمال المنزلية"],
    RETIRED: ["Retired", "متقاعد"], UNABLE: ["Unable to work", "غير قادر على العمل"], OTHER_INACTIVE: ["Other inactive", "غير نشط آخر"], NOT_APPLICABLE: ["Under 15", "دون 15 سنة"],
  },
  occupation: {
    MANAGERS: ["Managers", "المديرون"], PROFESSIONALS: ["Professionals", "الاختصاصيون"], TECHNICIANS: ["Technicians", "الفنيون"], CLERICAL: ["Clerical support", "الأعمال الكتابية"],
    SERVICE_SALES: ["Service & sales", "الخدمات والمبيعات"], AGRICULTURE: ["Agriculture", "الزراعة"], CRAFT: ["Craft & trades", "الحرف"], OPERATORS: ["Plant & machine operators", "مشغلو الآلات"],
    ELEMENTARY: ["Elementary occupations", "المهن الأولية"], ARMED_FORCES: ["Armed forces", "القوات المسلحة"],
  },
  sector: {
    AGRICULTURE: ["Agriculture", "الزراعة"], MANUFACTURING: ["Manufacturing", "الصناعات التحويلية"], CONSTRUCTION: ["Construction", "الإنشاءات"], TRADE: ["Wholesale & retail", "تجارة الجملة والتجزئة"],
    TRANSPORT: ["Transport & storage", "النقل والتخزين"], HOSPITALITY: ["Accommodation & food", "الإقامة والطعام"], ICT_FINANCE: ["ICT & finance", "الاتصالات والمالية"],
    PUBLIC_ADMIN: ["Public administration & defence", "الإدارة العامة والدفاع"], EDUCATION: ["Education", "التعليم"], HEALTH: ["Health & social work", "الصحة والعمل الاجتماعي"], OTHER_SERVICES: ["Other services", "خدمات أخرى"],
  },
  attainment: {
    NONE: ["None / illiterate", "لا شيء / أمي"], PRIMARY: ["Some basic", "أساسي غير مكتمل"], BASIC: ["Basic (grade 10)", "أساسي (الصف العاشر)"], SECONDARY: ["Secondary (Tawjihi)", "ثانوي (توجيهي)"],
    DIPLOMA: ["Intermediate diploma", "دبلوم متوسط"], BACHELOR: ["Bachelor", "بكالوريوس"], POSTGRAD: ["Postgraduate", "دراسات عليا"],
  },
  eduStatus: { NEVER_ATTENDED: ["Never attended", "لم يلتحق أبداً"], CURRENTLY_ENROLLED: ["Currently enrolled", "ملتحق حالياً"], LEFT_SCHOOL: ["Left education", "ترك التعليم"], NOT_APPLICABLE: ["Under 6", "دون 6 سنوات"] },
  wgDomain: { seeing: ["Seeing", "الرؤية"], hearing: ["Hearing", "السمع"], walking: ["Walking / climbing steps", "المشي / صعود الدرج"], cognition: ["Remembering / concentrating", "التذكر / التركيز"], selfcare: ["Self-care", "العناية الذاتية"], communication: ["Communicating", "التواصل"] },
  wgLevel: { "1": ["No difficulty", "لا صعوبة"], "2": ["Some difficulty", "بعض الصعوبة"], "3": ["A lot of difficulty", "صعوبة كبيرة"], "4": ["Cannot do at all", "لا يستطيع إطلاقاً"] },
  prevCountry: { SYRIA: ["Syria", "سوريا"], IRAQ: ["Iraq", "العراق"], GULF: ["Gulf states", "دول الخليج"], EGYPT: ["Egypt", "مصر"], OTHER_ARAB: ["Other Arab country", "دولة عربية أخرى"], OTHER: ["Other country", "دولة أخرى"] },
  moveReason: { WORK: ["Work", "العمل"], MARRIAGE: ["Marriage", "الزواج"], FAMILY: ["Accompanying family", "مرافقة الأسرة"], EDUCATION: ["Education", "التعليم"], HOUSING: ["Housing", "السكن"], SECURITY: ["Security / displacement", "الأمن / النزوح"], OTHER: ["Other", "أخرى"] },
  relation: {
    HEAD: ["Household head", "رب الأسرة"], SPOUSE: ["Spouse", "زوج/زوجة"], CHILD: ["Son / daughter", "ابن / ابنة"], GRANDCHILD: ["Grandchild", "حفيد/حفيدة"],
    PARENT: ["Parent", "أب / أم"], SIBLING: ["Brother / sister", "أخ / أخت"], OTHER_RELATIVE: ["Other relative", "قريب آخر"], NON_RELATIVE: ["Non-relative", "من غير الأقارب"],
  },
  marital: { NEVER_MARRIED: ["Never married", "لم يتزوج أبداً"], MARRIED: ["Married", "متزوج"], DIVORCED: ["Divorced", "مطلق"], WIDOWED: ["Widowed", "أرمل"] },
  sex: { M: ["Male", "ذكر"], F: ["Female", "أنثى"] },
  occupancy: { OCCUPIED: ["Occupied", "مشغول"], VACANT: ["Vacant", "شاغر"], UNDER_CONSTRUCTION: ["Under construction", "قيد الإنشاء"], NON_RESIDENTIAL: ["Non-residential", "غير سكني"] },
  issueStatus: { OPEN: ["Open", "مفتوح"], ASSIGNED: ["Assigned", "مُسند"], INVESTIGATING: ["Investigating", "قيد التحقيق"], REVISIT_REQUESTED: ["Revisit requested", "طُلبت زيارة متابعة"], RESOLVED: ["Resolved", "محلول"], DISMISSED: ["Dismissed", "مستبعد"] },
  anomalyKind: {
    PRODUCTIVITY_OUTLIER: ["Productivity outlier", "إنتاجية شاذة"], SHORT_INTERVIEWS: ["Short interviews", "مقابلات قصيرة"], HOUSEHOLD_SIZE_HEAPING: ["Household-size heaping", "تكدّس حجم الأسرة"],
    REFUSAL_CLUSTER: ["Refusal cluster", "تركّز الرفض"], OCCUPANCY_SHORTFALL: ["Occupancy shortfall", "نقص المساكن المشغولة"], GPS_MISMATCH: ["GPS mismatch", "عدم تطابق GPS"],
    DUPLICATE_PATTERN: ["Duplicate roster pattern", "نمط قوائم مكرر"], COVERAGE_LAG: ["District behind schedule", "لواء متأخر عن الجدول"],
  },
  anomalyMethod: { RULE: ["Rule threshold", "عتبة قاعدة"], Z_SCORE: ["Z-score vs peers", "درجة معيارية مقارنة بالأقران"], IQR: ["IQR fence", "حد المدى الربيعي"], PATTERN: ["Pattern recognition", "التعرف على الأنماط"] },
  decision: { CONFIRMED_REVISIT: ["Confirmed — verification revisits", "مؤكد — زيارات تحقق"], ASSIGNED_SUPERVISOR: ["Assigned to supervisor", "أُسند للمشرف"], DISMISSED: ["Dismissed", "مستبعد"], ESCALATED: ["Escalated", "مُصعّد"] },
  alertType: {
    COVERAGE_GAP: ["Coverage gap", "فجوة تغطية"], UNUSUAL_PERFORMANCE: ["Unusual enumerator performance", "أداء غير معتاد للعدّاد"], HIGH_REFUSAL: ["High refusal rate", "نسبة رفض مرتفعة"],
    POTENTIAL_DUPLICATE: ["Potential duplicate household", "أسرة مكررة محتملة"], DURATION_ANOMALY: ["Interview duration anomaly", "شذوذ مدة المقابلة"], DISTRICT_BEHIND: ["District behind schedule", "لواء متأخر عن الجدول"],
    DEVICE_OFFLINE: ["Device offline", "جهاز غير متصل"], SUPERVISOR_REVIEW: ["Supervisor review required", "مطلوب مراجعة المشرف"], PES_COVERAGE: ["PES coverage concern", "مخاوف تغطية من مسح ما بعد العدّ"],
  },
  profileKind: {
    STANDARD: ["Standard", "قياسي"], FAST: ["Fast", "سريع"], SLOW: ["Slow", "بطيء"], FABRICATION_RISK: ["Fabrication risk", "خطر تلفيق"],
    HIGH_REFUSAL: ["High refusal", "رفض مرتفع"], DEVICE_ISSUES: ["Device issues", "مشكلات جهاز"], GPS_DRIFT: ["GPS drift", "انحراف GPS"],
  },
  region: { North: ["North", "الشمال"], Central: ["Central", "الوسط"], South: ["South", "الجنوب"] },
  preset: {
    BASELINE: ["Baseline", "خط الأساس"], HIGH_GROWTH: ["High growth", "نمو مرتفع"], LOW_GROWTH: ["Low growth", "نمو منخفض"], MIGRATION_SHOCK: ["Migration shock", "صدمة هجرة"],
    YOUTH_PRESSURE: ["Youth pressure", "ضغط الشباب"], AGEING: ["Ageing population", "شيخوخة السكان"], CUSTOM: ["Custom scenario", "سيناريو مخصص"],
  },
  planName: { LEAN: ["Lean", "مقتصد"], BASE: ["Base", "أساسي"], ACCELERATED: ["Accelerated", "متسارع"] },
};

export function label(group: string, key: string | number, locale: "en" | "ar"): string {
  const v = LABELS[group]?.[String(key)];
  if (!v) return String(key);
  return locale === "ar" ? v[1] : v[0];
}

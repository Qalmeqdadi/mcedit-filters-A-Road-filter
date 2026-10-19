/**
 * NATIONAL INDICATOR REGISTRY — the single list of what the Kingdom's Macro–Micro Dashboard reports,
 * who is accountable for supplying each figure, how often, and what UFUQ could actually obtain.
 *
 * Every value carries a status:
 *   OFFICIAL       machine-read from an official Jordanian file or API (DoS PxWeb, DoS release tables), checksummed
 *   REPORTED       an official figure as published in an official release or document, transcribed (not machine-read)
 *   DERIVED        computed by UFUQ from official figures (rates from counts, densities, residuals) — not published as such
 *   INTERNATIONAL  compiled or modelled by an international body (World Bank WDI, ILO models, UNHCR)
 *   MISSING        no public figure found in open channels → a data request is raised to the accountable entity
 *
 * Freshness and entity scorecards are computed against PROPOSED service levels (not existing obligations) and
 * describe only what was found in open channels on the snapshot date — they are not an audit of any entity.
 */
import type { GovId, L } from "@/types/census";
import { NATIONAL_DATA } from "./national.generated";
import { GOV_LABOUR } from "./governorates.generated";

export type Status = "OFFICIAL" | "REPORTED" | "DERIVED" | "INTERNATIONAL" | "MISSING";
export type Pillar = "ECONOMY" | "FISCAL" | "LABOUR" | "POPULATION" | "SOCIAL" | "INFRA";
export type Freq = "M" | "Q" | "A" | "5Y";
export type Channel = "API" | "FILES" | "PDF" | "NONE";
export type Freshness = "CURRENT" | "LATE" | "STALE" | "MISSING";

export const GOVS: GovId[] = ["AMM", "IRB", "ZAR", "BAL", "MAF", "JER", "AJL", "MAD", "KAR", "TAF", "MAN", "AQB"];

/** Snapshot date: when the open-data connectors last ran. */
export const AS_OF = NATIONAL_DATA.fetchedAt.slice(0, 10);

export const STATUS_LABEL: Record<Status, L> = {
  OFFICIAL: { en: "Official", ar: "رسمي" },
  REPORTED: { en: "Reported", ar: "منشور" },
  DERIVED: { en: "Derived", ar: "مشتق" },
  INTERNATIONAL: { en: "International", ar: "دولي" },
  MISSING: { en: "Missing", ar: "غير متاح" },
};
export const STATUS_HELP: Record<Status, L> = {
  OFFICIAL: { en: "Machine-read from an official Jordanian file or API, with checksum.", ar: "مقروء آلياً من ملف أو واجهة رسمية أردنية مع بصمة تحقق." },
  REPORTED: { en: "Official figure transcribed from an official release or document.", ar: "رقم رسمي منقول من إصدار أو وثيقة رسمية." },
  DERIVED: { en: "Computed by UFUQ from official figures — not published as such.", ar: "محسوب في أفق من أرقام رسمية — غير منشور بهذه الصيغة." },
  INTERNATIONAL: { en: "Compiled or modelled by an international body (World Bank, ILO, UNHCR).", ar: "مجمّع أو مقدّر من جهة دولية (البنك الدولي، منظمة العمل الدولية، المفوضية)." },
  MISSING: { en: "No public figure found — requested from the accountable entity.", ar: "لا يوجد رقم منشور — مطلوب من الجهة المسؤولة." },
};
export const FRESH_LABEL: Record<Freshness, L> = {
  CURRENT: { en: "Current", ar: "محدّث" },
  LATE: { en: "Late", ar: "متأخر" },
  STALE: { en: "Stale", ar: "قديم" },
  MISSING: { en: "Missing", ar: "غير متاح" },
};
export const PILLAR_LABEL: Record<Pillar, L> = {
  ECONOMY: { en: "Economy & external", ar: "الاقتصاد والقطاع الخارجي" },
  FISCAL: { en: "Public finance & debt", ar: "المالية العامة والدين" },
  LABOUR: { en: "Labour market", ar: "سوق العمل" },
  POPULATION: { en: "Population", ar: "السكان" },
  SOCIAL: { en: "Education, health & poverty", ar: "التعليم والصحة والفقر" },
  INFRA: { en: "Water, energy, environment & connectivity", ar: "المياه والطاقة والبيئة والاتصال" },
};
export const PILLARS: Pillar[] = ["ECONOMY", "FISCAL", "LABOUR", "POPULATION", "SOCIAL", "INFRA"];
export const FREQ_LABEL: Record<Freq, L> = { M: { en: "Monthly", ar: "شهري" }, Q: { en: "Quarterly", ar: "ربعي" }, A: { en: "Annual", ar: "سنوي" }, "5Y": { en: "Five-yearly", ar: "كل خمس سنوات" } };

// ───────────────────────────── entities ─────────────────────────────

export interface Entity {
  id: string;
  short: L;
  name: L;
  kind: "OWNER" | "CENTRE" | "AUTHORITY" | "MINISTRY" | "AGENCY" | "LOCAL" | "EXTERNAL";
  role: L;
  channel: { type: Channel; label: string; url?: string };
}

export const ENTITIES: Entity[] = [
  { id: "RHC", short: { en: "RHC", ar: "الديوان" }, name: { en: "Royal Hashemite Court (proposed owner)", ar: "الديوان الملكي الهاشمي (المالك المقترح)" }, kind: "OWNER", role: { en: "Proposed owner and convenor: sets the national indicator priorities, receives the dashboard and holds the data agreement with every entity.", ar: "المالك والجهة الداعية المقترحة: تحدد أولويات المؤشرات الوطنية وتتسلم اللوحة وتدير اتفاقية البيانات مع كل جهة." }, channel: { type: "NONE", label: "—" } },
  { id: "PMDU", short: { en: "PM Delivery", ar: "متابعة التنفيذ" }, name: { en: "Prime Ministry — delivery and performance follow-up", ar: "رئاسة الوزراء — متابعة التنفيذ والأداء" }, kind: "CENTRE", role: { en: "Government-side counterpart: links indicators to the Economic Modernisation Vision executive programme and reports progress on projects.", ar: "النظير الحكومي: يربط المؤشرات بالبرنامج التنفيذي لرؤية التحديث الاقتصادي ويرفع تقدم المشاريع." }, channel: { type: "PDF", label: "Progress reports", url: "https://www.pm.gov.jo" } },
  { id: "DOS", short: { en: "DoS", ar: "الإحصاءات" }, name: { en: "Department of Statistics", ar: "دائرة الإحصاءات العامة" }, kind: "AUTHORITY", role: { en: "National statistical authority (General Statistics Law No. 12 of 2012): validates every figure, owns population, prices, national accounts, labour force and household surveys.", ar: "السلطة الإحصائية الوطنية (قانون الإحصاءات العامة رقم 12 لسنة 2012): تعتمد كل رقم، ومسؤولة عن السكان والأسعار والحسابات القومية والقوى العاملة ومسوح الأسر." }, channel: { type: "API", label: "PxWeb databank (jorinfo.dos.gov.jo)", url: "https://jorinfo.dos.gov.jo/Databank/pxweb/en/" } },
  { id: "CBJ", short: { en: "CBJ", ar: "المركزي" }, name: { en: "Central Bank of Jordan", ar: "البنك المركزي الأردني" }, kind: "AUTHORITY", role: { en: "Monetary, banking and balance-of-payments statistics; reserves, remittances, FDI.", ar: "الإحصاءات النقدية والمصرفية وميزان المدفوعات؛ الاحتياطيات والحوالات والاستثمار الأجنبي." }, channel: { type: "FILES", label: "Statistical database (Excel)", url: "https://www.cbj.gov.jo" } },
  { id: "MOF", short: { en: "MoF", ar: "المالية" }, name: { en: "Ministry of Finance", ar: "وزارة المالية" }, kind: "MINISTRY", role: { en: "Government finance and public debt (General Government Finance Bulletin).", ar: "مالية الحكومة والدين العام (نشرة مالية الحكومة العامة)." }, channel: { type: "FILES", label: "Monthly bulletin", url: "https://www.mof.gov.jo" } },
  { id: "MOPIC", short: { en: "MoPIC", ar: "التخطيط" }, name: { en: "Ministry of Planning and International Cooperation", ar: "وزارة التخطيط والتعاون الدولي" }, kind: "MINISTRY", role: { en: "Development assistance, capital programme and governorate development plans.", ar: "المساعدات التنموية والبرنامج الرأسمالي وخطط تنمية المحافظات." }, channel: { type: "PDF", label: "Reports", url: "https://www.mop.gov.jo" } },
  { id: "MOL", short: { en: "MoL", ar: "العمل" }, name: { en: "Ministry of Labour", ar: "وزارة العمل" }, kind: "MINISTRY", role: { en: "Work permits, employment programmes, labour inspection.", ar: "تصاريح العمل وبرامج التشغيل والتفتيش." }, channel: { type: "PDF", label: "Annual report", url: "https://www.mol.gov.jo" } },
  { id: "MOE", short: { en: "MoE", ar: "التربية" }, name: { en: "Ministry of Education", ar: "وزارة التربية والتعليم" }, kind: "MINISTRY", role: { en: "Schools, students, teachers and classrooms by directorate (OpenEMIS).", ar: "المدارس والطلبة والمعلمون والغرف الصفية حسب المديرية (OpenEMIS)." }, channel: { type: "PDF", label: "Statistical report", url: "https://www.moe.gov.jo" } },
  { id: "MOHE", short: { en: "MoHE", ar: "التعليم العالي" }, name: { en: "Ministry of Higher Education and Scientific Research", ar: "وزارة التعليم العالي والبحث العلمي" }, kind: "MINISTRY", role: { en: "University enrolment and graduates by field.", ar: "الالتحاق الجامعي والخريجون حسب التخصص." }, channel: { type: "PDF", label: "Statistics", url: "https://www.mohe.gov.jo" } },
  { id: "MOH", short: { en: "MoH", ar: "الصحة" }, name: { en: "Ministry of Health", ar: "وزارة الصحة" }, kind: "MINISTRY", role: { en: "Hospitals, beds, health centres and health workforce by governorate (Health Statistical Yearbook).", ar: "المستشفيات والأسرّة والمراكز الصحية والكوادر حسب المحافظة (الكتاب الإحصائي الصحي)." }, channel: { type: "PDF", label: "Statistical yearbook", url: "https://www.moh.gov.jo" } },
  { id: "MWI", short: { en: "MWI", ar: "المياه" }, name: { en: "Ministry of Water and Irrigation", ar: "وزارة المياه والري" }, kind: "MINISTRY", role: { en: "Water supplied per person, non-revenue water and wastewater coverage by governorate.", ar: "حصة الفرد من المياه والفاقد وتغطية الصرف الصحي حسب المحافظة." }, channel: { type: "PDF", label: "Water budget", url: "https://www.mwi.gov.jo" } },
  { id: "MEMR", short: { en: "MEMR", ar: "الطاقة" }, name: { en: "Ministry of Energy and Mineral Resources", ar: "وزارة الطاقة والثروة المعدنية" }, kind: "MINISTRY", role: { en: "Energy balance, electricity consumption and renewables.", ar: "ميزان الطاقة واستهلاك الكهرباء والطاقة المتجددة." }, channel: { type: "PDF", label: "Annual report", url: "https://www.memr.gov.jo" } },
  { id: "MOENV", short: { en: "MoEnv", ar: "البيئة" }, name: { en: "Ministry of Environment", ar: "وزارة البيئة" }, kind: "MINISTRY", role: { en: "Air quality, emissions inventory, waste.", ar: "جودة الهواء وجرد الانبعاثات والنفايات." }, channel: { type: "PDF", label: "Reports", url: "https://www.moenv.gov.jo" } },
  { id: "MOLA", short: { en: "MoLA", ar: "الإدارة المحلية" }, name: { en: "Ministry of Local Administration", ar: "وزارة الإدارة المحلية" }, kind: "MINISTRY", role: { en: "Municipal finance and services for 100 municipalities; the proposed Municipal Urban Development Observatory.", ar: "المالية والخدمات البلدية لمئة بلدية؛ والمرصد الحضري البلدي المقترح." }, channel: { type: "NONE", label: "—", url: "https://www.mola.gov.jo" } },
  { id: "GAM", short: { en: "GAM", ar: "الأمانة" }, name: { en: "Greater Amman Municipality", ar: "أمانة عمّان الكبرى" }, kind: "LOCAL", role: { en: "City data for Amman (permits, transport, services).", ar: "بيانات مدينة عمّان (الرخص والنقل والخدمات)." }, channel: { type: "FILES", label: "Open data portal", url: "https://www.ammancity.gov.jo" } },
  { id: "ASEZA", short: { en: "ASEZA", ar: "سلطة العقبة" }, name: { en: "Aqaba Special Economic Zone Authority", ar: "سلطة منطقة العقبة الاقتصادية الخاصة" }, kind: "LOCAL", role: { en: "Zone data for Aqaba (investment, permits, services).", ar: "بيانات منطقة العقبة (الاستثمار والرخص والخدمات)." }, channel: { type: "PDF", label: "Reports", url: "https://aseza.jo" } },
  { id: "MOI", short: { en: "MoI", ar: "الداخلية" }, name: { en: "Ministry of Interior", ar: "وزارة الداخلية" }, kind: "MINISTRY", role: { en: "Refugee and migration administration with UNHCR.", ar: "إدارة شؤون اللاجئين والهجرة مع المفوضية." }, channel: { type: "NONE", label: "—" } },
  { id: "CSPD", short: { en: "CSPD", ar: "الأحوال المدنية" }, name: { en: "Civil Status and Passports Department", ar: "دائرة الأحوال المدنية والجوازات" }, kind: "AGENCY", role: { en: "Registered births, deaths and marriages by governorate.", ar: "المواليد والوفيات وعقود الزواج المسجلة حسب المحافظة." }, channel: { type: "PDF", label: "Annual statistics", url: "https://www.cspd.gov.jo" } },
  { id: "HPC", short: { en: "HPC", ar: "المجلس الأعلى للسكان" }, name: { en: "Higher Population Council", ar: "المجلس الأعلى للسكان" }, kind: "AGENCY", role: { en: "Population policy, demographic indicators and the demographic window.", ar: "السياسة السكانية والمؤشرات الديموغرافية والفرصة السكانية." }, channel: { type: "PDF", label: "Indicator sheets", url: "https://www.hpc.org.jo" } },
  { id: "MODEE", short: { en: "MoDEE", ar: "الاقتصاد الرقمي" }, name: { en: "Ministry of Digital Economy and Entrepreneurship", ar: "وزارة الاقتصاد الرقمي والريادة" }, kind: "MINISTRY", role: { en: "Government data exchange and the open data portal: the technical channel through which entities deliver data.", ar: "تبادل البيانات الحكومية وبوابة البيانات المفتوحة: القناة الفنية لتسليم البيانات." }, channel: { type: "API", label: "Open data portal", url: "https://portal.jordan.gov.jo" } },
  { id: "TRC", short: { en: "TRC", ar: "الاتصالات" }, name: { en: "Telecommunications Regulatory Commission", ar: "هيئة تنظيم قطاع الاتصالات" }, kind: "AGENCY", role: { en: "Broadband and mobile subscriptions.", ar: "اشتراكات النطاق العريض والهاتف المتنقل." }, channel: { type: "FILES", label: "Market indicators", url: "https://trc.gov.jo" } },
  { id: "MOT", short: { en: "MoT", ar: "النقل" }, name: { en: "Ministry of Transport", ar: "وزارة النقل" }, kind: "MINISTRY", role: { en: "Transport and logistics performance.", ar: "أداء النقل والخدمات اللوجستية." }, channel: { type: "PDF", label: "Reports", url: "https://www.mot.gov.jo" } },
  { id: "MOTA", short: { en: "MoTA", ar: "السياحة" }, name: { en: "Ministry of Tourism and Antiquities", ar: "وزارة السياحة والآثار" }, kind: "MINISTRY", role: { en: "Visitors, tourism receipts and hotel capacity.", ar: "الزوار والدخل السياحي والطاقة الفندقية." }, channel: { type: "FILES", label: "Statistics", url: "https://www.mota.gov.jo" } },
  { id: "IEC", short: { en: "IEC", ar: "الهيئة المستقلة" }, name: { en: "Independent Election Commission", ar: "الهيئة المستقلة للانتخاب" }, kind: "AGENCY", role: { en: "Electoral participation and representation.", ar: "المشاركة والتمثيل الانتخابي." }, channel: { type: "PDF", label: "Results", url: "https://iec.jo" } },
  { id: "SSC", short: { en: "SSC", ar: "الضمان" }, name: { en: "Social Security Corporation", ar: "المؤسسة العامة للضمان الاجتماعي" }, kind: "AGENCY", role: { en: "Insured workers and formal employment by governorate.", ar: "المؤمن عليهم والعمالة المنظمة حسب المحافظة." }, channel: { type: "PDF", label: "Annual report", url: "https://www.ssc.gov.jo" } },
  { id: "NAF", short: { en: "NAF", ar: "المعونة" }, name: { en: "National Aid Fund", ar: "صندوق المعونة الوطنية" }, kind: "AGENCY", role: { en: "Cash-assistance beneficiaries by governorate.", ar: "المستفيدون من المعونات النقدية حسب المحافظة." }, channel: { type: "PDF", label: "Reports", url: "https://naf.gov.jo" } },
  { id: "PSD", short: { en: "PSD", ar: "الأمن العام" }, name: { en: "Public Security Directorate", ar: "مديرية الأمن العام" }, kind: "AGENCY", role: { en: "Road traffic crashes and fatalities by governorate.", ar: "حوادث السير والوفيات حسب المحافظة." }, channel: { type: "PDF", label: "Traffic report", url: "https://www.psd.gov.jo" } },
  { id: "UNHCR", short: { en: "UNHCR", ar: "المفوضية" }, name: { en: "UNHCR Jordan (external partner)", ar: "المفوضية السامية للأمم المتحدة لشؤون اللاجئين (شريك خارجي)" }, kind: "EXTERNAL", role: { en: "Registered refugees and asylum-seekers, by governorate and camp.", ar: "اللاجئون وطالبو اللجوء المسجلون حسب المحافظة والمخيم." }, channel: { type: "API", label: "Operational Data Portal", url: "https://data.unhcr.org/en/country/jor" } },
];
export const entity = (id: string) => ENTITIES.find((e) => e.id === id)!;

// ───────────────────────────── indicators ─────────────────────────────

export interface Source { name: string; url?: string; retrieved?: string; sha?: string }

export interface Indicator {
  id: string;
  level: "MACRO" | "MICRO";
  pillar: Pillar;
  name: L;
  unit: L;
  owner: string;
  freq: Freq;
  status: Status;
  /** latest period label ("2025", "2026-Q2", "end-2025") and its end date */
  period?: string;
  periodEnd?: string;
  value?: number;
  series?: [number, number][];
  quarterly?: [string, number][];
  byGov?: Partial<Record<GovId, number>>;
  govStatus?: Partial<Record<GovId, Status>>;
  govSeries?: Partial<Record<GovId, [number, number][]>>;
  source: Source;
  note?: L;
  /** display: value ÷ scale, decimals */
  scale?: number;
  dp?: number;
  better?: "up" | "down";
  headline?: boolean;
}

/** Short bilingual names and display rules for the World Bank WDI series in the registry. */
const WDI: Record<string, [string, string, string, string, number?, number?, ("up" | "down")?]> = {
  // code: [en, ar, unit en, unit ar, scale, dp, better]
  "ny.gdp.mktp.cd": ["GDP, current prices", "الناتج المحلي الإجمالي بالأسعار الجارية", "US$ bn", "مليار دولار", 1e9, 1, "up"],
  "ny.gdp.mktp.kd.zg": ["Real GDP growth", "نمو الناتج المحلي الحقيقي", "%", "%", 1, 1, "up"],
  "ny.gdp.pcap.cd": ["GDP per person", "نصيب الفرد من الناتج", "US$", "دولار", 1, 0, "up"],
  "ny.gdp.pcap.kd.zg": ["Real GDP per person growth", "نمو نصيب الفرد الحقيقي", "%", "%", 1, 1, "up"],
  "ny.gdp.pcap.pp.cd": ["GDP per person, PPP", "نصيب الفرد من الناتج بتعادل القوة الشرائية", "int. $", "دولار دولي", 1, 0, "up"],
  "ny.gnp.pcap.cd": ["GNI per person (Atlas)", "نصيب الفرد من الدخل القومي (أطلس)", "US$", "دولار", 1, 0, "up"],
  "fp.cpi.totl.zg": ["Consumer price inflation", "التضخم في أسعار المستهلك", "%", "%", 1, 1, "down"],
  "ne.gdi.totl.zs": ["Gross capital formation", "التكوين الرأسمالي الإجمالي", "% of GDP", "% من الناتج", 1, 1, "up"],
  "nv.agr.totl.zs": ["Agriculture value added", "القيمة المضافة للزراعة", "% of GDP", "% من الناتج", 1, 1],
  "nv.ind.totl.zs": ["Industry value added (incl. construction)", "القيمة المضافة للصناعة (مع الإنشاءات)", "% of GDP", "% من الناتج", 1, 1],
  "ne.exp.gnfs.zs": ["Exports of goods and services", "صادرات السلع والخدمات", "% of GDP", "% من الناتج", 1, 1, "up"],
  "ne.imp.gnfs.zs": ["Imports of goods and services", "مستوردات السلع والخدمات", "% of GDP", "% من الناتج", 1, 1],
  "bn.cab.xoka.cd": ["Current account balance", "رصيد الحساب الجاري", "US$ bn", "مليار دولار", 1e9, 2, "up"],
  "bx.klt.dinv.cd.wd": ["Foreign direct investment, net inflows", "صافي تدفقات الاستثمار الأجنبي المباشر", "US$ bn", "مليار دولار", 1e9, 2, "up"],
  "bx.trf.pwkr.cd.dt": ["Remittances received", "حوالات العاملين المستلمة", "US$ bn", "مليار دولار", 1e9, 2, "up"],
  "fi.res.totl.cd": ["Foreign reserves (incl. gold)", "الاحتياطيات الأجنبية (مع الذهب)", "US$ bn", "مليار دولار", 1e9, 1, "up"],
  "fr.inr.lend": ["Lending interest rate", "سعر فائدة الإقراض", "%", "%", 1, 2, "down"],
  "st.int.rcpt.xp.zs": ["Tourism receipts", "الدخل السياحي", "% of exports", "% من الصادرات", 1, 1, "up"],
  "dt.oda.odat.cd": ["Net development assistance received", "صافي المساعدات التنموية المستلمة", "US$ bn", "مليار دولار", 1e9, 2],
  "gc.dod.totl.gd.zs": ["Central government debt", "دين الحكومة المركزية", "% of GDP", "% من الناتج", 1, 1, "down"],
  "gc.rev.xgrt.gd.zs": ["Revenue excluding grants", "الإيرادات دون المنح", "% of GDP", "% من الناتج", 1, 1, "up"],
  "gc.tax.totl.gd.zs": ["Tax revenue", "الإيرادات الضريبية", "% of GDP", "% من الناتج", 1, 1, "up"],
  "gc.xpn.totl.gd.zs": ["Government expense", "النفقات الحكومية", "% of GDP", "% من الناتج", 1, 1],
  "gc.nld.totl.gd.zs": ["Fiscal balance (net lending/borrowing)", "الرصيد المالي (صافي الإقراض/الاقتراض)", "% of GDP", "% من الناتج", 1, 1, "up"],
  "dt.dod.dect.cd": ["External debt stock", "رصيد الدين الخارجي", "US$ bn", "مليار دولار", 1e9, 1, "down"],
  "dt.dod.dect.gn.zs": ["External debt", "الدين الخارجي", "% of GNI", "% من الدخل القومي", 1, 1, "down"],
  "sl.uem.totl.zs": ["Unemployment, total (ILO model)", "البطالة الكلية (تقدير منظمة العمل)", "%", "%", 1, 1, "down"],
  "sl.uem.totl.fe.zs": ["Unemployment, women (ILO model)", "بطالة الإناث (تقدير منظمة العمل)", "%", "%", 1, 1, "down"],
  "sl.uem.totl.ma.zs": ["Unemployment, men (ILO model)", "بطالة الذكور (تقدير منظمة العمل)", "%", "%", 1, 1, "down"],
  "sl.uem.1524.fe.zs": ["Youth unemployment, women 15–24 (ILO model)", "بطالة الشابات 15–24 (تقدير منظمة العمل)", "%", "%", 1, 1, "down"],
  "sl.uem.1524.ma.zs": ["Youth unemployment, men 15–24 (ILO model)", "بطالة الشبان 15–24 (تقدير منظمة العمل)", "%", "%", 1, 1, "down"],
  "sl.tlf.cact.fe.zs": ["Labour force participation, women", "مشاركة الإناث في القوى العاملة", "% of 15+", "% من 15+", 1, 1, "up"],
  "sl.tlf.cact.ma.zs": ["Labour force participation, men", "مشاركة الذكور في القوى العاملة", "% of 15+", "% من 15+", 1, 1, "up"],
  "sl.tlf.totl.in": ["Labour force", "القوى العاملة", "million", "مليون", 1e6, 2, "up"],
  "sl.emp.totl.sp.zs": ["Employment-to-population ratio", "نسبة العاملين إلى السكان", "% of 15+", "% من 15+", 1, 1, "up"],
  "sp.pop.totl": ["Population (World Bank estimate)", "السكان (تقدير البنك الدولي)", "million", "مليون", 1e6, 2],
  "sp.pop.grow": ["Population growth (World Bank)", "النمو السكاني (البنك الدولي)", "%", "%", 1, 2],
  "sp.urb.totl.in.zs": ["Urban population", "سكان الحضر", "%", "%", 1, 1],
  "sp.dyn.tfrt.in": ["Total fertility rate", "معدل الخصوبة الكلي", "births per woman", "مولود لكل امرأة", 1, 2],
  "sp.dyn.le00.in": ["Life expectancy at birth", "العمر المتوقع عند الولادة", "years", "سنة", 1, 1, "up"],
  "sp.dyn.cbrt.in": ["Crude birth rate", "معدل المواليد الخام", "per 1,000", "لكل 1,000", 1, 1],
  "sp.dyn.cdrt.in": ["Crude death rate", "معدل الوفيات الخام", "per 1,000", "لكل 1,000", 1, 1],
  "sp.pop.0014.to.zs": ["Population aged 0–14", "السكان 0–14 سنة", "%", "%", 1, 1],
  "sp.pop.1564.to.zs": ["Population aged 15–64", "السكان 15–64 سنة", "%", "%", 1, 1],
  "sp.pop.65up.to.zs": ["Population aged 65+", "السكان 65 سنة فأكثر", "%", "%", 1, 1],
  "sp.pop.dpnd": ["Age dependency ratio", "نسبة الإعالة العمرية", "% of 15–64", "% من 15–64", 1, 1, "down"],
  "sm.pop.refg": ["Refugee population (UNHCR/UNRWA, WDI)", "اللاجئون (المفوضية/الأونروا، البنك الدولي)", "million", "مليون", 1e6, 2],
  "sm.pop.netm": ["Net migration", "صافي الهجرة", "thousand", "ألف", 1e3, 0],
  "en.pop.dnst": ["Population density", "الكثافة السكانية", "per km²", "لكل كم²", 1, 0],
  "si.pov.gini": ["Income inequality (Gini)", "عدم المساواة في الدخل (جيني)", "index", "مؤشر", 1, 1, "down"],
  "si.pov.nahc": ["Poverty rate (national line)", "معدل الفقر (خط الفقر الوطني)", "% of people", "% من السكان", 1, 1, "down"],
  "se.pre.enrr": ["Pre-primary enrolment (gross)", "الالتحاق برياض الأطفال (إجمالي)", "%", "%", 1, 1, "up"],
  "se.prm.enrr": ["Primary enrolment (gross)", "الالتحاق بالتعليم الأساسي (إجمالي)", "%", "%", 1, 1, "up"],
  "se.sec.enrr": ["Secondary enrolment (gross)", "الالتحاق بالتعليم الثانوي (إجمالي)", "%", "%", 1, 1, "up"],
  "se.ter.enrr": ["Tertiary enrolment (gross)", "الالتحاق بالتعليم العالي (إجمالي)", "%", "%", 1, 1, "up"],
  "se.xpd.totl.gd.zs": ["Public spending on education", "الإنفاق العام على التعليم", "% of GDP", "% من الناتج", 1, 1, "up"],
  "se.adt.litr.zs": ["Adult literacy", "معدل معرفة القراءة والكتابة للبالغين", "%", "%", 1, 1, "up"],
  "sh.med.beds.zs": ["Hospital beds", "أسرّة المستشفيات", "per 1,000", "لكل 1,000", 1, 2, "up"],
  "sh.dyn.mort": ["Under-5 mortality", "وفيات الأطفال دون الخامسة", "per 1,000 births", "لكل 1,000 مولود", 1, 1, "down"],
  "sh.sta.mmrt": ["Maternal mortality (modelled)", "وفيات الأمهات (تقدير)", "per 100,000 births", "لكل 100,000 مولود", 1, 0, "down"],
  "sh.sta.stnt.zs": ["Child stunting", "التقزم لدى الأطفال", "% under 5", "% دون الخامسة", 1, 1, "down"],
  "sh.sta.diab.zs": ["Diabetes prevalence (20–79)", "انتشار السكري (20–79)", "%", "%", 1, 1, "down"],
  "sp.dyn.imrt.in": ["Infant mortality", "وفيات الرضع", "per 1,000 births", "لكل 1,000 مولود", 1, 1, "down"],
  "sg.gen.parl.zs": ["Women in parliament", "النساء في مجلس النواب", "% of seats", "% من المقاعد", 1, 1, "up"],
  "eg.use.elec.kh.pc": ["Electricity use per person", "استهلاك الكهرباء للفرد", "kWh", "كيلوواط ساعة", 1, 0],
  "eg.elc.accs.zs": ["Access to electricity", "الوصول إلى الكهرباء", "% of people", "% من السكان", 1, 1, "up"],
  "eg.elc.rnew.zs": ["Renewable share of electricity output", "حصة المتجددة من إنتاج الكهرباء", "%", "%", 1, 1, "up"],
  "eg.fec.rnew.zs": ["Renewable share of final energy", "حصة المتجددة من الاستهلاك النهائي", "%", "%", 1, 1, "up"],
  "eg.imp.cons.zs": ["Net energy imports", "صافي مستوردات الطاقة", "% of use", "% من الاستخدام", 1, 1, "down"],
  "er.h2o.intr.pc": ["Renewable freshwater per person", "المياه العذبة المتجددة للفرد", "m³ / year", "م³ سنوياً", 1, 0, "up"],
  "er.h2o.fwtl.zs": ["Freshwater withdrawals", "سحب المياه العذبة", "% of internal resources", "% من الموارد الداخلية", 1, 0, "down"],
  "en.atm.pm25.mc.m3": ["PM2.5 air pollution exposure", "التعرض لتلوث الهواء PM2.5", "µg/m³", "ميكروغرام/م³", 1, 1, "down"],
  "en.atm.co2e.pc": ["CO₂ emissions per person", "انبعاثات ثاني أكسيد الكربون للفرد", "t", "طن", 1, 2, "down"],
  "en.atm.ghgt.kt.ce": ["Greenhouse gas emissions", "انبعاثات غازات الدفيئة", "Mt CO₂e", "مليون طن مكافئ", 1e3, 1, "down"],
  "it.net.bbnd.p2": ["Fixed broadband subscriptions", "اشتراكات النطاق العريض الثابت", "per 100", "لكل 100", 1, 1, "up"],
  "it.cel.sets.p2": ["Mobile subscriptions", "اشتراكات الهاتف المتنقل", "per 100", "لكل 100", 1, 0, "up"],
  "lp.lpi.ovrl.xq": ["Logistics performance index", "مؤشر الأداء اللوجستي", "1–5", "1–5", 1, 2, "up"],
};

const yEnd = (y: number) => `${y}-12-31`;
const qEnd = (p: string) => { const [y, q] = p.split("-Q"); return `${y}-${["03-31", "06-30", "09-30", "12-31"][+q - 1]}`; };

const macroWdi: Indicator[] = NATIONAL_DATA.indicators.map((d) => {
  const w = WDI[d.code];
  const last = d.series[d.series.length - 1];
  return {
    id: `WDI_${d.code.toUpperCase().replace(/\./g, "_")}`, level: "MACRO", pillar: d.pillar as Pillar,
    name: w ? { en: w[0], ar: w[1] } : { en: d.title, ar: d.title }, unit: w ? { en: w[2], ar: w[3] } : { en: "", ar: "" },
    owner: d.owner, freq: "A", status: "INTERNATIONAL", period: String(last[0]), periodEnd: yEnd(last[0]), value: last[1], series: d.series,
    source: { name: `World Bank WDI ${d.code.toUpperCase()} (open mirror github.com/datasets/world-development-indicators)`, url: `https://data.worldbank.org/indicator/${d.code.toUpperCase()}?locations=JO`, retrieved: NATIONAL_DATA.fetchedAt.slice(0, 10), sha: d.sha },
    note: { en: d.description.slice(0, 260), ar: "سلسلة يجمعها البنك الدولي من المصادر الوطنية والدولية؛ قد تتأخر عن الإصدار الوطني أو تختلف عنه في التعريف." },
    scale: w?.[4] ?? 1, dp: w?.[5] ?? 1, better: w?.[6],
  };
});

// ── official national figures (DoS / UNHCR), preferred over the international series where both exist
const Q = GOV_LABOUR.quarterly;
const lastQ = Q[Q.length - 1];
const A = GOV_LABOUR.annual;
const nat = (y: number) => GOVS.reduce((s, g) => { const r = A.byGov[g].find((x) => x.year === y)!; return { e: s.e + r.employed, u: s.u + r.unemployed }; }, { e: 0, u: 0 });

const macroOfficial: Indicator[] = [
  { id: "DOS_POP_TOTAL", level: "MACRO", pillar: "POPULATION", headline: true, name: { en: "Population (DoS estimate)", ar: "عدد السكان (تقدير الدائرة)" }, unit: { en: "million", ar: "مليون" }, owner: "DOS", freq: "A", status: "REPORTED", period: "end-2025", periodEnd: "2025-12-31", value: 11_937_000, scale: 1e6, dp: 2,
    source: { name: "DoS population estimates, end-2025 (PopulationEstimates.pdf); World Population Day release via Petra", url: "https://petra.gov.jo/en/news/kingdoms-population-surpasses-12-million-expected-to-reach-1214-million-by-end-of-2026-dos", retrieved: "2026-10-18" },
    note: { en: "DoS projects 12.144 million by end-2026 (growth 1.7%). The World Bank series shows 11.52 million for 2025 — the dashboard uses the DoS figure as the national reference and shows the gap.", ar: "تتوقع الدائرة 12.144 مليون نسمة نهاية 2026 (نمو 1.7%). يُظهر البنك الدولي 11.52 مليون لعام 2025 — تعتمد اللوحة رقم الدائرة مرجعاً وطنياً وتُظهر الفجوة." } },
  { id: "DOS_UNEMP_Q", level: "MACRO", pillar: "LABOUR", headline: true, better: "down", name: { en: "Unemployment rate, all residents", ar: "معدل البطالة، جميع السكان" }, unit: { en: "%", ar: "%" }, owner: "DOS", freq: "Q", status: "OFFICIAL", period: lastQ.period, periodEnd: qEnd(lastQ.period), value: lastQ.total.national ?? undefined, dp: 1,
    quarterly: Q.filter((q) => q.total.national !== null).map((q) => [q.period, q.total.national!] as [string, number]),
    source: { name: `DoS Labour Force Survey release ${lastQ.period}`, url: lastQ.source.url, retrieved: lastQ.source.retrieved.slice(0, 10), sha: lastQ.source.sha256.slice(0, 12) } },
  { id: "DOS_UNEMP_JOR_Q", level: "MACRO", pillar: "LABOUR", headline: true, better: "down", name: { en: "Unemployment rate, Jordanians", ar: "معدل البطالة بين الأردنيين" }, unit: { en: "%", ar: "%" }, owner: "DOS", freq: "Q", status: "OFFICIAL", period: lastQ.period, periodEnd: qEnd(lastQ.period), value: lastQ.jordanians.national ?? undefined, dp: 1,
    quarterly: Q.filter((q) => q.jordanians.national !== null).map((q) => [q.period, q.jordanians.national!] as [string, number]),
    source: { name: `DoS Labour Force Survey release ${lastQ.period}`, url: lastQ.source.url, retrieved: lastQ.source.retrieved.slice(0, 10), sha: lastQ.source.sha256.slice(0, 12) } },
  { id: "DOS_UNEMP_JOR_A", level: "MACRO", pillar: "LABOUR", better: "down", name: { en: "Unemployment rate, Jordanians (annual, from counts)", ar: "معدل البطالة بين الأردنيين (سنوي، من الأعداد)" }, unit: { en: "%", ar: "%" }, owner: "DOS", freq: "A", status: "DERIVED", period: String(A.years[A.years.length - 1]), periodEnd: yEnd(A.years[A.years.length - 1]), dp: 1,
    series: A.years.map((y) => { const n = nat(y); return [y, +((n.u / (n.e + n.u)) * 100).toFixed(2)] as [number, number]; }),
    source: { name: "Derived from DoS PxWeb tables EMPALL / EMPALL1 (employed and unemployed Jordanians 15+)", url: A.sources[0].url, retrieved: A.sources[0].retrieved.slice(0, 10), sha: A.sources[0].sha256.slice(0, 12) } },
  { id: "UNHCR_REFUGEES", level: "MACRO", pillar: "POPULATION", headline: true, name: { en: "Registered refugees and asylum-seekers", ar: "اللاجئون وطالبو اللجوء المسجلون" }, unit: { en: "thousand", ar: "ألف" }, owner: "UNHCR", freq: "M", status: "INTERNATIONAL", period: "30 Sep 2026", periodEnd: "2026-09-30", value: 352_553, scale: 1e3, dp: 0,
    source: { name: "UNHCR Operational Data Portal — Jordan", url: "https://data.unhcr.org/en/country/jor", retrieved: "2026-10-18" },
    note: { en: "Down from about 427,000 in February 2026; over 202,000 Syrian refugees registered in Jordan returned to Syria between December 2024 and June 2026 (UNHCR factsheet, June 2026).", ar: "انخفاض من نحو 427 ألفاً في شباط 2026؛ وعاد أكثر من 202 ألف لاجئ سوري مسجل في الأردن إلى سوريا بين كانون الأول 2024 وحزيران 2026 (نشرة المفوضية، حزيران 2026)." } },
];
// the annual derived series needs its latest value
macroOfficial[3].value = macroOfficial[3].series![macroOfficial[3].series!.length - 1][1];

// ── governorate (micro) indicators
const P25: Record<GovId, number> = { AMM: 5_004_600, IRB: 2_210_500, ZAR: 1_704_500, BAL: 614_000, MAF: 686_800, JER: 296_000, AJL: 219_900, MAD: 236_200, KAR: 395_400, TAF: 120_300, MAN: 197_900, AQB: 0 };
P25.AQB = 11_937_000 - GOVS.filter((g) => g !== "AQB").reduce((s, g) => s + P25[g], 0);
export const GOV_POP_2025 = P25;
const AREA: Record<GovId, number> = { AMM: 7579, IRB: 1572, ZAR: 4761, BAL: 1120, MAF: 26551, JER: 410, AJL: 420, MAD: 940, KAR: 3495, TAF: 2209, MAN: 32832, AQB: 6905 };
const all = <T,>(f: (g: GovId) => T) => Object.fromEntries(GOVS.map((g) => [g, f(g)])) as Record<GovId, T>;
const lastA = A.years[A.years.length - 1];
const aRow = (g: GovId, y: number) => A.byGov[g].find((x) => x.year === y)!;
const REF: Partial<Record<GovId, number>> = { AMM: 147_038, IRB: 71_939, MAF: 52_803, ZAR: 26_465 };
const popSrc: Source = { name: "DoS, Estimated population by governorate at end-2025 (PopulationEstimates.pdf, Statistical Yearbook)", url: "https://dosweb.dos.gov.jo/DataBank/Population/Population_Estimares/PopulationEstimates.pdf", retrieved: "2026-10-18" };
const missing = (id: string, pillar: Pillar, en: string, ar: string, uen: string, uar: string, owner: string, freq: Freq, why: L, better?: "up" | "down", national?: { value: number; period: string; src: string }): Indicator => ({
  id, level: "MICRO", pillar, name: { en, ar }, unit: { en: uen, ar: uar }, owner, freq, status: "MISSING", better, note: why,
  source: { name: national ? `No governorate series found in open channels. National: ${national.src}` : "No governorate series found in open channels" },
  ...(national ? { value: national.value, period: national.period } : {}),
});

const micro: Indicator[] = [
  { id: "GOV_POP", level: "MICRO", pillar: "POPULATION", name: { en: "Population", ar: "عدد السكان" }, unit: { en: "people", ar: "نسمة" }, owner: "DOS", freq: "A", status: "REPORTED", period: "end-2025", periodEnd: "2025-12-31", value: 11_937_000, byGov: P25, govStatus: { AQB: "DERIVED" }, dp: 0, source: popSrc,
    note: { en: "Eleven governorates as published by DoS (read via search extraction of the DoS file — verify against the file). Aqaba is the residual of the published national total (DERIVED).", ar: "إحدى عشرة محافظة كما نشرتها الدائرة (مقروءة عبر استخراج نصي لملف الدائرة — يُرجى التحقق من الملف). العقبة محسوبة كفرق من المجموع الوطني المنشور (مشتق)." } },
  { id: "GOV_SHARE", level: "MICRO", pillar: "POPULATION", name: { en: "Share of the Kingdom's population", ar: "الحصة من سكان المملكة" }, unit: { en: "%", ar: "%" }, owner: "DOS", freq: "A", status: "DERIVED", period: "end-2025", periodEnd: "2025-12-31", value: 100, byGov: all((g) => +((P25[g] / 11_937_000) * 100).toFixed(2)), dp: 1, source: popSrc },
  { id: "GOV_AREA", level: "MICRO", pillar: "POPULATION", name: { en: "Area", ar: "المساحة" }, unit: { en: "km²", ar: "كم²" }, owner: "DOS", freq: "5Y", status: "REPORTED", period: "2012 boundaries", periodEnd: "2026-01-01", value: Object.values(AREA).reduce((a, b) => a + b, 0), byGov: AREA, dp: 0,
    source: { name: "DoS Statistical Yearbook, Area and population density by governorate (as tabulated in public references)", url: "https://jorinfo.dos.gov.jo/Databank/pxweb/en/Demographi_Statistics/" } },
  { id: "GOV_DENSITY", level: "MICRO", pillar: "POPULATION", name: { en: "Population density", ar: "الكثافة السكانية" }, unit: { en: "per km²", ar: "لكل كم²" }, owner: "DOS", freq: "A", status: "DERIVED", period: "end-2025", periodEnd: "2025-12-31", value: +(11_937_000 / Object.values(AREA).reduce((a, b) => a + b, 0)).toFixed(1), byGov: all((g) => +(P25[g] / AREA[g]).toFixed(1)), dp: 0, source: popSrc },
  { id: "GOV_UNEMP_Q", level: "MICRO", pillar: "LABOUR", better: "down", name: { en: "Unemployment rate, all residents", ar: "معدل البطالة، جميع السكان" }, unit: { en: "%", ar: "%" }, owner: "DOS", freq: "Q", status: "OFFICIAL", period: lastQ.period, periodEnd: qEnd(lastQ.period), value: lastQ.total.national ?? undefined, byGov: lastQ.total.byGov, dp: 1,
    quarterly: Q.map((q) => [q.period, q.total.national ?? NaN] as [string, number]),
    source: { name: `DoS Labour Force Survey release ${lastQ.period}, unemployment rate by governorate (chart values checked against the release text)`, url: lastQ.source.url, retrieved: lastQ.source.retrieved.slice(0, 10), sha: lastQ.source.sha256.slice(0, 12) } },
  { id: "GOV_UNEMP_JOR_Q", level: "MICRO", pillar: "LABOUR", better: "down", name: { en: "Unemployment rate, Jordanians", ar: "معدل البطالة بين الأردنيين" }, unit: { en: "%", ar: "%" }, owner: "DOS", freq: "Q", status: "OFFICIAL", period: lastQ.period, periodEnd: qEnd(lastQ.period), value: lastQ.jordanians.national ?? undefined, byGov: lastQ.jordanians.byGov, dp: 1,
    source: { name: `DoS Labour Force Survey release ${lastQ.period}, Jordanians by governorate`, url: lastQ.source.url, retrieved: lastQ.source.retrieved.slice(0, 10), sha: lastQ.source.sha256.slice(0, 12) } },
  { id: "GOV_UNEMP_JOR_A", level: "MICRO", pillar: "LABOUR", better: "down", name: { en: "Unemployment rate, Jordanians (annual, from counts)", ar: "معدل البطالة بين الأردنيين (سنوي، من الأعداد)" }, unit: { en: "%", ar: "%" }, owner: "DOS", freq: "A", status: "DERIVED", period: String(lastA), periodEnd: yEnd(lastA), value: macroOfficial[3].value, byGov: all((g) => aRow(g, lastA).rate), dp: 1,
    govSeries: all((g) => A.byGov[g].map((r) => [r.year, r.rate] as [number, number])),
    source: { name: "Derived from DoS PxWeb EMPALL / EMPALL1 — unemployed ÷ (employed + unemployed), Jordanians 15+", url: A.sources[1].url, retrieved: A.sources[1].retrieved.slice(0, 10), sha: A.sources[1].sha256.slice(0, 12) } },
  { id: "GOV_EMPLOYED_JOR", level: "MICRO", pillar: "LABOUR", better: "up", name: { en: "Employed Jordanians (15+)", ar: "الأردنيون العاملون (15+)" }, unit: { en: "people", ar: "شخص" }, owner: "DOS", freq: "A", status: "OFFICIAL", period: String(lastA), periodEnd: yEnd(lastA), value: nat(lastA).e, byGov: all((g) => aRow(g, lastA).employed), dp: 0,
    govSeries: all((g) => A.byGov[g].map((r) => [r.year, r.employed] as [number, number])),
    source: { name: "DoS PxWeb table EMPALL — Jordanians employed aged 15+ by governorate", url: A.sources[0].url, retrieved: A.sources[0].retrieved.slice(0, 10), sha: A.sources[0].sha256.slice(0, 12) } },
  { id: "GOV_UNEMPLOYED_JOR", level: "MICRO", pillar: "LABOUR", better: "down", name: { en: "Unemployed Jordanians (15+)", ar: "الأردنيون المتعطلون (15+)" }, unit: { en: "people", ar: "شخص" }, owner: "DOS", freq: "A", status: "OFFICIAL", period: String(lastA), periodEnd: yEnd(lastA), value: nat(lastA).u, byGov: all((g) => aRow(g, lastA).unemployed), dp: 0,
    source: { name: "DoS PxWeb table EMPALL1 — Jordanians unemployed aged 15+ by governorate", url: A.sources[1].url, retrieved: A.sources[1].retrieved.slice(0, 10), sha: A.sources[1].sha256.slice(0, 12) } },
  { id: "GOV_EMP_CHANGE", level: "MICRO", pillar: "LABOUR", better: "up", name: { en: `Change in employed Jordanians ${A.years[0]}–${lastA}`, ar: `التغير في الأردنيين العاملين ${A.years[0]}–${lastA}` }, unit: { en: "%", ar: "%" }, owner: "DOS", freq: "A", status: "DERIVED", period: String(lastA), periodEnd: yEnd(lastA), value: +((nat(lastA).e / nat(A.years[0]).e - 1) * 100).toFixed(1), byGov: all((g) => +((aRow(g, lastA).employed / aRow(g, A.years[0]).employed - 1) * 100).toFixed(1)), dp: 1,
    source: { name: "Derived from DoS PxWeb EMPALL", url: A.sources[0].url, retrieved: A.sources[0].retrieved.slice(0, 10) } },
  { id: "GOV_REFUGEES", level: "MICRO", pillar: "POPULATION", name: { en: "Registered refugees (host communities)", ar: "اللاجئون المسجلون (المجتمعات المضيفة)" }, unit: { en: "people", ar: "شخص" }, owner: "UNHCR", freq: "M", status: "INTERNATIONAL", period: "Feb 2026", periodEnd: "2026-02-28", value: 427_000, byGov: REF, govStatus: Object.fromEntries(GOVS.filter((g) => !(g in REF)).map((g) => [g, "MISSING"])) as Partial<Record<GovId, Status>>, dp: 0,
    source: { name: "UNHCR registration figures, February 2026, as reported by the Jordan Times", url: "https://jordantimes.com/news/local/registered-refugee-numbers-in-kingdom-drop-23-to-427000-unhcr", retrieved: "2026-10-19" },
    note: { en: "Only the four largest governorates were published. Camps reported separately: Zaatari 49,596 (Mafraq) and Azraq 33,475 (Zarqa). Full governorate table requested.", ar: "نُشرت أكبر أربع محافظات فقط. المخيمات منفصلة: الزعتري 49,596 (المفرق) والأزرق 33,475 (الزرقاء). الجدول الكامل مطلوب." } },
  missing("GOV_POVERTY", "SOCIAL", "Poverty rate", "معدل الفقر", "% of people", "% من السكان", "DOS", "5Y", { en: "The 2017/18 household survey was designed to give governorate poverty rates, but no governorate table was found in open channels. Latest national rate 15.7% (2018).", ar: "صُمم مسح دخل ونفقات الأسرة 2017/2018 ليعطي معدلات فقر للمحافظات، لكن لم يُعثر على جدول المحافظات في القنوات المفتوحة. آخر معدل وطني 15.7% (2018)." }, "down", { value: 15.7, period: "2018", src: "World Bank Poverty & Equity brief citing HEIS 2017/18" }),
  missing("GOV_SCHOOLS", "SOCIAL", "Public schools", "المدارس الحكومية", "schools", "مدرسة", "MOE", "A", { en: "Held in OpenEMIS by directorate; no open governorate table found.", ar: "محفوظة في OpenEMIS حسب المديرية؛ لم يُعثر على جدول مفتوح للمحافظات." }),
  missing("GOV_STUDENTS", "SOCIAL", "School students", "طلبة المدارس", "students", "طالب", "MOE", "A", { en: "Latest national figure found: about 2.24 million students (2021/22, TIMSS 2023 encyclopedia citing MoE).", ar: "آخر رقم وطني: نحو 2.24 مليون طالب (2021/2022 وفق موسوعة TIMSS 2023 نقلاً عن الوزارة)." }),
  missing("GOV_CLASS_CROWD", "SOCIAL", "Overcrowded classrooms", "الغرف الصفية المكتظة", "% of classrooms", "% من الغرف", "MOE", "A", { en: "Needed to plan school building per governorate.", ar: "مطلوب لتخطيط الأبنية المدرسية في كل محافظة." }, "down"),
  missing("GOV_BEDS", "SOCIAL", "Hospital beds per 10,000", "أسرّة المستشفيات لكل 10,000", "per 10,000", "لكل 10,000", "MOH", "A", { en: "Published in the MoH Health Statistical Yearbook (PDF); no machine-readable governorate table found. National: about 14 beds per 10,000 (MoH strategy document).", ar: "منشورة في الكتاب الإحصائي الصحي (PDF)؛ لا يوجد جدول مقروء آلياً للمحافظات. وطنياً: نحو 14 سريراً لكل 10,000 (وثيقة استراتيجية الوزارة)." }, "up", { value: 14.1, period: "2023", src: "World Bank WDI SH.MED.BEDS.ZS (1.41 per 1,000)" }),
  missing("GOV_PHC", "SOCIAL", "Primary health care centres", "مراكز الرعاية الصحية الأولية", "centres", "مركز", "MOH", "A", { en: "Needed for access-to-care planning.", ar: "مطلوب لتخطيط الوصول إلى الرعاية." }),
  missing("GOV_WATER", "INFRA", "Water supplied per person", "حصة الفرد من المياه المزودة", "litres / day", "لتر يومياً", "MWI", "A", { en: "Needed for the Water Security model; currently simulated.", ar: "مطلوب لنموذج الأمن المائي؛ حالياً محاكى." }, "up"),
  missing("GOV_NRW", "INFRA", "Non-revenue water", "المياه غير المحاسب عليها", "%", "%", "MWI", "A", { en: "Losses by governorate utility.", ar: "الفاقد حسب شركة المياه في المحافظة." }, "down"),
  missing("GOV_ELEC", "INFRA", "Electricity consumption", "استهلاك الكهرباء", "GWh", "غيغاواط ساعة", "MEMR", "A", { en: "By distribution company area; needed to calibrate the Energy model (currently national only).", ar: "حسب منطقة شركة التوزيع؛ مطلوب لمعايرة نموذج الطاقة (وطني فقط حالياً)." }),
  missing("GOV_MUNI_REV", "FISCAL", "Municipal own revenue per person", "الإيرادات الذاتية للبلديات للفرد", "JOD", "دينار", "MOLA", "A", { en: "For 100 municipalities, aggregated by governorate; GAM and ASEZA report separately.", ar: "لـ100 بلدية مجمعة حسب المحافظة؛ تقدم الأمانة وسلطة العقبة بياناتهما منفصلة." }, "up"),
  missing("GOV_PERMITS", "ECONOMY", "Licensed building area", "مساحات الأبنية المرخصة", "thousand m²", "ألف م²", "DOS", "Q", { en: "DoS publishes a national total (9.03 million m² in 2024); a governorate split is needed for housing supply.", ar: "تنشر الدائرة مجموعاً وطنياً (9.03 مليون م² في 2024)؛ والتوزيع حسب المحافظة مطلوب لعرض المساكن." }, undefined, { value: 9030, period: "2024", src: "DoS via Jordan News" }),
  missing("GOV_SSC", "LABOUR", "Active insured workers", "المؤمن عليهم الفعالون", "workers", "عامل", "SSC", "A", { en: "Formal employment by governorate of work.", ar: "العمالة المنظمة حسب محافظة العمل." }, "up"),
  missing("GOV_WORK_PERMITS", "LABOUR", "Work permits issued", "تصاريح العمل الصادرة", "permits", "تصريح", "MOL", "A", { en: "By governorate and nationality.", ar: "حسب المحافظة والجنسية." }),
  missing("GOV_NAF", "SOCIAL", "Households receiving cash aid", "الأسر المستفيدة من المعونة النقدية", "households", "أسرة", "NAF", "A", { en: "By governorate; core equity indicator.", ar: "حسب المحافظة؛ مؤشر أساسي للعدالة." }),
  missing("GOV_ROAD_DEATHS", "INFRA", "Road traffic deaths", "وفيات حوادث السير", "deaths", "وفاة", "PSD", "A", { en: "Published nationally in the annual traffic report; governorate table needed.", ar: "منشورة وطنياً في التقرير المروري السنوي؛ والجدول حسب المحافظة مطلوب." }, "down"),
  missing("GOV_BIRTHS", "POPULATION", "Registered births", "المواليد المسجلون", "births", "مولود", "CSPD", "A", { en: "By governorate of residence; feeds the population projections.", ar: "حسب محافظة الإقامة؛ يغذي الإسقاطات السكانية." }),
  missing("GOV_EMV_PROJECTS", "ECONOMY", "Economic Modernisation projects under way", "مشاريع التحديث الاقتصادي قيد التنفيذ", "projects", "مشروع", "PMDU", "Q", { en: "The 2026–2029 executive programme lists 393 projects (JD 3.8 bn); a governorate split is needed to link spending to need.", ar: "يضم البرنامج التنفيذي 2026–2029 نحو 393 مشروعاً (3.8 مليار دينار)؛ والتوزيع حسب المحافظة مطلوب لربط الإنفاق بالحاجة." }, undefined, { value: 393, period: "2026", src: "Government announcement of the EMV executive programme 2026–2029" }),
];

/** Headline national figures: the best available source for each (official first). */
export const HEADLINE = ["DOS_POP_TOTAL", "WDI_NY_GDP_MKTP_CD", "WDI_NY_GDP_MKTP_KD_ZG", "WDI_FP_CPI_TOTL_ZG", "DOS_UNEMP_Q", "DOS_UNEMP_JOR_Q", "WDI_SL_TLF_CACT_FE_ZS", "WDI_GC_DOD_TOTL_GD_ZS", "WDI_FI_RES_TOTL_CD", "WDI_BN_CAB_XOKA_CD", "UNHCR_REFUGEES", "WDI_ER_H2O_INTR_PC"];

export const INDICATORS: Indicator[] = [...macroOfficial, ...macroWdi, ...micro];
export const indicator = (id: string) => INDICATORS.find((i) => i.id === id)!;

// ───────────────────────────── freshness & scorecards ─────────────────────────────

/** Proposed delivery lag after the end of the reference period (days). */
export const PROPOSED_LAG: Record<Freq, number> = { M: 45, Q: 90, A: 270, "5Y": 540 };
const PERIOD_DAYS: Record<Freq, number> = { M: 31, Q: 92, A: 366, "5Y": 1827 };
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

export function freshness(i: Indicator, asOf = AS_OF): { state: Freshness; ageDays: number | null; dueBy?: string } {
  if (i.status === "MISSING" || !i.periodEnd) return { state: "MISSING", ageDays: null };
  const age = days(i.periodEnd, asOf);
  const allowed = PERIOD_DAYS[i.freq] + PROPOSED_LAG[i.freq];
  return { state: age <= allowed ? "CURRENT" : age <= allowed + PERIOD_DAYS[i.freq] ? "LATE" : "STALE", ageDays: Math.round(age) };
}

export const CHANNEL_SCORE: Record<Channel, number> = { API: 1, FILES: 0.6, PDF: 0.3, NONE: 0 };

export interface Scorecard {
  entity: Entity;
  owned: number;
  available: number;
  current: number;
  late: number;
  stale: number;
  missing: number;
  machineRead: number;
  score: number;
  oldest?: Indicator;
}

/** Indicative readiness score (proposed method): 50% coverage, 35% timeliness, 15% machine-readable channel. */
export function scorecards(asOf = AS_OF): Scorecard[] {
  return ENTITIES.filter((e) => e.kind !== "OWNER").map((e) => {
    const own = INDICATORS.filter((i) => i.owner === e.id);
    const f = own.map((i) => ({ i, f: freshness(i, asOf) }));
    const n = (s: Freshness) => f.filter((x) => x.f.state === s).length;
    const available = own.length - n("MISSING");
    const machineRead = own.filter((i) => i.status === "OFFICIAL").length;
    const coverage = own.length ? available / own.length : 0;
    const timely = available ? (n("CURRENT") + 0.5 * n("LATE")) / available : 0;
    const score = own.length ? Math.round(100 * (0.5 * coverage + 0.35 * timely + 0.15 * CHANNEL_SCORE[e.channel.type])) : 0;
    const oldest = f.filter((x) => x.f.ageDays !== null).sort((a, b) => b.f.ageDays! - a.f.ageDays!)[0]?.i;
    return { entity: e, owned: own.length, available, current: n("CURRENT"), late: n("LATE"), stale: n("STALE"), missing: n("MISSING"), machineRead, score, oldest };
  }).filter((s) => s.owned > 0).sort((a, b) => b.owned - a.owned);
}

// ───────────────────────────── data requests ─────────────────────────────

export type RequestStage = "DRAFT" | "SENT" | "ACKNOWLEDGED" | "DELIVERED" | "VALIDATED" | "DECLINED";
export const REQUEST_STAGES: RequestStage[] = ["DRAFT", "SENT", "ACKNOWLEDGED", "DELIVERED", "VALIDATED"];
export const STAGE_LABEL_R: Record<RequestStage, L> = {
  DRAFT: { en: "Draft", ar: "مسودة" }, SENT: { en: "Sent", ar: "أُرسل" }, ACKNOWLEDGED: { en: "Acknowledged", ar: "تم الاستلام" },
  DELIVERED: { en: "Data delivered", ar: "سُلّمت البيانات" }, VALIDATED: { en: "Validated by DoS", ar: "اعتمدتها الدائرة" }, DECLINED: { en: "Declined", ar: "مرفوض" },
};

export interface DataRequest {
  id: string;
  entityId: string;
  indicatorIds: string[];
  reason: "MISSING" | "STALE" | "LATE";
  priority: "HIGH" | "MEDIUM";
}

/** One request per accountable entity, bundling its missing governorate series and stale national series. */
export function proposedRequests(asOf = AS_OF): DataRequest[] {
  const out: DataRequest[] = [];
  let k = 1;
  for (const e of ENTITIES) {
    const own = INDICATORS.filter((i) => i.owner === e.id);
    const miss = own.filter((i) => freshness(i, asOf).state === "MISSING" || (i.byGov && Object.values(i.govStatus ?? {}).includes("MISSING")));
    const stale = own.filter((i) => freshness(i, asOf).state === "STALE" && i.level === "MACRO");
    if (miss.length) out.push({ id: `REQ-${String(k++).padStart(3, "0")}`, entityId: e.id, indicatorIds: miss.map((i) => i.id), reason: "MISSING", priority: miss.some((i) => i.level === "MICRO") ? "HIGH" : "MEDIUM" });
    if (stale.length) out.push({ id: `REQ-${String(k++).padStart(3, "0")}`, entityId: e.id, indicatorIds: stale.map((i) => i.id), reason: "STALE", priority: "MEDIUM" });
  }
  return out;
}

/** Format an indicator value for display (Western digits in both languages, as in DoS releases). */
export function fmtValue(i: Pick<Indicator, "scale" | "dp">, v: number | undefined): string {
  if (v === undefined || Number.isNaN(v)) return "—";
  const x = v / (i.scale ?? 1);
  return x.toLocaleString("en-US", { minimumFractionDigits: i.dp ?? 1, maximumFractionDigits: i.dp ?? 1 });
}

/**
 * Horizon scanning — a register of emerging signals (STEEP: social, technological, economic,
 * environmental, political). Ratings are editable starting points for a foresight workshop, not
 * measurements. Score = impact × likelihood; urgency rises as the time to impact shortens.
 */
import type { L } from "@/types/census";
import type { ActionSector } from "./actions";
import type { Axis } from "./futures";

export type Steep = "SOCIAL" | "TECH" | "ECONOMIC" | "ENVIRONMENT" | "POLITICAL";

export interface Signal {
  id: string;
  steep: Steep;
  title: L;
  description: L;
  impact: number;
  likelihood: number;
  years: number;
  sectors: ActionSector[];
  axis?: Axis["id"];
  custom?: boolean;
}

export const STEEP_LABEL: Record<Steep, L> = {
  SOCIAL: { en: "Social", ar: "اجتماعي" },
  TECH: { en: "Technological", ar: "تقني" },
  ECONOMIC: { en: "Economic", ar: "اقتصادي" },
  ENVIRONMENT: { en: "Environmental", ar: "بيئي" },
  POLITICAL: { en: "Political", ar: "سياسي" },
};

export const STEEP_COLOR: Record<Steep, string> = { SOCIAL: "#2f62a6", TECH: "#8a5cc0", ECONOMIC: "#d07a1c", ENVIRONMENT: "#159a83", POLITICAL: "#b5453a" };

const s = (id: string, steep: Steep, en: string, ar: string, den: string, dar: string, impact: number, likelihood: number, years: number, sectors: ActionSector[], axis?: Axis["id"]): Signal => ({ id, steep, title: { en, ar }, description: { en: den, ar: dar }, impact, likelihood, years, sectors, axis });

export const DEFAULT_SIGNALS: Signal[] = [
  s("S01", "SOCIAL", "Smaller households and later marriage", "أسر أصغر وزواج متأخر", "More, smaller households raise housing demand faster than population.", "أسر أكثر وأصغر ترفع الطلب على المساكن أسرع من نمو السكان.", 4, 4, 5, ["HOUSING"], "FERTILITY"),
  s("S02", "SOCIAL", "Skilled young people emigrating", "هجرة الشباب المهرة", "Loss of graduates in health, engineering and IT.", "فقدان الخريجين في الصحة والهندسة وتقنية المعلومات.", 4, 3, 3, ["JOBS", "HEALTH"], "ECONOMY"),
  s("S03", "SOCIAL", "Older parents living alone", "آباء مسنون يعيشون وحدهم", "Family care weakens as children move to cities or abroad.", "تضعف الرعاية الأسرية مع انتقال الأبناء إلى المدن أو الخارج.", 3, 3, 8, ["AGEING"]),
  s("S04", "TECH", "Remote and hybrid work", "العمل عن بعد والعمل المرن", "Weakens the pull of central Amman; changes commuting and office demand.", "يضعف جاذبية وسط عمّان ويغير التنقل والطلب على المكاتب.", 3, 3, 4, ["MOBILITY", "URBAN"], "URBAN"),
  s("S05", "TECH", "AI automation of routine jobs", "أتمتة الوظائف الروتينية بالذكاء الاصطناعي", "Clerical and call-centre jobs at risk; new digital jobs elsewhere.", "وظائف الأعمال المكتبية ومراكز الاتصال معرضة للخطر؛ ووظائف رقمية جديدة في مجالات أخرى.", 4, 4, 5, ["JOBS"], "ECONOMY"),
  s("S06", "TECH", "Cheaper solar power and storage", "طاقة شمسية وتخزين أرخص", "Lowers the energy cost of pumping and desalinating water.", "يخفض كلفة الطاقة لضخ المياه وتحليتها.", 4, 4, 4, ["WATER"], "WATER"),
  s("S07", "TECH", "Electric vehicles", "المركبات الكهربائية", "Shifts fuel imports and grid load; little effect on congestion.", "يغير استيراد الوقود وحمل الشبكة؛ وأثر محدود على الازدحام.", 3, 4, 6, ["MOBILITY"]),
  s("S08", "TECH", "Administrative-data population estimates", "تقدير السكان من البيانات الإدارية", "Registers and utility data allow continuous population estimates between censuses.", "تتيح السجلات وبيانات المرافق تقديراً مستمراً للسكان بين التعدادين.", 3, 4, 3, ["DATA"]),
  s("S09", "ECONOMIC", "Rising construction costs", "ارتفاع كلفة البناء", "Makes affordable housing and public facilities harder to deliver.", "يصعّب توفير المساكن الميسورة والمرافق العامة.", 4, 4, 2, ["HOUSING", "EDUCATION", "HEALTH"], "ECONOMY"),
  s("S10", "ECONOMIC", "Regional logistics and e-commerce hubs", "مراكز لوجستية وتجارة إلكترونية إقليمية", "New jobs along corridors to Aqaba, Zarqa and Mafraq.", "وظائف جديدة على المحاور نحو العقبة والزرقاء والمفرق.", 3, 3, 5, ["JOBS", "MOBILITY"], "ECONOMY"),
  s("S11", "ECONOMIC", "Tourism volatility", "تقلب السياحة", "Shocks to Petra, Aqaba and Dead Sea employment.", "صدمات للتشغيل في البتراء والعقبة والبحر الميت.", 3, 3, 1, ["JOBS"], "ECONOMY"),
  s("S12", "ECONOMIC", "Falling remittances", "تراجع الحوالات", "Lower household income in governorates that rely on workers abroad.", "انخفاض دخل الأسر في المحافظات المعتمدة على العاملين في الخارج.", 3, 2, 4, ["JOBS", "HOUSING"], "ECONOMY"),
  s("S13", "ENVIRONMENT", "More frequent heat waves", "موجات حر أكثر تكراراً", "Health risk for older people, outdoor workers and homes without cooling.", "خطر صحي على كبار السن والعاملين في الخارج والمساكن بلا تبريد.", 5, 4, 2, ["CLIMATE", "HEALTH"], "CLIMATE"),
  s("S14", "ENVIRONMENT", "Faster groundwater depletion", "تسارع استنزاف المياه الجوفية", "Aquifers decline faster than recharge; wells go dry.", "تنخفض الأحواض أسرع من التغذية وتجف آبار.", 5, 4, 3, ["WATER"], "WATER"),
  s("S15", "ENVIRONMENT", "Intense flash floods", "سيول مفاجئة أشد", "Short, intense storms in wadis and city centres.", "عواصف قصيرة وشديدة في الأودية ومراكز المدن.", 4, 3, 2, ["CLIMATE", "URBAN"], "CLIMATE"),
  s("S16", "ENVIRONMENT", "Dust storms", "العواصف الغبارية", "Health and transport disruption, especially in the east.", "اضطراب صحي وفي النقل خاصة في الشرق.", 3, 3, 2, ["HEALTH", "MOBILITY"], "CLIMATE"),
  s("S17", "POLITICAL", "Renewed regional displacement", "نزوح إقليمي متجدد", "New arrivals concentrated in northern governorates.", "وافدون جدد يتركزون في المحافظات الشمالية.", 5, 3, 1, ["HOUSING", "EDUCATION", "HEALTH", "WATER"], "MIGRATION"),
  s("S18", "POLITICAL", "Stronger local government budgets", "موازنات أقوى للحكم المحلي", "Decentralisation gives councils more say over local investment.", "تمنح اللامركزية المجالس صلاحيات أكبر في الاستثمار المحلي.", 3, 3, 4, ["URBAN"], "URBAN"),
  s("S19", "POLITICAL", "Regional water cooperation", "التعاون المائي الإقليمي", "Agreements that change the volume or timing of new supply.", "اتفاقات تغير حجم الإمداد الجديد أو توقيته.", 4, 2, 5, ["WATER"], "WATER"),
];

export const signalScore = (x: Signal) => x.impact * x.likelihood;
export const signalUrgency = (x: Signal) => signalScore(x) * (1 + 3 / Math.max(1, x.years));

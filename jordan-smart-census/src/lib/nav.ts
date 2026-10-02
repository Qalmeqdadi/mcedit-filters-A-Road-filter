import {
  Activity, BarChart3, BookOpenCheck, Brain, Briefcase, BriefcaseBusiness, Building2, Bus, ClipboardList, Coins, Compass, Droplets, FileDown, GaugeCircle,
  GraduationCap, HeartHandshake, HeartPulse, Home, HousePlus, Landmark, Map, MapPinned, MessageSquareText, Plane, Radar, ScanSearch, School, ShieldCheck,
  Siren, SlidersHorizontal, Tent, ThermometerSun, TrendingUp, Users, Wrench,
} from "lucide-react";
import type { DictKey } from "@/lib/i18n/dict";

export type NavGroup = "navOperations" | "navResults" | "navForesight" | "navPlanning" | "navGovernance";

export interface NavItem {
  href: string;
  index: string;
  key: DictKey;
  group: NavGroup;
  icon: typeof Home;
}

const ITEMS: Omit<NavItem, "index">[] = [
  { href: "/", key: "nav01", group: "navOperations", icon: Landmark },
  { href: "/planning", key: "nav02", group: "navOperations", icon: Compass },
  { href: "/gis", key: "nav03", group: "navOperations", icon: Map },
  { href: "/field", key: "nav04", group: "navOperations", icon: Activity },
  { href: "/enumerators", key: "nav05", group: "navOperations", icon: Users },
  { href: "/questionnaire", key: "nav06", group: "navOperations", icon: ClipboardList },
  { href: "/coverage", key: "nav07", group: "navOperations", icon: GaugeCircle },
  { href: "/quality", key: "nav08", group: "navOperations", icon: ShieldCheck },
  { href: "/anomalies", key: "nav09", group: "navOperations", icon: ScanSearch },
  { href: "/early-warning", key: "navEarly", group: "navOperations", icon: Siren },
  { href: "/pes", key: "nav10", group: "navOperations", icon: BookOpenCheck },
  { href: "/population", key: "nav11", group: "navResults", icon: BarChart3 },
  { href: "/housing", key: "nav12", group: "navResults", icon: Home },
  { href: "/labour", key: "nav13", group: "navResults", icon: Briefcase },
  { href: "/education", key: "nav14", group: "navResults", icon: GraduationCap },
  { href: "/health", key: "nav15", group: "navResults", icon: HeartPulse },
  { href: "/migration", key: "nav16", group: "navResults", icon: Plane },
  { href: "/infrastructure", key: "nav17", group: "navResults", icon: Wrench },
  { href: "/projections", key: "nav18", group: "navForesight", icon: TrendingUp },
  { href: "/nowcast", key: "navNowcast", group: "navForesight", icon: Radar },
  { href: "/scenarios", key: "nav19", group: "navForesight", icon: SlidersHorizontal },
  { href: "/decision", key: "nav20", group: "navForesight", icon: Brain },
  { href: "/ask", key: "navAsk", group: "navForesight", icon: MessageSquareText },
  { href: "/siting", key: "navSiting", group: "navPlanning", icon: School },
  { href: "/urban-growth", key: "navGrowth", group: "navPlanning", icon: Building2 },
  { href: "/housing-need", key: "navHousingNeed", group: "navPlanning", icon: HousePlus },
  { href: "/water", key: "navWater", group: "navPlanning", icon: Droplets },
  { href: "/mobility", key: "navMobility", group: "navPlanning", icon: Bus },
  { href: "/climate", key: "navClimate", group: "navPlanning", icon: ThermometerSun },
  { href: "/jobs", key: "navJobs", group: "navPlanning", icon: BriefcaseBusiness },
  { href: "/ageing", key: "navAgeing", group: "navPlanning", icon: HeartHandshake },
  { href: "/capital", key: "navCapital", group: "navPlanning", icon: Coins },
  { href: "/shock", key: "navShock", group: "navPlanning", icon: Tent },
  { href: "/reports", key: "nav21", group: "navGovernance", icon: FileDown },
  { href: "/methodology", key: "nav22", group: "navGovernance", icon: MapPinned },
];

export const NAV: NavItem[] = ITEMS.map((n, i) => ({ ...n, index: String(i + 1).padStart(2, "0") }));

/** Module number shown in page headers, derived from the navigation order. */
export const navIndex = (href: string) => NAV.find((n) => n.href === href)?.index ?? "";

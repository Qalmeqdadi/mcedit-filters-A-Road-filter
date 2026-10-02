import {
  Activity, BarChart3, BookOpenCheck, Brain, Briefcase, BriefcaseBusiness, Building2, Bus, ClipboardList, Coins, Compass, Droplets, FileDown, GaugeCircle,
  GraduationCap, HeartHandshake, HeartPulse, Home, HousePlus, Landmark, ListChecks, Map, MapPinned, MessageSquareText, Plane, Radar, ScanSearch, School, ShieldCheck,
  Siren, SlidersHorizontal, Sunrise, Grid2x2, Telescope, Tent, ThermometerSun, TrendingUp, Users, Wrench,
} from "lucide-react";
import type { DictKey } from "@/lib/i18n/dict";

export type NavGroup = "navHome" | "navFoundation" | "navToday" | "navFutures" | "navDecide" | "navDeliver";

export interface NavItem {
  href: string;
  index: string;
  key: DictKey;
  group: NavGroup;
  icon: typeof Home;
}

const ITEMS: Omit<NavItem, "index">[] = [
  { href: "/", key: "navUfuqHome", group: "navHome", icon: Sunrise },
  // 1 · Data foundation
  { href: "/census", key: "nav01", group: "navFoundation", icon: Landmark },
  { href: "/planning", key: "nav02", group: "navFoundation", icon: Compass },
  { href: "/gis", key: "nav03", group: "navFoundation", icon: Map },
  { href: "/field", key: "nav04", group: "navFoundation", icon: Activity },
  { href: "/enumerators", key: "nav05", group: "navFoundation", icon: Users },
  { href: "/questionnaire", key: "nav06", group: "navFoundation", icon: ClipboardList },
  { href: "/coverage", key: "nav07", group: "navFoundation", icon: GaugeCircle },
  { href: "/quality", key: "nav08", group: "navFoundation", icon: ShieldCheck },
  { href: "/anomalies", key: "nav09", group: "navFoundation", icon: ScanSearch },
  { href: "/early-warning", key: "navEarly", group: "navFoundation", icon: Siren },
  { href: "/pes", key: "nav10", group: "navFoundation", icon: BookOpenCheck },
  { href: "/nowcast", key: "navNowcast", group: "navFoundation", icon: Radar },
  { href: "/methodology", key: "nav22", group: "navFoundation", icon: MapPinned },
  // 2 · Jordan today
  { href: "/population", key: "nav11", group: "navToday", icon: BarChart3 },
  { href: "/housing", key: "nav12", group: "navToday", icon: Home },
  { href: "/labour", key: "nav13", group: "navToday", icon: Briefcase },
  { href: "/education", key: "nav14", group: "navToday", icon: GraduationCap },
  { href: "/health", key: "nav15", group: "navToday", icon: HeartPulse },
  { href: "/migration", key: "nav16", group: "navToday", icon: Plane },
  { href: "/infrastructure", key: "nav17", group: "navToday", icon: Wrench },
  // 3 · Futures
  { href: "/projections", key: "nav18", group: "navFutures", icon: TrendingUp },
  { href: "/futures", key: "navScenarioFutures", group: "navFutures", icon: Grid2x2 },
  { href: "/signals", key: "navSignals", group: "navFutures", icon: Telescope },
  { href: "/scenarios", key: "nav19", group: "navFutures", icon: SlidersHorizontal },
  { href: "/urban-growth", key: "navGrowth", group: "navFutures", icon: Building2 },
  { href: "/housing-need", key: "navHousingNeed", group: "navFutures", icon: HousePlus },
  { href: "/water", key: "navWater", group: "navFutures", icon: Droplets },
  { href: "/mobility", key: "navMobility", group: "navFutures", icon: Bus },
  { href: "/climate", key: "navClimate", group: "navFutures", icon: ThermometerSun },
  { href: "/jobs", key: "navJobs", group: "navFutures", icon: BriefcaseBusiness },
  { href: "/ageing", key: "navAgeing", group: "navFutures", icon: HeartHandshake },
  // 4 · Plan & decide
  { href: "/action-plans", key: "navActions", group: "navDecide", icon: ListChecks },
  { href: "/robustness", key: "navRobust", group: "navDecide", icon: ShieldCheck },
  { href: "/siting", key: "navSiting", group: "navDecide", icon: School },
  { href: "/capital", key: "navCapital", group: "navDecide", icon: Coins },
  { href: "/shock", key: "navShock", group: "navDecide", icon: Tent },
  { href: "/decision", key: "nav20", group: "navDecide", icon: Brain },
  { href: "/ask", key: "navAsk", group: "navDecide", icon: MessageSquareText },
  // 5 · Deliver & monitor
  { href: "/reports", key: "nav21", group: "navDeliver", icon: FileDown },
];

/** Module numbers: home is 00, then modules in menu order. */
export const NAV: NavItem[] = ITEMS.map((n, i) => ({ ...n, index: String(i).padStart(2, "0") }));

/** Module number shown in page headers, derived from the navigation order. */
export const navIndex = (href: string) => NAV.find((n) => n.href === href)?.index ?? "";

import {
  Activity, BarChart3, BookOpenCheck, Brain, Briefcase, ClipboardList, Compass, FileDown, GaugeCircle, GraduationCap, HeartPulse,
  Home, Landmark, Map, MapPinned, Plane, ScanSearch, ShieldCheck, SlidersHorizontal, TrendingUp, Users, Wrench,
} from "lucide-react";
import type { DictKey } from "@/lib/i18n/dict";

export interface NavItem {
  href: string;
  index: string;
  key: DictKey;
  group: "navOperations" | "navResults" | "navForesight" | "navGovernance";
  icon: typeof Home;
}

export const NAV: NavItem[] = [
  { href: "/", index: "01", key: "nav01", group: "navOperations", icon: Landmark },
  { href: "/planning", index: "02", key: "nav02", group: "navOperations", icon: Compass },
  { href: "/gis", index: "03", key: "nav03", group: "navOperations", icon: Map },
  { href: "/field", index: "04", key: "nav04", group: "navOperations", icon: Activity },
  { href: "/enumerators", index: "05", key: "nav05", group: "navOperations", icon: Users },
  { href: "/questionnaire", index: "06", key: "nav06", group: "navOperations", icon: ClipboardList },
  { href: "/coverage", index: "07", key: "nav07", group: "navOperations", icon: GaugeCircle },
  { href: "/quality", index: "08", key: "nav08", group: "navOperations", icon: ShieldCheck },
  { href: "/anomalies", index: "09", key: "nav09", group: "navOperations", icon: ScanSearch },
  { href: "/pes", index: "10", key: "nav10", group: "navOperations", icon: BookOpenCheck },
  { href: "/population", index: "11", key: "nav11", group: "navResults", icon: BarChart3 },
  { href: "/housing", index: "12", key: "nav12", group: "navResults", icon: Home },
  { href: "/labour", index: "13", key: "nav13", group: "navResults", icon: Briefcase },
  { href: "/education", index: "14", key: "nav14", group: "navResults", icon: GraduationCap },
  { href: "/health", index: "15", key: "nav15", group: "navResults", icon: HeartPulse },
  { href: "/migration", index: "16", key: "nav16", group: "navResults", icon: Plane },
  { href: "/infrastructure", index: "17", key: "nav17", group: "navResults", icon: Wrench },
  { href: "/projections", index: "18", key: "nav18", group: "navForesight", icon: TrendingUp },
  { href: "/scenarios", index: "19", key: "nav19", group: "navForesight", icon: SlidersHorizontal },
  { href: "/decision", index: "20", key: "nav20", group: "navForesight", icon: Brain },
  { href: "/reports", index: "21", key: "nav21", group: "navGovernance", icon: FileDown },
  { href: "/methodology", index: "22", key: "nav22", group: "navGovernance", icon: MapPinned },
];

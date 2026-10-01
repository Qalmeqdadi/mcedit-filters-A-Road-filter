import {
  Activity, ArrowRight, Banknote, Boxes, Bot, Brain, Briefcase, Building2, Cloud, Code2, Coins, Compass, Cpu,
  Database, Eye, Factory, Fingerprint, Flame, Gauge, GraduationCap, HeartPulse, KeyRound, Landmark, Layers,
  LifeBuoy, Network, Route, ScrollText, Search, Server, ShieldCheck, Sparkles, Store, Target, TrendingUp, Users,
  Workflow, Wrench, Zap, type LucideIcon, type LucideProps,
} from 'lucide-react';

const registry: Record<string, LucideIcon> = {
  Activity, ArrowRight, Banknote, Boxes, Bot, Brain, Briefcase, Building2, Cloud, Code2, Coins, Compass, Cpu,
  Database, Eye, Factory, Fingerprint, Flame, Gauge, GraduationCap, HeartPulse, KeyRound, Landmark, Layers,
  LifeBuoy, Network, Route, ScrollText, Search, Server, ShieldCheck, Sparkles, Store, Target, TrendingUp, Users,
  Workflow, Wrench, Zap,
};

/** Renders a Lucide icon by the key stored in the data layer. */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = registry[name] ?? Sparkles;
  return <Cmp aria-hidden="true" strokeWidth={1.75} {...props} />;
}

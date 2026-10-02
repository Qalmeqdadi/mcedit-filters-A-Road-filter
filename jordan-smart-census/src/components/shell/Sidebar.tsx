"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

const GROUPS = ["navHome", "navFoundation", "navToday", "navFutures", "navDecide", "navDeliver"] as const;

export function BrandMark({ size = 30 }: { size?: number }) {
  // UFUQ mark (not an official emblem): a sun rising over a horizon line drawn on a planning grid.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#132440" stroke="#2f62a6" strokeWidth="1" />
      <path d="M7 9h18M7 13h18M11 6v14M16 6v14M21 6v14" stroke="#22406b" strokeWidth="0.7" />
      <path d="M8.5 20a7.5 7.5 0 0 1 15 0z" fill="#d6c49f" />
      <path d="M16 9.5v2.2M10.2 12l1.5 1.5M21.8 12l-1.5 1.5" stroke="#d6c49f" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5.5 20.5h21" stroke="#f2ecdf" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 24.5h14" stroke="#4a7cc0" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { t, ar } = useI18n();
  const path = usePathname();
  return (
    <aside style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }} className={cn("no-print fixed inset-y-0 z-40 flex w-[264px] flex-col bg-navy-900 text-navy-100 transition-transform lg:translate-x-0", ar ? "right-0" : "left-0", open ? "translate-x-0" : ar ? "translate-x-full" : "-translate-x-full")}>
      <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-3.5">
        <BrandMark />
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold leading-tight text-white">{t("appName")}</div>
          <div className="truncate text-[10.5px] leading-tight text-navy-300">{t("appSubtitle")}</div>
        </div>
      </div>
      <nav className="nav-scroll flex-1 overflow-y-auto px-2 py-3">
        {GROUPS.map((g) => (
          <div key={g} className="mb-3">
            {g === "navHome" ? null : <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-300/70">{t(g)}</div>}
            {NAV.filter((n) => n.group === g).map((n) => {
              const active = n.href === "/" ? path === "/" : path === n.href || path.startsWith(`${n.href}/`);
              const Icon = n.icon;
              return (
                <Link key={n.href} href={n.href} onClick={onNavigate} className={cn("group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12.75px] leading-tight transition-colors", active ? "bg-white/10 font-medium text-white" : "text-navy-100/80 hover:bg-white/5 hover:text-white")}>
                  {active ? <span className={cn("absolute inset-y-1.5 w-[3px] rounded-full bg-sand-300", ar ? "-right-2" : "-left-2")} /> : null}
                  <span className={cn("w-[18px] font-mono text-[10.5px] tabular", active ? "text-sand-300" : "text-navy-300/60")}>{n.index}</span>
                  <Icon size={14} className={active ? "text-sand-200" : "text-navy-300/80 group-hover:text-navy-100"} />
                  <span className="truncate">{t(n.key)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/8 px-4 py-3 text-[10.5px] leading-snug text-navy-300">
        <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wider text-sand-300"><span className="h-1.5 w-1.5 rounded-full bg-sand-300" />{t("prototypeNotice")}</div>
        {ar ? "البيانات المرجعية والمحاكاة موسومة في كل لوحة. لا توجد بيانات شخصية حقيقية." : "Reference and simulated data are labelled on every panel. No real personal data."}
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { Hammer } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader } from "@/components/ui/panel";
import { NAV } from "@/lib/nav";

/** Placeholder for a module that ships in a later batch of this release. */
export function ComingNext({ href }: { href: string }) {
  const { t, L } = useI18n();
  const item = NAV.find((n) => n.href === href)!;
  return (
    <div>
      <PageHeader index={item.index} title={t(item.key)} />
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-card px-6 py-16 text-center">
        <Hammer size={22} className="text-sand-500" />
        <p className="max-w-md text-[13.5px] text-ink-700">{L("This module is being built and arrives in the next update of the platform.", "هذه الوحدة قيد البناء وستتوفر في التحديث القادم للمنصة.")}</p>
        <Link href="/siting" className="text-[13px] font-medium text-navy-600 hover:underline">{L("Open the Facility Siting Planner →", "افتح مخطط مواقع المرافق ←")}</Link>
      </div>
    </div>
  );
}

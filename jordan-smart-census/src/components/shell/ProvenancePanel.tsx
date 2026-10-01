"use client";

import { ExternalLink } from "lucide-react";
import { useApp } from "@/store/app";
import { useI18n } from "@/hooks/useI18n";
import { useSources } from "@/hooks/useSources";
import { Sheet } from "@/components/ui/dialog";
import { NatureBadge } from "@/components/ui/badges";
import { cn } from "@/lib/utils";

export function ProvenancePanel() {
  const open = useApp((s) => s.provenanceOpen);
  const ids = useApp((s) => s.provenanceIds);
  const close = useApp((s) => s.closeProvenance);
  const { t, tx, L } = useI18n();
  const sources = Object.values(useSources());
  const ordered = ids ? [...sources.filter((s) => ids.includes(s.id)), ...sources.filter((s) => !ids.includes(s.id))] : sources;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()} width={620} title={t("provenance")} description={L("Every dataset used by the platform, whether it is real or simulated, and how it was produced.", "كل مجموعة بيانات تستخدمها المنصة، وهل هي حقيقية أم محاكاة، وكيف أُنتجت.")}>
      <div className="space-y-3">
        {ordered.map((s) => (
          <article key={s.id} className={cn("rounded-lg border p-3.5", ids?.includes(s.id) ? "border-navy-500 bg-navy-100/40" : "border-line bg-card")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[10.5px] text-ink-400">{s.id}</div>
                <h4 className="text-[14px] font-semibold text-ink-900">{tx(s.name)}</h4>
              </div>
              <NatureBadge nature={s.nature} />
            </div>
            <dl className="mt-2 grid grid-cols-[130px_1fr] gap-x-3 gap-y-1 text-[12px]">
              <dt className="text-ink-500">{t("source")}</dt><dd className="text-ink-900">{s.source}</dd>
              <dt className="text-ink-500">{t("year")}</dt><dd className="text-ink-900">{s.year}</dd>
              <dt className="text-ink-500">{t("geography")}</dt><dd className="text-ink-900">{tx(s.geography)}</dd>
              <dt className="text-ink-500">{t("realOrSimulated")}</dt><dd className="text-ink-900">{t(`nat${s.nature}`)}</dd>
              <dt className="text-ink-500">{t("methodology")}</dt><dd className="leading-relaxed text-ink-900">{tx(s.methodology)}</dd>
              <dt className="text-ink-500">{t("lastUpdated")}</dt><dd className="text-ink-900">{s.lastUpdated}</dd>
              <dt className="text-ink-500">{t("notes")}</dt><dd className="leading-relaxed text-ink-900">{tx(s.notes)}</dd>
              {s.license ? (<><dt className="text-ink-500">{t("license")}</dt><dd className="text-ink-900">{s.license}</dd></>) : null}
            </dl>
            {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-navy-600 hover:underline">{s.url}<ExternalLink size={11} /></a> : null}
          </article>
        ))}
      </div>
    </Sheet>
  );
}

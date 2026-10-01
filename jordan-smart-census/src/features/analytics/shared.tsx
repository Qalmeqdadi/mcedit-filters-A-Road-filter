"use client";

import { useMemo, type ReactNode } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { Callout } from "@/components/ui/panel";
import { Select } from "@/components/ui/form";
import { NatureBadge } from "@/components/ui/badges";
import { JordanMap, type Scale } from "@/features/gis/JordanMap";
import { computeProfile, type Profile } from "@/simulation/analytics";
import { fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GovId } from "@/types/census";

/** Profile for the current scope, plus per-governorate and (if a governorate is selected) per-district profiles. */
export function useProfiles() {
  const engine = useEngine();
  const { govId, districtId, eaId } = useScope();
  const world = engine.world;
  const profile = useMemo(() => computeProfile(world, { govId: govId ?? undefined, districtId: districtId ?? undefined, eaId: eaId ?? undefined }), [world, govId, districtId, eaId]);
  const national = useMemo(() => computeProfile(world), [world]);
  const govProfiles = useMemo(() => Object.fromEntries(world.governorates.map((g) => [g.id, computeProfile(world, { govId: g.id })])) as Record<GovId, Profile>, [world]);
  const districtProfiles = useMemo(() => (govId ? Object.fromEntries(world.districts.filter((d) => d.govId === govId).map((d) => [d.id, computeProfile(world, { govId, districtId: d.id })])) : {}) as Record<string, Profile>, [world, govId]);
  return { profile, national, govProfiles, districtProfiles };
}

export function ScopeBar({ note }: { note?: ReactNode }) {
  const engine = useEngine();
  const { t, tx, L } = useI18n();
  const { govId, districtId, eaId } = useScope();
  const { selectGov, selectDistrict, selectEA } = useApp();
  const world = engine.world;
  const eas = districtId ? world.eas.filter((e) => e.districtId === districtId) : [];
  const finished = engine.phase === "FINISHED";
  const agg = engine.aggregate();
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{L("Drill-down", "التعمق")}</span>
        <Select value={govId ?? ""} onChange={(e) => selectGov((e.target.value || null) as GovId | null)} aria-label={t("governorate")}>
          <option value="">{t("allJordan")}</option>
          {world.governorates.map((g) => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}
        </Select>
        <Select value={districtId ?? ""} onChange={(e) => selectDistrict(e.target.value || null)} disabled={!govId} aria-label={t("district")}>
          <option value="">{t("districts")}: {t("all")}</option>
          {world.districts.filter((d) => d.govId === govId).map((d) => <option key={d.id} value={d.id}>{tx(d.name)}</option>)}
        </Select>
        <Select value={eaId ?? ""} onChange={(e) => selectEA(e.target.value || null)} disabled={!districtId} aria-label={t("ea")} className="max-w-[160px]">
          <option value="">{t("eas")}: {t("all")}</option>
          {eas.slice(0, 500).map((e) => <option key={e.id} value={e.id}>{e.id}</option>)}
        </Select>
        <div className="flex-1" />
        <NatureBadge nature="SIMULATED" />
      </div>
      <Callout tone="sim">
        {finished
          ? L("Simulated final census dataset (fieldwork closed). Distributions come from weighted synthetic microdata; totals are calibrated to the census frame. These are not Jordanian statistics.", "مجموعة بيانات تعداد نهائية محاكاة (أُغلق العمل الميداني). التوزيعات من بيانات جزئية اصطناعية مرجحة، والمجاميع معايرة إلى إطار التعداد. ليست إحصاءات أردنية.")
          : L(`Simulated results preview — fieldwork is ${fmtPct(agg.completionPct, 0)} complete. Distributions come from weighted synthetic microdata calibrated to the census frame. Not Jordanian statistics.`, `معاينة نتائج محاكاة — العمل الميداني منجز بنسبة ${fmtPct(agg.completionPct, 0)}. التوزيعات من بيانات جزئية اصطناعية مرجحة ومعايرة إلى إطار التعداد. ليست إحصاءات أردنية.`)}
        {note ? <> {note}</> : null}
      </Callout>
    </div>
  );
}

/** Choropleth of a profile-derived metric, with drill-down to districts. */
export function MetricMap({ metric, format, legend, scale = "seq", domain, height = 420, sources = ["SIM_MICRODATA", "GEO_ADM1", "GEO_ADM2"] }: { metric: (p: Profile) => number; format: (v: number) => string; legend: string; scale?: Scale; domain?: [number, number]; height?: number; sources?: string[] }) {
  const { govProfiles, districtProfiles } = useProfiles();
  const { govId, districtId } = useScope();
  const { selectGov, selectDistrict } = useApp();
  const govValues = useMemo(() => Object.fromEntries(Object.entries(govProfiles).map(([g, p]) => [g, metric(p)])) as Record<GovId, number>, [govProfiles, metric]);
  const districtValues = useMemo(() => Object.fromEntries(Object.entries(districtProfiles).filter(([, p]) => p.sampleHouseholds >= 15).map(([d, p]) => [d, metric(p)])), [districtProfiles, metric]);
  return (
    <JordanMap height={height} govValues={govValues} districtValues={districtValues} scale={scale} domain={domain} format={format} legendTitle={legend} selectedGov={govId} selectedDistrict={districtId} onSelectGov={selectGov} onSelectDistrict={(d) => selectDistrict(d)} sources={sources} />
  );
}

export interface Col {
  key: string;
  label: string;
  get: (p: Profile) => number;
  fmt: (v: number) => string;
}

/** Governorate comparison table (sortable by clicking headers). */
export function GovTable({ cols, onRow }: { cols: Col[]; onRow?: (g: GovId) => void }) {
  const engine = useEngine();
  const { tx, t } = useI18n();
  const { govProfiles, national } = useProfiles();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full min-w-[640px] text-[12.5px]">
        <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{t("governorate")}</th>{cols.map((c) => <th key={c.key} className="px-2 text-end">{c.label}</th>)}</tr></thead>
        <tbody>
          {engine.world.governorates.map((g) => (
            <tr key={g.id} onClick={() => (onRow ?? selectGov)(g.id)} className={cn("cursor-pointer border-b border-line/60 hover:bg-sand-50", govId === g.id && "bg-navy-100/50")}>
              <td className="py-1.5 font-medium">{tx(g.name)}</td>
              {cols.map((c) => <td key={c.key} className="px-2 text-end tabular">{c.fmt(c.get(govProfiles[g.id]))}</td>)}
            </tr>
          ))}
          <tr className="border-t-2 border-line-strong font-semibold"><td className="py-1.5">{t("jordan")}</td>{cols.map((c) => <td key={c.key} className="px-2 text-end tabular">{c.fmt(c.get(national))}</td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}

export function SmallSample({ p }: { p: Profile }) {
  const { L } = useI18n();
  if (p.sampleHouseholds >= 30) return null;
  return <Callout tone="warn" className="mb-3">{L(`Small sample in this scope (${p.sampleHouseholds} sampled households) — distributions are indicative only.`, `عينة صغيرة في هذا النطاق (${p.sampleHouseholds} أسرة معاينة) — التوزيعات استرشادية فقط.`)}</Callout>;
}

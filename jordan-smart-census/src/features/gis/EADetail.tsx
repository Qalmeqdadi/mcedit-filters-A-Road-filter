"use client";

import { useMemo } from "react";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { EAStatusChip, NatureBadge } from "@/components/ui/badges";
import { ProgressBar } from "@/components/ui/kpi";
import { StatRow } from "@/components/charts/common";
import { generateBlocks } from "@/simulation/generate";
import { fmt1, fmtInt, fmtPct } from "@/lib/format";

export function EADetail({ eaId, showBlocks = true }: { eaId: string; showBlocks?: boolean }) {
  const engine = useEngine();
  const { t, tx, L, lb } = useI18n();
  const k = engine.world.eaIdx.get(eaId);
  const a = k !== undefined ? engine.world.eas[k] : null;
  const blocks = useMemo(() => (a ? generateBlocks(engine.world.config.seed, a) : []), [a, engine.world.config.seed]);
  if (!a || k === undefined) return <p className="text-[12.5px] text-ink-500">{t("noData")}</p>;
  const s = engine.ea[k];
  const e = engine.world.enumerators[engine.world.enumIdx.get(a.enumeratorId)!];
  const sup = engine.world.supervisors[engine.world.supIdx.get(a.supervisorId)!];
  const pending = Math.max(0, a.hhEstimate - s.completed - s.refusals - s.noContactFinal);
  const hh = (engine.world.hhByEa.get(a.id) ?? []).map((i) => engine.world.households[i]).filter((h) => !h.planted || h.planted !== "DUPLICATE_ID");
  const maxB = Math.max(...blocks.map((b) => b.dwellings), 1);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[15px] font-semibold text-ink-900">{a.id}</span>
        <EAStatusChip s={s.status} />
        <NatureBadge nature="SIMULATED" />
      </div>
      <div className="text-[12.5px] text-ink-500">{tx(engine.world.gov[a.govId].name)} › {tx(engine.world.district[a.districtId].name)} · {a.urban ? t("urban") : t("rural")} · {a.lat.toFixed(4)}, {a.lng.toFixed(4)}</div>
      <div>
        <div className="mb-1 flex justify-between text-[11.5px] text-ink-500"><span>{t("kCompletion")}</span><span className="tabular">{fmtPct(s.visited / a.dwellingsTrue, 0)}</span></div>
        <ProgressBar value={s.visited / a.dwellingsTrue} />
      </div>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <div>
          <StatRow label={L("Population estimate", "تقدير السكان")} value={fmtInt(a.popEstimate)} />
          <StatRow label={L("Household estimate", "تقدير الأسر")} value={fmtInt(a.hhEstimate)} />
          <StatRow label={t("dwellings")} value={fmtInt(a.dwellings)} sub={L("listed", "محصاة")} />
          <StatRow label={L("Statistical blocks", "البلوكات الإحصائية")} value={fmtInt(a.blocks)} />
          <StatRow label={L("Assigned enumerator", "العدّاد المسند")} value={<span className="font-mono text-[12px]">{a.enumeratorId}</span>} sub={tx(e.name)} />
          <StatRow label={L("Supervisor", "المشرف")} value={<span className="font-mono text-[12px]">{a.supervisorId}</span>} sub={tx(sup.name)} />
          <StatRow label={L("Expected workload", "عبء العمل المتوقع")} value={`${a.expectedDays} ${t("days")}`} sub={`${L("from day", "من اليوم")} ${a.startDay + 1}`} />
        </div>
        <div>
          <StatRow label={L("Completed households", "الأسر المكتملة")} value={fmtInt(s.completed)} />
          <StatRow label={L("Pending households", "الأسر المتبقية")} value={fmtInt(pending)} />
          <StatRow label={L("Refusals", "حالات الرفض")} value={fmtInt(s.refusals)} />
          <StatRow label={L("Vacant dwellings found", "المساكن الشاغرة المكتشفة")} value={fmtInt(s.vacantFound)} />
          <StatRow label={L("Revisits pending / done", "زيارات المتابعة المتبقية / المنجزة")} value={`${fmtInt(s.noContactPending + s.supervisorRevisit)} / ${fmtInt(s.revisitsDone)}`} />
          <StatRow label={L("Accessibility score", "درجة سهولة الوصول")} value={fmt1(a.accessibility * 100)} />
          <StatRow label={`${t("coverageScore")} / ${t("riskScore")}`} value={`${s.coverageScore} / ${s.riskScore}`} />
        </div>
      </div>
      {showBlocks ? (
        <div>
          <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">{L("Statistical blocks → dwellings", "البلوكات الإحصائية ← المساكن")}</div>
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
            {blocks.map((b, i) => {
              const done = Math.min(b.dwellings, Math.max(0, s.visited - blocks.slice(0, i).reduce((x, y) => x + y.dwellings, 0)));
              return (
                <div key={b.id} title={`${b.id}: ${b.dwellings} ${t("dwellings").toLowerCase()}, ${b.buildings} ${L("buildings", "مبنى")}`} className="rounded border border-line bg-sand-50 p-1">
                  <div className="font-mono text-[9.5px] text-ink-500">B{String(i + 1).padStart(2, "0")}</div>
                  <div className="mt-0.5 h-1 rounded bg-sand-200"><div className="h-1 rounded bg-ok" style={{ width: `${(done / b.dwellings) * 100}%` }} /></div>
                  <div className="mt-0.5 text-[10px] text-ink-700 tabular" style={{ opacity: 0.5 + (0.5 * b.dwellings) / maxB }}>{b.dwellings} · {b.buildings}{L("b", "م")}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {hh.length ? (
        <div>
          <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-500">{L("Sampled dwellings & households (synthetic microdata)", "مساكن وأسر معاينة (بيانات جزئية اصطناعية)")}</div>
          <table className="w-full text-[12px]">
            <thead><tr className="text-[10.5px] uppercase text-ink-500"><th className="py-1 text-start">{L("Household", "الأسرة")}</th><th className="text-start">{t("dwelling")}</th><th className="text-end">{t("persons")}</th><th className="text-start">{L("Type", "النوع")}</th></tr></thead>
            <tbody>
              {hh.slice(0, 8).map((h) => (
                <tr key={h.id} className="border-t border-line/60"><td className="py-1 font-mono text-[11px]">{h.id}</td><td>{lb("dwellingType", h.dwelling.type)} · {lb("tenure", h.dwelling.tenure)}</td><td className="text-end tabular">{h.members.length}</td><td>{lb("hhType", h.type)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

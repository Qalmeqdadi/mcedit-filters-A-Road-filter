"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Pill, SeverityBadge } from "@/components/ui/badges";
import { robustness, type Robustness as R } from "@/simulation/lab/futures";
import { ACTION_SECTORS, SECTOR_LABEL, type ActionSector } from "@/simulation/lab/actions";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GovId } from "@/types/census";
import { Formula, Method } from "./shared";
import { FuturesBar, FuturesProgress, useFutures } from "./futuresShared";

const ROB: Record<R, { en: string; ar: string; what: { en: string; ar: string }; cls: string }> = {
  NO_REGRET: { en: "No-regret — do now", ar: "بلا ندم — نفّذ الآن", what: { en: "Needed in all four futures.", ar: "لازم في المستقبلات الأربعة." }, cls: "border-ok/40 bg-ok-bg text-ok" },
  ROBUST: { en: "Robust — prepare and start", ar: "متين — جهّز وابدأ", what: { en: "Needed in three of four futures.", ar: "لازم في ثلاثة من أربعة مستقبلات." }, cls: "border-navy-300 bg-navy-100 text-navy-800" },
  CONTINGENT: { en: "Contingent — trigger on a signpost", ar: "مشروط — يُفعَّل عند مؤشر إنذار", what: { en: "Needed in only one or two futures: design it now, launch it when its signpost appears.", ar: "لازم في مستقبل أو اثنين فقط: صمّمه الآن وأطلقه عند ظهور مؤشر الإنذار." }, cls: "border-warn/40 bg-warn-bg text-warn" },
};

const jod = (m: number) => (m >= 1000 ? `JOD ${fmt1(m / 1000)}bn` : `JOD ${fmt1(m)}M`);

const QUAD_COLOR = ["#159a83", "#d4a017", "#2f62a6", "#b5453a"];

export function Robustness() {
  const engine = useEngine();
  const { t, tx, L } = useI18n();
  const govId = useApp((s) => s.govId);
  const selectGov = useApp((s) => s.selectGov);
  const { futures, runs, progress, year } = useFutures();
  const [sector, setSector] = useState<ActionSector | "ALL">("ALL");
  const items = useMemo(() => (runs ? robustness(runs) : []), [runs]);
  const shown = items.filter((x) => (!govId || x.govId === govId) && (sector === "ALL" || x.sector === sector));
  const count = (r: R) => shown.filter((x) => x.robustness === r).length;
  const cost = (r: R) => shown.filter((x) => x.robustness === r).reduce((s, x) => s + x.costMin, 0);
  const exportCsv = () => downloadCsv(`robustness-${year}.csv`, shown.map((x) => ({ governorate: engine.world.gov[x.govId as GovId].name.en, sector: x.sector, action: x.title.en, robustness: x.robustness, futures_needing_it: x.presentIn.length, futures: x.presentIn.map((k) => futures.find((f) => f.key === k)?.name.en).join(" | "), cost_min_jod_m: x.costMin.toFixed(1), cost_max_jod_m: x.costMax.toFixed(1), max_severity: x.maxSeverity, trigger_signposts: x.triggers.map((s) => s.en).join(" | "), horizon: year, data_nature: "SIMULATED" })));

  return (
    <div>
      <PageHeader index={navIndex("/robustness")} title={t("navRobust")} subtitle={L("Which actions hold up whatever the future brings? Every corrective action is generated in each of the four scenario futures and classified: no-regret (needed in all), robust (three of four) or contingent (prepare now, trigger on a signpost).", "أي الإجراءات تصمد مهما حمل المستقبل؟ يُولَّد كل إجراء تصحيحي في كل من المستقبلات الأربعة ويُصنَّف: بلا ندم (لازم في جميعها)، أو متين (ثلاثة من أربعة)، أو مشروط (جهّزه الآن وفعّله عند مؤشر الإنذار).")}>
        <Button onClick={exportCsv} disabled={!runs}>{t("exportCsv")}</Button>
      </PageHeader>
      <FuturesBar />
      {!runs ? <FuturesProgress progress={progress} /> : (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label={L("No-regret actions", "إجراءات بلا ندم")} value={fmtInt(count("NO_REGRET"))} sub={`≈ ${jod(cost("NO_REGRET"))} ${L("minimum", "حداً أدنى")}`} tone="ok" nature="SIMULATED" sources={["SIM_ACTIONS"]} />
            <Kpi label={L("Robust actions", "إجراءات متينة")} value={fmtInt(count("ROBUST"))} sub={`≈ ${jod(cost("ROBUST"))}`} nature="SIMULATED" />
            <Kpi label={L("Contingent actions", "إجراءات مشروطة")} value={fmtInt(count("CONTINGENT"))} sub={`≈ ${jod(cost("CONTINGENT"))}`} tone="warn" nature="SIMULATED" />
            <div className="col-span-2 rounded-lg border border-line bg-card px-3.5 py-3 md:col-span-3">
              <div className="text-[11.5px] font-medium text-ink-500">{L("Futures tested", "المستقبلات المختبرة")} · {year}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">{runs.map((r, i) => <span key={r.future.key} className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[12px]"><span className="h-2 w-2 rounded-full" style={{ background: QUAD_COLOR[i] }} />{tx(r.future.name)}</span>)}</div>
            </div>
          </div>
          <Callout className="mt-3">{L("A strategy that holds up: fund the no-regret actions now, start the robust ones, and keep the contingent ones designed and costed, ready to launch when their signpost is observed.", "استراتيجية متينة: موّل الإجراءات بلا ندم الآن، وابدأ المتينة، وأبقِ المشروطة مصممة ومسعّرة وجاهزة للإطلاق عند رصد مؤشر الإنذار.")}</Callout>
          <Panel className="mt-3" title={L("Actions by robustness", "الإجراءات حسب المتانة")} subtitle={govId ? tx(engine.world.gov[govId].name) : L("All governorates", "جميع المحافظات")} nature="SIMULATED" sources={["SIM_ACTIONS"]}>
            <div className="mb-3 flex flex-wrap gap-1.5"><Select value={govId ?? ""} onChange={(e) => selectGov((e.target.value || null) as GovId | null)} aria-label={t("governorate")}><option value="">{t("allJordan")}</option>{engine.world.governorates.map((g) => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}</Select><Select value={sector} onChange={(e) => setSector(e.target.value as ActionSector | "ALL")} aria-label={L("Sector", "القطاع")}><option value="ALL">{L("All sectors", "جميع القطاعات")}</option>{ACTION_SECTORS.map((s) => <option key={s} value={s}>{tx(SECTOR_LABEL[s])}</option>)}</Select></div>
            <div className="grid gap-4 xl:grid-cols-3">
              {(["NO_REGRET", "ROBUST", "CONTINGENT"] as R[]).map((r) => (
                <div key={r} className="min-w-0">
                  <div className={cn("mb-2 rounded-md border px-2.5 py-1.5", ROB[r].cls)}><div className="text-[12.5px] font-semibold">{L(ROB[r].en, ROB[r].ar)} · {count(r)}</div><div className="text-[11.5px] opacity-90">{tx(ROB[r].what)}</div></div>
                  <div className="thin-scroll max-h-[640px] space-y-2 overflow-y-auto pe-1">
                    {shown.filter((x) => x.robustness === r).slice(0, 60).map((x) => (
                      <article key={x.key} className="rounded-lg border border-line bg-card px-3 py-2.5" data-testid="robust-item">
                        <div className="flex flex-wrap items-center gap-1.5"><SeverityBadge s={x.maxSeverity} /><Pill>{tx(SECTOR_LABEL[x.sector])}</Pill><Pill>{tx(engine.world.gov[x.govId as GovId].name)}</Pill></div>
                        <div className="mt-1 text-[13px] font-semibold leading-snug text-ink-900">{tx(x.title)}</div>
                        <div className="mt-1.5 flex items-center gap-1" title={x.presentIn.map((k) => tx(futures.find((f) => f.key === k)!.name)).join(", ")}>
                          {futures.map((f, i) => <span key={f.key} className={cn("h-2.5 w-6 rounded-sm", x.presentIn.includes(f.key) ? "" : "bg-sand-100")} style={x.presentIn.includes(f.key) ? { background: QUAD_COLOR[i] } : undefined} />)}
                          <span className="ms-1 text-[11px] text-ink-500 tabular">{x.presentIn.length}/4 · JOD {x.costMin === x.costMax ? fmt1(x.costMin) : `${fmt1(x.costMin)}–${fmt1(x.costMax)}`}M</span>
                        </div>
                        {x.triggers.length ? <div className="mt-1.5 text-[11.5px] text-ink-700"><b>{L("Trigger when", "يُفعَّل عند")}: </b>{x.triggers.map((s) => tx(s)).join(" · ")}</div> : null}
                      </article>
                    ))}
                    {count(r) === 0 ? <p className="text-[12px] text-ink-500">{L("None.", "لا يوجد.")}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
      <Method>
        <Formula>{"same action = same governorate + same action type; no-regret = in 4/4 futures · robust = 3/4 · contingent = 1–2/4"}</Formula>
        <p>{L("Costs show the range across the futures in which the action is needed: a wide range means the action should be built in modules that can be scaled up or down. Triggers are the signposts of the scenario poles shared by every future that needs the action.", "تعرض التكاليف المدى عبر المستقبلات التي يلزم فيها الإجراء: المدى الواسع يعني ضرورة تنفيذ الإجراء على وحدات قابلة للتوسعة أو التقليص. المحفزات هي مؤشرات الإنذار لأقطاب السيناريو المشتركة بين كل المستقبلات التي تحتاج الإجراء.")}</p>
      </Method>
    </div>
  );
}

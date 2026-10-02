"use client";

import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { navIndex } from "@/lib/nav";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FutureOutcome, FutureRun } from "@/simulation/lab/futures";
import { Formula, Method } from "./shared";
import { FuturesBar, FuturesProgress, useFutures } from "./futuresShared";

type Row = { key: keyof FutureOutcome; en: string; ar: string; fmt: (v: number | null, locale: "en" | "ar") => string; better: "low" | "high" };

const ROWS: Row[] = [
  { key: "population", en: "Population", ar: "السكان", fmt: (v, l) => fmtCompact(v ?? 0, l), better: "low" },
  { key: "a65share", en: "Share aged 65+", ar: "نسبة 65+", fmt: (v) => fmtPct(v ?? 0), better: "low" },
  { key: "schoolGap", en: "School seat gap", ar: "فجوة المقاعد المدرسية", fmt: (v, l) => fmtCompact(v ?? 0, l), better: "low" },
  { key: "phcGap", en: "Residents beyond primary-care capacity", ar: "سكان خارج طاقة الرعاية الأولية", fmt: (v, l) => fmtCompact(v ?? 0, l), better: "low" },
  { key: "homes2035", en: "Homes needed to 2035", ar: "مساكن لازمة حتى 2035", fmt: (v, l) => fmtCompact(v ?? 0, l), better: "low" },
  { key: "jobsPerYear", en: "Jobs needed per year", ar: "وظائف لازمة سنوياً", fmt: (v, l) => fmtCompact(v ?? 0, l), better: "low" },
  { key: "unemployment", en: "Unemployment (implied)", ar: "البطالة (الضمنية)", fmt: (v) => fmtPct(v ?? 0), better: "low" },
  { key: "waterRatio", en: "Water supply ÷ requirement", ar: "الإمداد المائي ÷ الاحتياج", fmt: (v) => fmtPct(v ?? 0, 0), better: "high" },
  { key: "stressYear", en: "Water stress begins", ar: "بداية الإجهاد المائي", fmt: (v) => (v ? String(v) : "—"), better: "high" },
  { key: "heatAtRisk", en: "People at heat risk", ar: "المعرضون لخطر الحر", fmt: (v, l) => fmtCompact(v ?? 0, l), better: "low" },
  { key: "ammanNewKm2", en: "New urban land, Greater Amman (km²)", ar: "أرض حضرية جديدة، عمّان الكبرى (كم²)", fmt: (v) => fmtInt(v ?? 0), better: "low" },
  { key: "urgentActions", en: "High / critical actions", ar: "إجراءات مرتفعة / حرجة", fmt: (v) => fmtInt(v ?? 0), better: "low" },
  { key: "costM", en: "Indicative cost of all actions (JOD bn)", ar: "الكلفة التقديرية لكل الإجراءات (مليار دينار)", fmt: (v) => ((v ?? 0) / 1000).toFixed(1), better: "low" },
];

const QUAD_COLOR = ["#159a83", "#d4a017", "#2f62a6", "#b5453a"];

function rankClass(runs: FutureRun[], r: Row, i: number) {
  const vals = runs.map((x) => (x.outcome[r.key] as number | null) ?? (r.key === "stressYear" ? 9999 : 0));
  const v = vals[i];
  const best = r.better === "low" ? Math.min(...vals) : Math.max(...vals);
  const worst = r.better === "low" ? Math.max(...vals) : Math.min(...vals);
  if (best === worst) return "";
  return v === best ? "text-ok font-semibold" : v === worst ? "text-crit font-semibold" : "";
}

export function Futures() {
  const { t, tx, L, locale } = useI18n();
  const { futures, runs, progress, year, axes } = useFutures();
  const exportCsv = () => runs && downloadCsv(`scenario-futures-${axes.join("-")}-${year}.csv`, ROWS.map((r) => ({ indicator: r.en, ...Object.fromEntries(runs.map((x) => [x.future.name.en, x.outcome[r.key] ?? ""])), horizon: year, data_nature: "SIMULATED" })));
  const A = futures[0].poles[0].axis;
  const B = futures[0].poles[1].axis;
  return (
    <div>
      <PageHeader index={navIndex("/futures")} title={t("navScenarioFutures")} subtitle={L("Strategic foresight with the 2 × 2 scenario matrix. Choose the two most important uncertainties; their combinations give four coherent futures for Jordan. Every Planning Lab model is re-run in each future, so outcomes and actions can be compared side by side.", "استشراف استراتيجي بمصفوفة السيناريوهات 2 × 2. اختر أهم مصدرين لعدم اليقين؛ فتنتج توليفاتهما أربعة مستقبلات متسقة للأردن. يُعاد تشغيل جميع نماذج مختبر التخطيط في كل مستقبل لمقارنة النتائج والإجراءات جنباً إلى جنب.")}>
        <Link href="/robustness"><Button>{L("Robustness test", "اختبار المتانة")}<ArrowRight size={13} className="rtl:rotate-180" /></Button></Link>
        <Button onClick={exportCsv} disabled={!runs}>{t("exportCsv")}</Button>
      </PageHeader>
      <FuturesBar />
      <Callout tone="sim" className="mb-3">{L("Futures are not predictions: they are plausible, internally consistent stories used to test plans. Pole assumptions are illustrative and editable in the code.", "المستقبلات ليست تنبؤات: إنها قصص معقولة ومتسقة داخلياً تُستخدم لاختبار الخطط. افتراضات الأقطاب توضيحية وقابلة للتعديل في الشيفرة.")}</Callout>
      {!runs ? <FuturesProgress progress={progress} /> : (
        <>
          <div className="grid gap-2 md:grid-cols-[28px_minmax(0,1fr)]">
            <div className="hidden items-center justify-center md:flex"><span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-ink-500 [writing-mode:vertical-rl] rotate-180">{tx(A.name)} →</span></div>
            <div className="grid gap-3 md:grid-cols-2">
              {runs.map((r, i) => (
                <section key={r.future.key} className="rounded-lg border border-line bg-card" data-testid="future-card">
                  <div className="h-1 rounded-t-lg" style={{ background: QUAD_COLOR[i] }} />
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {r.future.poles.map((p) => <span key={p.axis.id} className="rounded border border-line bg-sand-50 px-1.5 py-0.5 text-ink-700">{tx(p.axis[p.pole].label)}</span>)}
                    </div>
                    <h3 className="mt-1.5 text-[17px] font-semibold text-ink-900">{tx(r.future.name)}</h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-700">{tx(r.future.narrative)}</p>
                    <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-3">
                      {ROWS.filter((x) => ["population", "unemployment", "waterRatio", "schoolGap", "homes2035", "heatAtRisk"].includes(x.key)).map((x) => (
                        <div key={x.key} className="min-w-0"><div className="truncate text-ink-500">{L(x.en, x.ar)}</div><div className={cn("tabular text-[13.5px] text-ink-900", rankClass(runs, x, i))}>{x.fmt(r.outcome[x.key] as number | null, locale)}</div></div>
                      ))}
                    </div>
                    <div className="mt-2.5 flex items-start gap-1.5 rounded-md bg-sand-50 px-2.5 py-1.5 text-[11.5px] text-ink-700"><Eye size={13} className="mt-0.5 shrink-0 text-navy-600" /><span><b>{L("Signposts", "مؤشرات الإنذار")}: </b>{r.future.signposts.map((s) => tx(s)).join(" · ")}</span></div>
                  </div>
                </section>
              ))}
            </div>
          </div>
          <div className="mt-1 hidden text-center md:block md:ps-[36px] text-[11px] font-semibold uppercase tracking-wider text-ink-500">{tx(B.name)} →</div>

          <Panel className="mt-3" title={`${L("Four futures compared", "مقارنة المستقبلات الأربعة")} — ${year}`} subtitle={L("Green = best of the four, red = worst", "الأخضر = الأفضل بين الأربعة، الأحمر = الأسوأ")} nature="SIMULATED" sources={["SIM_PROJECTION", "SIM_SMALL_AREA", "SIM_WATER", "SIM_JOBS", "SIM_CLIMATE", "SIM_URBAN_CA", "SIM_ACTIONS"]}>
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[720px] text-[12.5px]">
                <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1.5 text-start">{L("Outcome", "النتيجة")}</th>{runs.map((r, i) => <th key={r.future.key} className="px-2 text-end"><span className="me-1 inline-block h-2 w-2 rounded-full" style={{ background: QUAD_COLOR[i] }} />{tx(r.future.name)}</th>)}</tr></thead>
                <tbody>
                  {ROWS.map((row) => <tr key={row.key} className="border-b border-line/60"><td className="py-1.5 pe-2 text-ink-700">{L(row.en, row.ar)}</td>{runs.map((r, i) => <td key={r.future.key} className={cn("px-2 text-end tabular", rankClass(runs, row, i))}>{row.fmt(r.outcome[row.key] as number | null, locale)}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
      <Method>
        <Formula>{"future = base assumptions → pole A changes → pole B changes; then projection, small-area, siting, housing, water, jobs, climate, urban-growth and action-plan models all re-run"}</Formula>
        <p>{L("Six uncertainties are available (migration, water, economy, climate, fertility, urban development). Each pole sets explicit parameters — for example “Severe scarcity” delays new desalination supply to 2036, raises aquifer decline to 2% a year and drought probability to 30%. Signposts are the observable indicators that tell you which future is unfolding.", "تتوفر ستة مصادر لعدم اليقين (الهجرة، المياه، الاقتصاد، المناخ، الخصوبة، التنمية العمرانية). يحدد كل قطب معاملات صريحة — مثلاً «الشح الحاد» يؤخر إمداد التحلية الجديد إلى 2036 ويرفع تراجع الأحواض إلى 2% سنوياً واحتمال الجفاف إلى 30%. مؤشرات الإنذار هي المؤشرات القابلة للرصد التي تكشف أي مستقبل يتحقق.")}</p>
      </Method>
    </div>
  );
}

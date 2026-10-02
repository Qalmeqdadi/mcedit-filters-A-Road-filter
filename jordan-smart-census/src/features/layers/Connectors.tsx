"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowRight, CheckCircle2, Cloud, Database, FileUp, Plug, RefreshCw, Trash2 } from "lucide-react";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Kpi } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { ProvenanceButton } from "@/components/ui/provenance";
import { EChart } from "@/components/charts/echart";
import { line, VIZ } from "@/components/charts/builders";
import { CONNECTORS, IMPORT_DATASETS, refreshOpenData, registerGovAliases, templateCsv, validateImport, type ConnectorKind, type ImportDataset, type ValidationResult } from "@/data/connectors";
import { JOD_PER_USD, latest, openData } from "@/data/openData";
import { OPEN_DATA_SNAPSHOT } from "@/data/openData.generated";
import { useConnectors } from "@/store/connectors";
import { downloadText } from "@/lib/csv";
import { isHosted } from "@/lib/hosted";
import { navIndex } from "@/lib/nav";
import { fmt1, fmtInt } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND: Record<ConnectorKind, { en: string; ar: string; cls: string }> = {
  EMBEDDED: { en: "Embedded", ar: "مضمّن", cls: "border-navy-300 bg-navy-100 text-navy-800" },
  OPEN: { en: "Open data · live", ar: "بيانات مفتوحة · مباشرة", cls: "border-ok/40 bg-ok-bg text-ok" },
  IMPORT: { en: "Your official data", ar: "بياناتك الرسمية", cls: "border-warn/40 bg-warn-bg text-warn" },
  PLANNED: { en: "Ready to configure", ar: "جاهز للإعداد", cls: "border-line-strong bg-sand-50 text-ink-700" },
};

function ImportCard({ ds }: { ds: ImportDataset }) {
  const engine = useEngine();
  const { L, tx, locale } = useI18n();
  const imports = useConnectors((s) => s.imports);
  const applyImport = useConnectors((s) => s.applyImport);
  const removeImport = useConnectors((s) => s.removeImport);
  const conn = CONNECTORS.find((c) => c.id === ds.id)!;
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("pasted.csv");
  const [check, setCheck] = useState<ValidationResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = imports[ds.id];
  const validate = (t: string) => { registerGovAliases(engine.world.governorates); setCheck(validateImport(ds, t)); };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const t = await f.text();
    setFileName(f.name);
    setText(t);
    validate(t);
    e.target.value = "";
  };
  return (
    <div className="rounded-lg border border-line bg-card p-3" data-testid={`import-${ds.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0"><div className="text-[13px] font-semibold text-ink-900">{tx(conn.name)}</div><div className="text-[11.5px] text-ink-500">{conn.provider} · {tx(ds.unit)}</div></div>
        {current ? <span className="inline-flex items-center gap-1 rounded border border-ok/40 bg-ok-bg px-1.5 py-0.5 text-[11px] font-semibold text-ok"><CheckCircle2 size={12} />{L("Applied", "مطبّق")}</span> : null}
      </div>
      <div className="mt-1 text-[12px] text-ink-700"><b>{L("Changes", "يغيّر")}:</b> {tx(conn.feeds)}</div>
      {current ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-ink-700">
          <span>{current.fileName} · {Object.keys(current.values).length} {L("governorates", "محافظة")} · {new Date(current.importedAt).toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          <Button size="xs" variant="ghost" onClick={() => removeImport(ds.id)}><Trash2 size={12} />{L("Remove", "إزالة")}</Button>
        </div>
      ) : null}
      <textarea value={text} onChange={(e) => { setText(e.target.value); setFileName("pasted.csv"); setCheck(null); }} rows={3} dir="ltr" placeholder={"governorate,value\nAMM,…\nIRB,…"} className="mt-2 w-full rounded-md border border-line-strong bg-card px-2 py-1.5 font-mono text-[12px] text-ink-900 focus:border-navy-500 focus:outline-none" data-testid={`import-text-${ds.id}`} />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <Button size="xs" onClick={() => validate(text)} disabled={!text.trim()} data-testid={`import-validate-${ds.id}`}>{L("Validate", "تحقق")}</Button>
        <Button size="xs" onClick={() => fileRef.current?.click()}><FileUp size={12} />{L("Upload CSV", "رفع CSV")}</Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={onFile} />
        <Button size="xs" variant="ghost" onClick={() => downloadText(`${ds.id}-template.csv`, templateCsv(ds), "text/csv")}>{L("Template", "القالب")}</Button>
        {check?.ok ? <Button size="xs" variant="success" onClick={() => { applyImport({ id: ds.id, fileName, importedAt: new Date().toISOString(), values: check.values }); setCheck(null); setText(""); }} data-testid={`import-apply-${ds.id}`}>{L("Apply to the models", "تطبيق على النماذج")}</Button> : null}
      </div>
      {check ? (
        <div className="mt-2 rounded-md bg-sand-50 px-2.5 py-1.5 text-[12px]" data-testid={`import-report-${ds.id}`}>
          <div className={cn("font-semibold", check.ok ? "text-ok" : "text-crit")}>{check.ok ? L(`Valid — ${Object.keys(check.values).length} governorates`, `صالح — ${Object.keys(check.values).length} محافظة`) : L("Not valid", "غير صالح")}</div>
          <ul className="mt-0.5 space-y-0.5">{check.issues.map((x, i) => <li key={i} className={x.level === "error" ? "text-crit" : "text-warn"}>{x.row ? `${L("Row", "الصف")} ${x.row}: ` : ""}{tx(x.message)}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}

export function Connectors() {
  const { t, tx, L, ar } = useI18n();
  const refreshed = useConnectors((s) => s.refreshed);
  const setRefreshed = useConnectors((s) => s.setRefreshed);
  const imports = useConnectors((s) => s.imports);
  useConnectors((s) => s.dataVersion);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const d = openData();
  const gdp = latest(d.gdpUsd);
  const pop = latest(d.population);
  const cpi = latest(d.inflation);
  const el = latest(d.electricity, (x) => x.demandTWh);
  const valueOf: Record<string, string> = {
    "wb-gdp": gdp ? `${gdp.year}: US$ ${fmt1(gdp.value / 1e9)}bn ≈ JOD ${fmt1((gdp.value * JOD_PER_USD) / 1e9)}bn` : "—",
    "wb-pop": pop ? `${pop.year}: ${fmtInt(pop.value)}` : "—",
    "wb-cpi": cpi ? `${cpi.year}: ${fmt1(cpi.value)}%` : "—",
    "owid-energy": el ? `${el.year}: ${fmt1(el.demandTWh ?? 0)} TWh · ${fmt1(latest(d.electricity, (x) => x.renewablesShare)?.renewablesShare ?? 0)}% ${L("renewable", "متجددة")}` : "—",
  };
  const metaOf: Record<string, string> = { "wb-gdp": "OPEN_WB_GDP", "wb-pop": "OPEN_WB_POP", "wb-cpi": "OPEN_WB_CPI", "owid-energy": "OPEN_OWID_ENERGY" };
  const histChart = useMemo(() => {
    const years = Array.from(new Set([...d.gdpUsd, ...d.population, ...d.electricity].map((x) => x.year))).filter((y) => y >= 2000).sort((a, b) => a - b);
    const idx = (vals: (number | null | undefined)[]) => { const b = vals.find((v) => v != null); return vals.map((v) => (v != null && b ? +((v / b) * 100).toFixed(1) : null)); };
    return line(years, [
      { name: L("GDP (current US$)", "الناتج (دولار جارٍ)"), data: idx(years.map((y) => d.gdpUsd.find((x) => x.year === y)?.value)), color: VIZ[0] },
      { name: L("Electricity demand", "الطلب على الكهرباء"), data: idx(years.map((y) => d.electricity.find((x) => x.year === y)?.demandTWh)), color: VIZ[1] },
      { name: L("Population", "السكان"), data: idx(years.map((y) => d.population.find((x) => x.year === y)?.value)), color: VIZ[2], dashed: true },
    ], { rtl: ar, legend: true });
  }, [d, ar, L]);
  const refresh = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const next = await refreshOpenData(openData());
      setRefreshed(next);
      setMsg({ ok: true, text: L(`Refreshed ${next.sources.length} sources from their open mirrors.`, `حُدّثت ${next.sources.length} مصادر من نسخها المفتوحة.`) });
    } catch (e) {
      setMsg({ ok: false, text: isHosted() ? L("This shared page cannot reach outside websites (the hosting sandbox blocks it). The snapshot bundled at build time is used; open the offline file or the app to refresh live.", "لا تستطيع هذه الصفحة المشتركة الوصول إلى مواقع خارجية (يمنع ذلك صندوق الاستضافة). تُستخدم النسخة المضمنة عند البناء؛ افتح الملف دون اتصال أو التطبيق للتحديث المباشر.") : L(`Could not reach the source: ${String((e as Error).message ?? e)}`, `تعذر الوصول إلى المصدر: ${String((e as Error).message ?? e)}`) });
    }
    setBusy(false);
  };
  const count = (k: ConnectorKind) => CONNECTORS.filter((c) => c.kind === k).length;
  const groups: ConnectorKind[] = ["OPEN", "EMBEDDED", "PLANNED"];

  return (
    <div>
      <PageHeader index={navIndex("/connectors")} title={t("navConnectors")} subtitle={L("Where UFUQ's data come from and how to plug in real data. Open datasets are fetched with their provenance, your official tables can be imported and validated, and every production source has a defined connector ready to configure.", "من أين تأتي بيانات أفق وكيف تُربط البيانات الحقيقية. تُجلب مجموعات البيانات المفتوحة مع مصادرها، ويمكن استيراد جداولك الرسمية والتحقق منها، ولكل مصدر تشغيلي موصل معرّف جاهز للإعداد.")}>
        <Button onClick={refresh} disabled={busy} data-testid="refresh-open-data"><RefreshCw size={13} className={busy ? "animate-spin" : ""} />{L("Refresh open data", "تحديث البيانات المفتوحة")}</Button>
      </PageHeader>
      {msg ? <Callout tone={msg.ok ? "info" : "warn"} className="mb-3">{msg.text}</Callout> : null}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={L("Open-data connectors", "موصلات البيانات المفتوحة")} value={fmtInt(count("OPEN"))} sub={L("World Bank WDI, Our World in Data", "البنك الدولي، Our World in Data")} nature="REFERENCE" />
        <Kpi label={L("Embedded reference data", "بيانات مرجعية مضمّنة")} value={fmtInt(count("EMBEDDED"))} nature="REFERENCE" />
        <Kpi label={L("Your datasets applied", "مجموعات بياناتك المطبقة")} value={`${Object.keys(imports).length} / ${IMPORT_DATASETS.length}`} tone={Object.keys(imports).length ? "ok" : undefined} />
        <Kpi label={L("Production connectors defined", "موصلات تشغيلية معرّفة")} value={fmtInt(count("PLANNED"))} />
        <Kpi label={L("Open data as of", "البيانات المفتوحة بتاريخ")} value={<span className="text-[15px]">{new Date(d.fetchedAt).toISOString().slice(0, 10)}</span>} sub={refreshed ? L("refreshed in this browser", "حُدّثت في هذا المتصفح") : L("bundled at build", "مضمّنة عند البناء")} />
        <Kpi label={L("Jordan rows loaded", "صفوف الأردن المحمّلة")} value={fmtInt(d.sources.reduce((s, x) => s + x.rows, 0))} sub={`${d.sources.length} ${L("sources", "مصادر")}`} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Panel title={L("Connector registry", "سجل الموصلات")} subtitle={L("Every source, what it feeds and its status", "كل مصدر وما يغذيه وحالته")}>
          <div className="space-y-4">
            {groups.map((k) => (
              <div key={k}>
                <div className="mb-1.5 flex items-center gap-2"><span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-semibold", KIND[k].cls)}>{L(KIND[k].en, KIND[k].ar)}</span><span className="text-[11.5px] text-ink-500">{count(k)}</span></div>
                <div className="grid gap-2 md:grid-cols-2">
                  {CONNECTORS.filter((c) => c.kind === k).map((c) => {
                    const meta = d.sources.find((s) => s.id === metaOf[c.id]);
                    return (
                      <div key={c.id} className="rounded-lg border border-line px-3 py-2" data-testid="connector">
                        <div className="flex items-start gap-2">
                          {k === "OPEN" ? <Cloud size={15} className="mt-0.5 shrink-0 text-ok" /> : k === "EMBEDDED" ? <Database size={15} className="mt-0.5 shrink-0 text-navy-600" /> : <Plug size={15} className="mt-0.5 shrink-0 text-ink-400" />}
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold text-ink-900">{tx(c.name)}</div>
                            <div className="text-[11.5px] text-ink-500">{c.provider}</div>
                            {valueOf[c.id] ? <div className="mt-0.5 text-[12px] font-medium tabular text-ink-900">{valueOf[c.id]}</div> : null}
                            {meta ? <div className="text-[11px] text-ink-500 tabular">{meta.rows} {L("rows", "صف")} · {meta.firstYear}–{meta.lastYear} · {meta.licence.split(" (")[0]}</div> : null}
                            <div className="mt-0.5 text-[12px] text-ink-700">{tx(c.feeds)}</div>
                            {c.needs ? <div className="mt-0.5 text-[11.5px] text-ink-500"><b>{L("Needs", "يتطلب")}:</b> {tx(c.needs)}</div> : null}
                          </div>
                          {c.sourceIds.length ? <ProvenanceButton ids={c.sourceIds} /> : null}
                        </div>
                        {c.href ? <Link href={c.href} className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-medium text-navy-600 hover:underline">{L("Where it is used", "أين يُستخدم")}<ArrowRight size={11} className="rtl:rotate-180" /></Link> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <div className="min-w-0 space-y-3">
          <Panel title={L("Open data for Jordan", "بيانات مفتوحة عن الأردن")} subtitle={L("Observed series, indexed 2000 = 100", "سلاسل مرصودة، مؤشر 2000 = 100")} nature="REFERENCE" sources={["OPEN_WB_GDP", "OPEN_OWID_ENERGY", "OPEN_WB_CPI"]}><EChart option={histChart} height={260} /></Panel>
          <Panel title={L("Import your official data", "استورد بياناتك الرسمية")} subtitle={L("CSV with “governorate,value”. Values are validated, then replace modelled values in this browser.", "ملف CSV بصيغة «محافظة،قيمة». يجري التحقق من القيم ثم تحل محل القيم المنمذجة في هذا المتصفح.")}>
            <div className="space-y-2.5">{IMPORT_DATASETS.map((ds) => <ImportCard key={ds.id} ds={ds} />)}</div>
            <p className="mt-2 text-[11.5px] text-ink-500">{L("The official DoS governorate population file is imported in Methodology, where it rebuilds the census frame.", "يُستورد ملف سكان المحافظات الرسمي من الدائرة في صفحة المنهجية حيث يعيد بناء إطار التعداد.")} <Link href="/methodology" className="font-medium text-navy-600 hover:underline">{L("Open", "افتح")}</Link></p>
          </Panel>
        </div>
      </div>
      <Callout tone="sim" className="mt-3">{L(`Open data are mirrors of official international series (bundled ${OPEN_DATA_SNAPSHOT.fetchedAt.slice(0, 10)}); they calibrate national totals only. Governorate detail remains simulated unless you import official tables.`, `البيانات المفتوحة نسخ من سلاسل دولية رسمية (مضمّنة ${OPEN_DATA_SNAPSHOT.fetchedAt.slice(0, 10)})؛ وتعاير المجاميع الوطنية فقط. تبقى تفاصيل المحافظات محاكاة ما لم تستورد جداول رسمية.`)}</Callout>
    </div>
  );
}


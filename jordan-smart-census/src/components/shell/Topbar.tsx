"use client";

import * as P from "@radix-ui/react-popover";
import { Bell, ChevronRight, ChevronLeft, Database, Languages, Menu, Pause, Play, PresentationIcon, RotateCcw, Settings2, X } from "lucide-react";
import { useState } from "react";
import { useApp, type Speed } from "@/store/app";
import { useEngine, getEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { Input, Segmented } from "@/components/ui/form";
import { Modal } from "@/components/ui/dialog";
import { fmtDateTime, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DEFAULT_SEED } from "@/simulation/generate";

export function SimControls({ compact, mobile }: { compact?: boolean; mobile?: boolean }) {
  const engine = useEngine();
  const { t, locale } = useI18n();
  const running = useApp((s) => s.running);
  const setRunning = useApp((s) => s.setRunning);
  const speed = useApp((s) => s.speed);
  const setSpeed = useApp((s) => s.setSpeed);
  const bumpEngineKey = useApp((s) => s.bumpEngineKey);
  const [confirm, setConfirm] = useState(false);
  const phase = engine.phase;
  const day = engine.day;
  const agg = engine.aggregate();
  const finished = phase === "FINISHED";

  const start = () => {
    engine.start();
    setRunning(true);
  };
  const pause = () => {
    engine.pause();
    setRunning(false);
  };

  return (
    <div className={cn("flex items-center gap-2", mobile && "w-full")}>
      <div className="flex shrink-0 items-center gap-1">
        {phase === "READY" ? (
          <Button data-demo="sim-start" variant="accent" size="sm" onClick={start}><Play size={13} fill="currentColor" />{t("simStart")}</Button>
        ) : running ? (
          <Button variant="dark" size="sm" onClick={pause}><Pause size={13} fill="currentColor" />{t("simPause")}</Button>
        ) : (
          <Button variant="accent" size="sm" onClick={start} disabled={finished}><Play size={13} fill="currentColor" />{t("simResume")}</Button>
        )}
        <Button variant="darkGhost" size="icon" onClick={() => setConfirm(true)} aria-label={t("simReset")} title={t("simReset")} disabled={phase === "READY"}><RotateCcw size={14} /></Button>
      </div>
      <Segmented<Speed> dark size="xs" value={speed} onChange={setSpeed} options={[1, 5, 10, 20].map((v) => ({ value: v as Speed, label: `${v}×` }))} />
      {!compact && (
        <div className={cn("min-w-0 flex-col", mobile ? "flex flex-1" : "hidden min-w-[150px] xl:flex")}>
          <div className="flex items-center justify-between gap-2 whitespace-nowrap text-[11px] text-navy-100">
            <span className="min-w-0 truncate font-semibold text-white tabular">{mobile ? (locale === "ar" ? "اليوم" : "Day") : t("simDay")} {Math.min(day, engine.lastDay)}<span className="font-normal text-navy-300"> / {engine.config.fieldDays}</span></span>
            <span className="shrink-0 text-navy-300 tabular">{fmtPct(agg.completionPct, 1)}</span>
          </div>
          <div className="mt-1 h-1 rounded-full bg-white/10">
            <div className="h-1 rounded-full bg-sand-300 transition-[width] duration-300" style={{ width: `${agg.completionPct * 100}%` }} />
          </div>
          <div className="mt-0.5 truncate text-[10px] text-navy-300 tabular">{phase === "READY" ? t("simReady") : finished ? t("simFinished") : `${running ? t("simRunning") : t("simPaused")} · ${fmtDateTime(engine.timeOf(Math.max(0, engine.step - 1)), locale)}`}</div>
        </div>
      )}
      <Modal open={confirm} onOpenChange={setConfirm} title={t("simReset")} footer={<><Button onClick={() => setConfirm(false)}>{t("cancel")}</Button><Button variant="danger" onClick={() => { setConfirm(false); setRunning(false); bumpEngineKey(); }}>{t("simReset")}</Button></>}>
        <p className="text-[13px] text-ink-700">{t("resetConfirm")}</p>
      </Modal>
    </div>
  );
}

function ScopeCrumbs() {
  const engine = useEngine();
  const { tx, t, ar } = useI18n();
  const { govId, districtId, eaId, selectGov, selectDistrict, selectEA } = useApp();
  const Sep = ar ? ChevronLeft : ChevronRight;
  const g = govId ? engine.world.gov[govId] : null;
  const d = districtId ? engine.world.district[districtId] : null;
  return (
    <div className="flex min-w-0 items-center gap-1 text-[12.5px]">
      <button type="button" onClick={() => selectGov(null)} className={cn("rounded px-1.5 py-0.5 font-medium", g ? "text-ink-500 hover:text-ink-900" : "text-ink-900")}>{t("jordan")}</button>
      {g ? (<><Sep size={12} className="text-ink-400" /><button type="button" onClick={() => selectDistrict(null)} className={cn("truncate rounded px-1.5 py-0.5 font-medium", d ? "text-ink-500 hover:text-ink-900" : "text-ink-900")}>{tx(g.name)}</button></>) : null}
      {d ? (<><Sep size={12} className="text-ink-400" /><button type="button" onClick={() => selectEA(null)} className="truncate rounded px-1.5 py-0.5 font-medium text-ink-900">{tx(d.name)}</button></>) : null}
      {eaId ? (<><Sep size={12} className="text-ink-400" /><span className="font-mono text-[12px] text-ink-900">{eaId}</span></>) : null}
      {g ? <button type="button" onClick={() => selectGov(null)} className="ms-1 rounded p-0.5 text-ink-400 hover:bg-sand-100 hover:text-ink-900" aria-label={t("clear")}><X size={13} /></button> : null}
    </div>
  );
}

function SettingsPopover() {
  const { t, L, dir } = useI18n();
  const config = useApp((s) => s.config);
  const setConfig = useApp((s) => s.setConfig);
  const actor = useApp((s) => s.actor);
  const setActor = useApp((s) => s.setActor);
  const [seed, setSeed] = useState(config.seed);
  const engine = getEngine();
  return (
    <P.Root>
      <P.Trigger asChild>
        <Button variant="darkGhost" size="icon" aria-label={t("settings")} title={t("settings")}><Settings2 size={15} /></Button>
      </P.Trigger>
      <P.Portal>
        <P.Content dir={dir} align="end" sideOffset={8} className="z-[60] w-[320px] space-y-3 rounded-md border border-line bg-card p-3.5 shadow-xl">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">{t("settings")}</div>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-ink-700">{t("seed")}</span>
            <div className="flex gap-1.5">
              <Input value={seed} onChange={(e) => setSeed(e.target.value)} className="flex-1 font-mono text-[12px]" />
              <Button variant="primary" onClick={() => setConfig({ seed: seed.trim() || DEFAULT_SEED })}>{t("regenerate")}</Button>
            </div>
            <span className="text-[11px] leading-snug text-ink-500">{L("The same seed always recreates the same demonstration. Default:", "البذرة نفسها تعيد إنتاج العرض نفسه دائماً. الافتراضية:")} <code className="font-mono">{DEFAULT_SEED}</code></span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-ink-700">{t("actor")}</span>
            <Input value={actor} onChange={(e) => setActor(e.target.value)} />
            <span className="text-[11px] text-ink-500">{L("Recorded on every human decision in the audit trail.", "يُسجل مع كل قرار بشري في سجل التدقيق.")}</span>
          </label>
          {engine ? <div className="rounded bg-sand-50 px-2 py-1.5 text-[11px] text-ink-500 tabular">{L("World generated in", "وقت توليد العالم")} {engine.world.generationMs} ms · {engine.world.eas.length.toLocaleString("en-US")} EAs · {engine.world.enumerators.length.toLocaleString("en-US")} {L("enumerators", "عدّاد")} · {engine.world.households.length.toLocaleString("en-US")} {L("sample HH", "أسرة معاينة")}</div> : null}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const engine = useEngine();
  const { t, ar } = useI18n();
  const setLocale = useApp((s) => s.setLocale);
  const setAlertsOpen = useApp((s) => s.setAlertsOpen);
  const openProvenance = useApp((s) => s.openProvenance);
  const setDemo = useApp((s) => s.setDemo);
  const demoActive = useApp((s) => s.demoActive);
  const openAlerts = engine.alerts.filter((a) => a.status === "OPEN" || a.status === "ESCALATED").length;
  return (
    <header className="no-print sticky z-30" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="flex h-[52px] items-center gap-1.5 bg-navy-850 px-2 text-white sm:gap-3 sm:px-3 lg:px-4">
        <button type="button" onClick={onMenu} className="rounded p-1.5 text-navy-100 hover:bg-white/10 lg:hidden" aria-label="Menu"><Menu size={18} /></button>
        <div className="hidden min-w-0 flex-col md:flex">
          <span className="truncate text-[12.5px] font-semibold leading-tight">{t("appSubtitle")}</span>
          <span className="truncate text-[10.5px] leading-tight text-navy-300">{ar ? "Jordan National Foresight & Planning Platform" : "المنصة الوطنية للاستشراف والتخطيط"}</span>
        </div>
        <span className="truncate text-[13px] font-semibold md:hidden">{t("appName")}</span>
        <div className="flex-1" />
        <div className="hidden md:block"><SimControls /></div>
        <div className="mx-1 hidden h-6 w-px bg-white/15 md:block" />
        <Button data-demo="alerts" variant="darkGhost" size="icon" onClick={() => setAlertsOpen(true)} aria-label={t("alertsShort")} title={t("alerts")} className="relative">
          <Bell size={15} />
          {openAlerts > 0 ? <span className="absolute -top-0.5 -end-0.5 min-w-[17px] rounded-full bg-jordan px-1 text-[9.5px] font-bold leading-[17px] tabular">{openAlerts > 999 ? "999+" : openAlerts}</span> : null}
        </Button>
        <Button variant="darkGhost" size="icon" onClick={() => openProvenance(null)} aria-label={t("provenance")} title={t("provenance")} className="hidden sm:inline-flex"><Database size={15} /></Button>
        <Button variant="darkGhost" size="sm" onClick={() => setLocale(ar ? "en" : "ar")} aria-label={t("language")} className="font-semibold"><Languages size={14} />{ar ? "EN" : "عربي"}</Button>
        <SettingsPopover />
        <Button variant={demoActive ? "dark" : "accent"} size="sm" onClick={() => setDemo(!demoActive, 0)} aria-label={t("executiveDemo")}><PresentationIcon size={14} /><span className="hidden sm:inline">{t("executiveDemo")}</span></Button>
      </div>
      <div className="flex items-center border-t border-white/10 bg-navy-900 px-2 py-1.5 text-white md:hidden">
        <SimControls mobile />
      </div>
      <div className="flex h-9 items-center justify-between gap-3 border-b border-line bg-card/95 px-3 backdrop-blur lg:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">{t("scope")}</span>
          <ScopeCrumbs />
        </div>
        <div className="hidden items-center gap-2 text-[11px] text-ink-500 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-nat-simulated" />
          {t("prototypeNotice")}
        </div>
      </div>
    </header>
  );
}

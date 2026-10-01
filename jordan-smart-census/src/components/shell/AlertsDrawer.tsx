"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { Sheet } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NatureBadge, SeverityBadge } from "@/components/ui/badges";
import { Select } from "@/components/ui/form";
import { fmtDateTime } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import type { AlertType, Severity } from "@/types/census";
import { cn } from "@/lib/utils";

const SEV_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export function AlertsDrawer() {
  const open = useApp((s) => s.alertsOpen);
  const setOpen = useApp((s) => s.setAlertsOpen);
  const actor = useApp((s) => s.actor);
  const govFilter = useApp((s) => s.govId);
  const bump = useApp((s) => s.bump);
  const engine = useEngine();
  const { t, tx, lb, locale, L } = useI18n();
  const [sev, setSev] = useState<string>("ALL");
  const [type, setType] = useState<string>("ALL");
  const [openOnly, setOpenOnly] = useState(true);
  const list = useMemo(
    () => engine.alerts
      .filter((a) => (sev === "ALL" || a.severity === sev) && (type === "ALL" || a.type === type) && (!openOnly || a.status === "OPEN" || a.status === "ESCALATED") && (!govFilter || a.govId === govFilter))
      .sort((a, b) => b.step - a.step || SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity))
      .slice(0, 300),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, engine.version, engine.alerts.length, sev, type, openOnly, govFilter],
  );
  const act = (id: string, action: "ACKNOWLEDGE" | "ESCALATE" | "RESOLVE") => {
    engine.alertAction(id, action, actor);
    bump();
  };
  const types = Array.from(new Set(engine.alerts.map((a) => a.type))) as AlertType[];
  return (
    <Sheet open={open} onOpenChange={setOpen} width={560} title={<span className="flex items-center gap-2">{t("alerts")}<NatureBadge nature="SYNTHETIC_OPERATIONAL" /></span>} description={govFilter ? `${t("scope")}: ${tx(engine.world.gov[govFilter].name)}` : undefined}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={sev} onChange={(e) => setSev(e.target.value)} aria-label={t("severity")}>
          <option value="ALL">{t("severity")}: {t("all")}</option>
          {SEV_ORDER.map((s) => <option key={s} value={s}>{t(`sev${s}`)}</option>)}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label={L("Type", "النوع")}>
          <option value="ALL">{L("Type", "النوع")}: {t("all")}</option>
          {types.map((x) => <option key={x} value={x}>{lb("alertType", x)}</option>)}
        </Select>
        <label className="flex items-center gap-1.5 text-[12px] text-ink-700"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />{t("openOnly")}</label>
        <div className="flex-1" />
        <Button size="xs" onClick={() => downloadCsv("alerts.csv", engine.alerts.map((a) => ({ id: a.id, type: a.type, severity: a.severity, status: a.status, governorate: a.govId, reference: a.refId, raised: engine.timeOf(a.step).toISOString(), owner: a.owner.en, text: a.text.en })))}>{t("exportCsv")}</Button>
      </div>
      {list.length === 0 ? <p className="py-10 text-center text-[13px] text-ink-500">{t("noAlerts")}</p> : null}
      <ul className="space-y-2">
        {list.map((a) => (
          <li key={a.id} className={cn("rounded-md border bg-card p-3", a.status === "ESCALATED" ? "border-crit/40" : "border-line")}>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge s={a.severity} />
              <span className="text-[12.5px] font-semibold text-ink-900">{lb("alertType", a.type)}</span>
              <span className="text-[11px] text-ink-400">· {tx(engine.world.gov[a.govId].name)}</span>
              <span className="ms-auto font-mono text-[10.5px] text-ink-400">{a.id}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-700">{tx(a.text)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
              <span>{t("owner")}: <span className="text-ink-700">{tx(a.owner)}</span></span>
              <span className="tabular">{fmtDateTime(engine.timeOf(a.step), locale)}</span>
              <span>{t("status")}: <span className="font-medium text-ink-700">{t(a.status === "OPEN" ? "open" : a.status === "ACKNOWLEDGED" ? "acknowledged" : a.status === "ESCALATED" ? "escalated" : "resolved")}</span></span>
            </div>
            {a.status !== "RESOLVED" ? (
              <div className="mt-2 flex gap-1.5">
                {a.status === "OPEN" ? <Button size="xs" onClick={() => act(a.id, "ACKNOWLEDGE")}>{t("acknowledge")}</Button> : null}
                {a.status !== "ESCALATED" ? <Button size="xs" onClick={() => act(a.id, "ESCALATE")}>{t("escalate")}</Button> : null}
                <Button size="xs" variant="primary" onClick={() => act(a.id, "RESOLVE")}>{t("resolve")}</Button>
              </div>
            ) : null}
            {a.history.length > 1 ? <div className="mt-1.5 text-[10.5px] text-ink-400">{a.history.slice(1).map((h) => `${h.action} · ${h.by}`).join(" → ")}</div> : null}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

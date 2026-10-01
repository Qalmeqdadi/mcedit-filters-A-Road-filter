"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/store/app";
import { createEngine, getEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { BrandMark } from "./Sidebar";

/** Builds the synthetic world on the client (never during server prerender) and rebuilds on reset / seed change. */
export function EngineGate({ children }: { children: ReactNode }) {
  const config = useApp((s) => s.config);
  const engineKey = useApp((s) => s.engineKey);
  const bump = useApp((s) => s.bump);
  const { t } = useI18n();
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const want = `${JSON.stringify(config)}#${engineKey}`;

  useEffect(() => {
    if (readyKey === want) return;
    const handle = setTimeout(() => {
      createEngine(config);
      setReadyKey(want);
      bump();
    }, 40);
    return () => clearTimeout(handle);
  }, [want, config, readyKey, bump]);

  if (readyKey !== want || !getEngine()) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-navy-900">
        <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
          <BrandMark size={44} />
          <div className="text-[17px] font-semibold text-white">{t("appName")}</div>
          <div className="h-1 w-56 overflow-hidden rounded-full bg-white/10"><div className="h-1 w-1/3 animate-pulse rounded-full bg-sand-300" /></div>
          <div className="text-[13px] font-medium text-navy-100">{t("loadingWorld")}</div>
          <div className="text-[12px] leading-relaxed text-navy-300">{t("loadingDetail")}</div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

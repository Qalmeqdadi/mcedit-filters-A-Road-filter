"use client";

import { useState, type ReactNode } from "react";
import { EngineGate } from "./EngineGate";
import { DirectionSync, SimulationRunner } from "./SimulationRunner";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ProvenancePanel } from "./ProvenancePanel";
import { AlertsDrawer } from "./AlertsDrawer";
import { DemoTour } from "./DemoTour";
import { Toaster } from "./Toaster";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const { ar, dir } = useI18n();
  return (
    <>
      <DirectionSync />
      <EngineGate>
        <SimulationRunner />
        <div dir={dir} className="min-h-screen">
          <Sidebar open={menu} onNavigate={() => setMenu(false)} />
          {menu ? <div className="fixed inset-0 z-30 bg-navy-950/40 lg:hidden" onClick={() => setMenu(false)} /> : null}
          <div className={cn("flex min-h-screen flex-col", ar ? "lg:pr-[264px]" : "lg:pl-[264px]")}>
            <Topbar onMenu={() => setMenu(true)} />
            <main className="flex-1 px-3 pb-24 pt-4 lg:px-5">{children}</main>
          </div>
          <ProvenancePanel />
          <AlertsDrawer />
          <DemoTour />
          <Toaster />
        </div>
      </EngineGate>
    </>
  );
}

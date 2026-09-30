"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { Workflow } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarNav } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { GuidedPanel } from "@/components/shell/guided-panel";
import { AiControlSheet } from "@/components/governance/ai-control-sheet";
import { hydrateStore, useApp } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useApp((s) => s.hydrated);
  const guidedActive = useApp((s) => s.guided.active);

  useEffect(() => {
    hydrateStore();
  }, []);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border/70 bg-white/70 backdrop-blur lg:block">
          <SidebarNav />
        </aside>
        <div className="lg:pl-64">
          <Topbar />
          <main className={guidedActive ? "pb-72" : "pb-16"}>
            {hydrated ? (
              <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
            ) : (
              <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-navy-500">
                <span className="flex h-10 w-10 animate-pulse items-center justify-center rounded-xl bg-navy-800 text-gold-300">
                  <Workflow className="h-5 w-5" />
                </span>
                <span className="text-sm">Loading procurement workspace…</span>
              </div>
            )}
          </main>
        </div>
        {hydrated && <GuidedPanel />}
        {hydrated && <AiControlSheet />}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: "inherit" }, className: "!rounded-xl !shadow-lift" }}
          offset={76}
        />
      </div>
    </TooltipProvider>
  );
}

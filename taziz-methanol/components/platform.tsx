"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/lib/store";
import type { ViewId } from "@/lib/types";
import { AssistantPanel, DemoMode, SimulationEngine, Sidebar, Topbar } from "./shell";
import { CouncilOfAgents, ExecutiveOverview, InvestigationCenter } from "./views/core";
import { AIControl, AssetHealth, EnergySteam, EngineeringKnowledge, LivePlant, ProductionOptimization, QualityIntelligence, ScenarioSimulator, ShiftIntelligence, ValueSummary } from "./views/modules";

const VIEWS: Record<ViewId, React.ComponentType> = {
  overview: ExecutiveOverview,
  plant: LivePlant,
  council: CouncilOfAgents,
  investigation: InvestigationCenter,
  optimization: ProductionOptimization,
  assets: AssetHealth,
  energy: EnergySteam,
  quality: QualityIntelligence,
  knowledge: EngineeringKnowledge,
  shift: ShiftIntelligence,
  control: AIControl,
  scenarios: ScenarioSimulator,
  value: ValueSummary,
};

export function Platform() {
  const view = useApp((s) => s.view);
  const View = VIEWS[view];
  return (
    <div className="flex min-h-screen bg-ink-950 bg-[radial-gradient(ellipse_at_top_right,rgba(31,95,224,0.16),transparent_55%)]">
      <SimulationEngine />
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar />
        <main className="mx-auto w-full max-w-[1680px] px-4 pb-36 pt-5 md:px-6">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <View />
            </motion.div>
          </AnimatePresence>
          <footer className="mt-10 border-t border-line pt-4 text-[10.5px] text-fg-dim">
            Insight | TA’ZIZ, an ADNOC Group Company · Executive demonstration environment · All process values, events, equipment, alarms, recommendations and documents are synthetic · No connection to any real plant, DCS, SIS, PLC or OT network.
          </footer>
        </main>
      </div>
      <AssistantPanel />
      <DemoMode />
    </div>
  );
}

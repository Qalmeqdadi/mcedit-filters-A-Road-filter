import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useLocation } from "./router";
import Home from "@/app/page";
import Planning from "@/app/planning/page";
import Gis from "@/app/gis/page";
import Field from "@/app/field/page";
import Enumerators from "@/app/enumerators/page";
import Questionnaire from "@/app/questionnaire/page";
import Coverage from "@/app/coverage/page";
import Quality from "@/app/quality/page";
import Anomalies from "@/app/anomalies/page";
import Pes from "@/app/pes/page";
import Population from "@/app/population/page";
import Housing from "@/app/housing/page";
import Labour from "@/app/labour/page";
import Education from "@/app/education/page";
import Health from "@/app/health/page";
import Migration from "@/app/migration/page";
import Infrastructure from "@/app/infrastructure/page";
import Projections from "@/app/projections/page";
import Scenarios from "@/app/scenarios/page";
import Decision from "@/app/decision/page";
import Reports from "@/app/reports/page";
import Methodology from "@/app/methodology/page";
import NotFound from "@/app/not-found";

const ROUTES: Record<string, ComponentType> = {
  "/": Home, "/planning": Planning, "/gis": Gis, "/field": Field, "/enumerators": Enumerators, "/questionnaire": Questionnaire,
  "/coverage": Coverage, "/quality": Quality, "/anomalies": Anomalies, "/pes": Pes, "/population": Population, "/housing": Housing,
  "/labour": Labour, "/education": Education, "/health": Health, "/migration": Migration, "/infrastructure": Infrastructure,
  "/projections": Projections, "/scenarios": Scenarios, "/decision": Decision, "/reports": Reports, "/methodology": Methodology,
};

function App() {
  const path = useLocation();
  const Page = ROUTES[path] ?? NotFound;
  return (
    <AppShell>
      <Page key={path} />
    </AppShell>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

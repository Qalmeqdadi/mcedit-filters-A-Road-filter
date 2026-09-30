import { createRoot } from "react-dom/client";
import { AppShell } from "@/components/shell/app-shell";
import { useLocation } from "./router";
import Home from "@/app/page";
import CasePage from "@/app/case/page";
import Intake from "@/app/case/intake/page";
import Rfx from "@/app/case/rfx/page";
import Suppliers from "@/app/case/suppliers/page";
import Evaluation from "@/app/case/evaluation/page";
import Approvals from "@/app/case/approvals/page";
import Contract from "@/app/case/contract/page";
import Monitoring from "@/app/case/monitoring/page";
import Agents from "@/app/agents/page";
import Governance from "@/app/governance/page";
import Audit from "@/app/audit/page";
import Value from "@/app/value/page";
import NotFound from "@/app/not-found";

const ROUTES: Record<string, React.ComponentType> = {
  "/": Home,
  "/case": CasePage,
  "/case/intake": Intake,
  "/case/rfx": Rfx,
  "/case/suppliers": Suppliers,
  "/case/evaluation": Evaluation,
  "/case/approvals": Approvals,
  "/case/contract": Contract,
  "/case/monitoring": Monitoring,
  "/agents": Agents,
  "/governance": Governance,
  "/audit": Audit,
  "/value": Value,
};

function App() {
  const path = useLocation().split("?")[0];
  const Page = ROUTES[path] ?? NotFound;
  return (
    <AppShell>
      <Page key={path} />
    </AppShell>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

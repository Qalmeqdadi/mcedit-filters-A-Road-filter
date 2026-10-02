import { createRoot } from "react-dom/client";
import { AppShell } from "@/components/shell/AppShell";
import { useLocation } from "./router";
import { ROUTES } from "./routes.generated";
import NotFound from "@/app/not-found";


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

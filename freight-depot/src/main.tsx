import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startClock } from "./sim/store";
import "./styles.css";

startClock();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

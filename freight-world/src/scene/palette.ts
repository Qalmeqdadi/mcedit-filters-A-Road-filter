import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export interface Palette {
  sea: string; seaDeep: string; sand: string; green: string; coast: string; road: string; rail: string;
  wall: string; wallShade: string; roof: string; glass: string; glassGlow: number;
  ink: string; signal: string; teal: string; red: string; purple: string;
  crane: string; hull: string; deck: string; tree: string; trunk: string; lane: string;
  hemiSky: string; hemiGround: string; hemi: number; sun: number;
}

export const PALETTES: Record<Theme, Palette> = {
  light: {
    sea: "#c4d9d8", seaDeep: "#b6cecd", sand: "#f7f4eb", green: "#edf3e9", coast: "#b3c8c1", road: "#cfd6d3", rail: "#7a6a9a",
    wall: "#fbfcfb", wallShade: "#dfe6e3", roof: "#e9eeec", glass: "#7fa6b8", glassGlow: 0,
    ink: "#12232c", signal: "#f2b705", teal: "#13837a", red: "#b8402c", purple: "#6b4a8a",
    crane: "#f2b705", hull: "#22343d", deck: "#e9eeec", tree: "#7fbf95", trunk: "#9b8b78", lane: "#12232c",
    hemiSky: "#ffffff", hemiGround: "#b9c8c6", hemi: 1.2, sun: 1.55,
  },
  dark: {
    sea: "#0d1f27", seaDeep: "#0a1920", sand: "#22343b", green: "#1d3233", coast: "#2c4651", road: "#2e4752", rail: "#9a86c4",
    wall: "#2a3f48", wallShade: "#20333b", roof: "#24383f", glass: "#ffd27a", glassGlow: 0.9,
    ink: "#e4edeb", signal: "#f5c12e", teal: "#4db9ae", red: "#ee8069", purple: "#a98bd0",
    crane: "#f5c12e", hull: "#0f1c22", deck: "#33505b", tree: "#2f6b52", trunk: "#4c4236", lane: "#e4edeb",
    hemiSky: "#9fb8c8", hemiGround: "#0b171d", hemi: 0.6, sun: 0.7,
  },
};

function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    const update = () => setTheme(readTheme());
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener("change", update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq?.removeEventListener("change", update);
      mo.disconnect();
    };
  }, []);
  return theme;
}

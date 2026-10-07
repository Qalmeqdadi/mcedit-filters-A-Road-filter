import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export interface Palette {
  sky: string;
  ground: string;
  grass: string;
  asphalt: string;
  apron: string;
  line: string;
  wall: string;
  wallShade: string;
  roof: string;
  accent: string;
  accentDeep: string;
  window: string;
  windowGlow: number;
  tree: string;
  treeDark: string;
  trunk: string;
  trailer: string;
  glass: string;
  chassis: string;
  tyre: string;
  wood: string;
  booked: string;
  held: string;
  preview: string;
  freeTile: string;
  dg: string;
  reefer: string;
  lamp: string;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  sun: number;
  ambient: number;
}

export const PALETTES: Record<Theme, Palette> = {
  light: {
    sky: "#eef0f8", ground: "#e8eaf4", grass: "#d7ecdc", asphalt: "#d4d8e6", apron: "#dde0ec", line: "#ffffff",
    wall: "#f8f9fd", wallShade: "#e3e6f2", roof: "#eceef6", accent: "#2f55d4", accentDeep: "#2442ad",
    window: "#6c88e8", windowGlow: 0, tree: "#74c08f", treeDark: "#5aa877", trunk: "#9a8b7c",
    trailer: "#ffffff", glass: "#c9d4fb", chassis: "#454c63", tyre: "#2b3043", wood: "#c9a578",
    booked: "#3a62e0", held: "#f2a531", preview: "#22b07d", freeTile: "#c3cae2", dg: "#e8553f", reefer: "#7fd0f0",
    lamp: "#fff4d6", hemiSky: "#ffffff", hemiGround: "#c9cde0", hemi: 1.15, sun: 1.6, ambient: 0.25,
  },
  dark: {
    sky: "#0f1322", ground: "#151a2c", grass: "#18282a", asphalt: "#1e2438", apron: "#1b2134", line: "#3c4566",
    wall: "#2a3150", wallShade: "#232944", roof: "#262c48", accent: "#5b7cff", accentDeep: "#3b5be8",
    window: "#ffcf7a", windowGlow: 0.9, tree: "#2f6b4c", treeDark: "#245a3f", trunk: "#4c4236",
    trailer: "#d9deee", glass: "#5b6ba8", chassis: "#2b3043", tyre: "#141722", wood: "#8f7656",
    booked: "#5b7cff", held: "#f5b54a", preview: "#33d19a", freeTile: "#36405f", dg: "#ff6a52", reefer: "#5fc4ea",
    lamp: "#ffd98a", hemiSky: "#8ea0e0", hemiGround: "#1a1f33", hemi: 0.55, sun: 0.75, ambient: 0.2,
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

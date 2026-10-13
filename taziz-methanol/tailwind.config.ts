import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./hosted/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "Inter", "Segoe UI", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          950: "#020A18",
          900: "#04152D",
          800: "#071D3B",
          700: "#0B2750",
          600: "#113466",
        },
        line: "rgba(86, 179, 255, 0.14)",
        "line-strong": "rgba(86, 199, 255, 0.32)",
        fg: {
          DEFAULT: "#E7F0FF",
          muted: "#93A9CC",
          dim: "#5F7799",
        },
        cyan: {
          300: "#7DE8FF",
          400: "#2FD6F5",
          500: "#12B8E0",
        },
        electric: { 400: "#4C9BFF", 500: "#2B7BFF", 600: "#1F5FE0" },
        royal: { 500: "#1E3FAE", 600: "#162F86" },
        ok: "#3DD9A4",
        warn: "#F4B740",
        alarm: "#FF6B6B",
        violet: "#9A8CFF",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(47,214,245,0.35), 0 0 24px -6px rgba(47,214,245,0.45)",
        "glow-sm": "0 0 0 1px rgba(47,214,245,0.25), 0 0 12px -4px rgba(47,214,245,0.35)",
        panel: "0 1px 0 0 rgba(125,232,255,0.06) inset, 0 20px 40px -24px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "dash-flow": { to: { strokeDashoffset: "-24" } },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
        "scan-line": { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(400%)" } },
      },
      animation: {
        "dash-flow": "dash-flow 0.9s linear infinite",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "scan-line": "scan-line 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;

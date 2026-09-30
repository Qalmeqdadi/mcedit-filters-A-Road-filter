import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1440px" } },
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ['"Source Serif 4 Variable"', "ui-serif", "Georgia", "serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        navy: { 50: "#EEF1F6", 100: "#D9DFEA", 200: "#B3BFD4", 400: "#5B6F92", 600: "#23385C", 700: "#172B4A", 800: "#0F2240", 900: "#0A1A33" },
        gold: { 50: "#FBF7EF", 100: "#F4EBD8", 200: "#E8D5AE", 300: "#D8BA80", 400: "#C9A260", 500: "#B38E4C", 600: "#96743A", 700: "#75592C" },
        magenta: { 50: "#FCEEF5", 100: "#F8D9E8", 200: "#EFB0CE", 400: "#D0458A", 500: "#B8196B", 600: "#991257", 700: "#7A0E46" },
        sky: { 50: "#EEF3FA", 100: "#DCE6F4", 200: "#B7CBE7", 400: "#5F86BF", 500: "#3A66A7", 600: "#2D5189", 700: "#223F6B" },
        ok: { 50: "#ECF6F1", 100: "#D3ECDF", 500: "#1F7A5A", 600: "#17634A" },
        warn: { 50: "#FDF5E7", 100: "#F9E6C2", 500: "#B7791F", 600: "#945F14" },
        risk: { 50: "#FDEEEC", 100: "#F9D6D1", 500: "#B42318", 600: "#912018" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)", xl: "calc(var(--radius) + 4px)", "2xl": "calc(var(--radius) + 8px)" },
      boxShadow: {
        card: "0 1px 2px rgba(10,26,51,0.04), 0 4px 16px -4px rgba(10,26,51,0.06)",
        lift: "0 2px 4px rgba(10,26,51,0.05), 0 12px 32px -8px rgba(10,26,51,0.12)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
        pulseDot: { "0%,100%": { opacity: "0.25", transform: "scale(0.85)" }, "50%": { opacity: "1", transform: "scale(1)" } },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-dot": "pulseDot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;

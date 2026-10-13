import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "TA’ZIZ Intelligent Methanol Plant · Agentic AI Operations Platform (Demo)",
  description: "Executive demonstration with Insight. Synthetic simulation data only. Not connected to any plant, DCS, SIS, PLC or OT environment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink-950 font-sans antialiased">{children}</body>
    </html>
  );
}

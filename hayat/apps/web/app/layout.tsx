import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "HAYAT | حياة · Global Pulse",
  description: "Autonomous Resilience Intelligence: UAE food and logistics resilience.",
};

export const viewport: Viewport = { themeColor: "#05080d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

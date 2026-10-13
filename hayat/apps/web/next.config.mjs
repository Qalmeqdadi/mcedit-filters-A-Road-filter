import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the project root so a lockfile or PostCSS config elsewhere in the repo is never picked up.
  turbopack: { root },
  outputFileTracingRoot: root,
  // Do not write an AGENTS.md into the project on `next dev`.
  agentRules: false,
};

export default nextConfig;

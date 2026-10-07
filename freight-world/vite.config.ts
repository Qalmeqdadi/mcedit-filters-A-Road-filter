import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

const here = (p: string) => decodeURIComponent(new URL(p, import.meta.url).pathname);

// One self-contained index.html, so the build can be opened from disk or hosted as a single page.
// The live screens run the backend's own code (../freight-orchestrator/src) in the page: policy,
// state machines, extractors and the API workspace. Node-only pieces are swapped for browser stubs.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: [
      { find: "@fo", replacement: here("../freight-orchestrator/src") },
      { find: "@fo-fixtures", replacement: here("../freight-orchestrator/tests/fixtures") },
      { find: "@fo-config", replacement: here("../freight-orchestrator/config") },
      { find: "node:crypto", replacement: here("./src/live/node-crypto-shim.ts") },
      // Claude runs on the server only; the page uses the rule extractors.
      { find: /^@anthropic-ai\/sdk(\/.*)?$/, replacement: here("./src/live/sdk-stub.ts") },
    ],
  },
  server: { fs: { allow: [".."] } },
  build: { chunkSizeWarningLimit: 6000 },
});

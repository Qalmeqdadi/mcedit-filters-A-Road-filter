import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  // The Freight Orchestrator apps are separate projects with their own tooling.
  { ignores: ["freight-orchestrator/**", "freight-world/**", "freight-depot/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

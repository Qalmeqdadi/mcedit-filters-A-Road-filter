// Traceability: a process address must point at real modules and tests.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ARCHITECTURE } from "@/processes/architecture.data";
import { ADDED_PROCESSES, DEVIATIONS } from "@/processes/deviations";
import { ALL_PROCESSES, compareAddress, IMPLEMENTATIONS, isKnownAddress } from "@/processes/registry";
import { MACHINES } from "@/state/machines";

const root = join(import.meta.dirname, "../..");

describe("process architecture", () => {
  it("has the 14 level-1 processes from the document and no others", () => {
    expect(ARCHITECTURE.filter((p) => !p.id.includes(".")).map((p) => p.id)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"]);
  });

  it("additions never introduce a new level-1 process and never reuse an address", () => {
    for (const a of ADDED_PROCESSES) {
      expect(a.id).toContain(".");
      expect(ARCHITECTURE.some((p) => p.id === a.id), a.id).toBe(false);
      expect(isKnownAddress(a.id.split(".").slice(0, -1).join("."))).toBe(true);
    }
  });

  it("every address has a parent", () => {
    for (const p of ALL_PROCESSES) {
      if (p.id.includes(".")) expect(isKnownAddress(p.id.split(".").slice(0, -1).join(".")), p.id).toBe(true);
    }
  });

  it("deviations refer to real addresses or machines", () => {
    for (const d of DEVIATIONS) expect(isKnownAddress(d.ref) || d.ref in MACHINES, d.ref).toBe(true);
  });

  it("addresses sort numerically", () => {
    expect(["4.10", "4.2", "4"].sort(compareAddress)).toEqual(["4", "4.2", "4.10"]);
  });
});

describe("implementations", () => {
  for (const i of IMPLEMENTATIONS) {
    it(`${i.id} (${i.status})`, () => {
      expect(isKnownAddress(i.id), `${i.id} is not in the document`).toBe(true);
      if (i.status === "built" || i.status === "partial") {
        expect(i.modules.length).toBeGreaterThan(0);
        expect(i.tests.length, `${i.id} has no test`).toBeGreaterThan(0);
      }
      for (const f of [...i.modules, ...i.tests, ...i.screens]) expect(existsSync(join(root, f)), f).toBe(true);
    });
  }

  it("each address is registered once", () => {
    const ids = IMPLEMENTATIONS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("docs/PROCESS-MAP.md", () => {
  it("is up to date (run npm run process-map)", async () => {
    const { readFileSync } = await import("node:fs");
    const { renderProcessMap } = await import("@/processes/render");
    expect(readFileSync(join(root, "docs/PROCESS-MAP.md"), "utf8")).toBe(renderProcessMap());
  });
});

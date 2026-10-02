"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { overridesFrom, type ImportedDataset } from "@/data/connectors";
import { openData, setOpenData, type OpenData } from "@/data/openData";

interface ConnectorState {
  imports: Record<string, ImportedDataset>;
  /** open data refreshed at runtime (null = the snapshot bundled at build time) */
  refreshed: OpenData | null;
  /** bumps when calibration data change so cached model runs are recomputed */
  dataVersion: number;
  applyImport: (d: ImportedDataset) => void;
  removeImport: (id: string) => void;
  setRefreshed: (d: OpenData | null) => void;
}

export const useConnectors = create<ConnectorState>()(
  persist(
    (set) => ({
      imports: {},
      refreshed: null,
      dataVersion: 0,
      applyImport: (d) => set((s) => ({ imports: { ...s.imports, [d.id]: d }, dataVersion: s.dataVersion + 1 })),
      removeImport: (id) => set((s) => {
        const imports = { ...s.imports };
        delete imports[id];
        return { imports, dataVersion: s.dataVersion + 1 };
      }),
      setRefreshed: (d) => {
        if (d) setOpenData(d);
        set((s) => ({ refreshed: d, dataVersion: s.dataVersion + 1 }));
      },
    }),
    {
      name: "ufuq-connectors",
      version: 1,
      skipHydration: true,
      partialize: (s) => ({ imports: s.imports, refreshed: s.refreshed }),
      onRehydrateStorage: () => (s) => { if (s?.refreshed) setOpenData(s.refreshed); },
    },
  ),
);

/** Imported values to apply to the models, plus a key that changes whenever data change. */
export function useDataOverrides() {
  const imports = useConnectors((s) => s.imports);
  const version = useConnectors((s) => s.dataVersion);
  return useMemo(() => ({ overrides: overridesFrom(imports), key: `${version}|${openData().fetchedAt}|${Object.keys(imports).sort().join(",")}` }), [imports, version]);
}

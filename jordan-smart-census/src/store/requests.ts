"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RequestStage } from "@/data/registry";

export interface RequestTrack {
  stage: RequestStage;
  history: { stage: RequestStage; at: string; note?: string }[];
}

interface RequestState {
  tracks: Record<string, RequestTrack>;
  setStage: (id: string, stage: RequestStage, note?: string) => void;
  reset: (id: string) => void;
}

/** Progress of each data request through the workflow (kept in this browser). */
export const useRequests = create<RequestState>()(
  persist(
    (set) => ({
      tracks: {},
      setStage: (id, stage, note) => set((s) => {
        const cur = s.tracks[id] ?? { stage: "DRAFT", history: [] };
        return { tracks: { ...s.tracks, [id]: { stage, history: [...cur.history, { stage, at: new Date().toISOString(), note }] } } };
      }),
      reset: (id) => set((s) => {
        const tracks = { ...s.tracks };
        delete tracks[id];
        return { tracks };
      }),
    }),
    { name: "ufuq-requests", version: 1, skipHydration: true },
  ),
);

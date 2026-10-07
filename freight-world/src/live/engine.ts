// The backend, running in the page. Same Policy, rule sets, state machines, extractors and API
// workspace as the server (../freight-orchestrator/src); only the mailbox transport differs.
import { Workspace } from "@fo/api/workspace";
import { MemoryConfigStore, parseRuleset } from "@fo/config/memory";
import type { RulesetKind } from "@fo/config/schema";
import type { Actor } from "@fo/governance/actor";
import { Policy } from "@fo/governance/policy";
import { party } from "@fo/network/scenario";
import { NETWORK_ACTORS, networkFor, type NetworkView } from "@fo/network/view";
import { useEffect, useState } from "react";
import { create } from "zustand";

const files = import.meta.glob("@fo-config/rulesets/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const bodies = Object.fromEntries(Object.entries(files).map(([path, body]) => [path.split("/").pop()!.replace(".json", ""), body])) as Record<RulesetKind, unknown>;

export const policy = new Policy({ kind: "permissions", version: 1, id: "permissions@1", deskOrgId: null, body: parseRuleset("permissions", bodies.permissions), publishedAt: new Date(), publishedBy: "system:defaults" });

/** The confidence rule set: per-field thresholds the review queue uses (4.3.3). */
export const CONFIDENCE = parseRuleset("confidence", bodies.confidence);

export type LensKey = keyof typeof NETWORK_ACTORS;
export const LENS_KEYS = Object.keys(NETWORK_ACTORS) as LensKey[];

const PEOPLE: Record<LensKey, string> = {
  gulfwayAgent: "Omar Rahman",
  northseaAgent: "Eva de Vries",
  alNoor: "Sara Haddad",
  nordlicht: "Jonas Weber",
  oceanlink: "Lin Wei",
  falcon: "Hana Aziz",
  sahm: "Rania Saleh",
  eastrail: "Faisal Otaibi",
  alSafa: "Amal Saeed",
};

export interface Lens {
  key: LensKey;
  actor: Actor;
  person: string;
  org: string;
  color: string;
  persona: "fwd" | "shp" | "car" | "par";
  /** What the lens is, in a few words, for the picker. */
  role: string;
}

const PERSONA = { desk: "fwd", shipper: "shp", carrier: "car", partner: "par" } as const;
const MODE_WORD = { ocean_fcl: "Ocean", ocean_lcl: "Ocean", air: "Air", road: "Road", rail: "Rail" } as const;

export const LENSES: Record<LensKey, Lens> = Object.fromEntries(
  LENS_KEYS.map((key) => {
    const actor = NETWORK_ACTORS[key];
    const p = party(actor.orgId!);
    const role = p.type === "carrier" ? `${MODE_WORD[p.modes![0]!]} carrier` : p.type === "desk" ? "Forwarder desk" : p.type === "shipper" ? "Shipper" : p.service ?? "Service partner";
    return [key, { key, actor, person: PEOPLE[key], org: p.name, color: p.color, persona: PERSONA[p.type], role }];
  }),
) as Record<LensKey, Lens>;

/** The lens each persona button opens on the world map. */
export const DEFAULT_LENS: Record<Lens["persona"], LensKey> = { fwd: "gulfwayAgent", shp: "alNoor", car: "oceanlink", par: "alSafa" };

const views = new Map<LensKey, NetworkView>();
export function viewFor(key: LensKey): NetworkView {
  let v = views.get(key);
  if (!v) views.set(key, (v = networkFor(NETWORK_ACTORS[key], policy)));
  return v;
}

// ── Live workspace: intake, replies, review, audit ───────────────────────────

let wsPromise: Promise<Workspace> | null = null;
export const workspace = () => (wsPromise ??= Workspace.create({ config: MemoryConfigStore.fromBodies(bodies) }));

/** Bumped after every write, so screens re-read through the policy. */
export const useLive = create<{ version: number; bump: () => void }>((set, get) => ({ version: 0, bump: () => set({ version: get().version + 1 }) }));

/** Runs an async read against the workspace and re-runs it after any write or when deps change. */
export function useRead<T>(read: (ws: Workspace) => Promise<T> | T, deps: unknown[], initial: T): T {
  const version = useLive((s) => s.version);
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    let live = true;
    void workspace()
      .then(read)
      .then((v) => live && setValue(v));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);
  return value;
}

export async function write<T>(fn: (ws: Workspace) => Promise<T>): Promise<T> {
  const ws = await workspace();
  try {
    return await fn(ws);
  } finally {
    useLive.getState().bump();
  }
}

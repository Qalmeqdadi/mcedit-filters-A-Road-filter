"use client";

/**
 * Delivery workspace storage.
 *
 * - Local workspace (the Next.js app and the offline file): kept in this browser's storage. The
 *   role is chosen by the user and is a demonstration setting, not access control.
 * - Shared workspace (the hosted page, when the viewer grants the `db` capability): portfolio,
 *   approvals, comments, activity and versions live in the artifact's shared database, so everyone
 *   with access sees the same portfolio live. Roles come from the platform: editors approve, other
 *   members who can change data plan, view-only people read. Approvals and versions sit under
 *   paths only editors can write, so the rule is enforced by the store, not only by the interface.
 *   Only opaque person ids are stored; names are resolved for display.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isHosted } from "@/lib/hosted";
import { toast } from "@/lib/hosted";
import { useApp } from "@/store/app";
import type { ActionItem } from "@/simulation/lab/actions";
import {
  EMPTY, demoPortfolio, itemFromAction, itemIdFor, uid, versionRows,
  type Actor, type Approval, type AuditEvent, type Comment, type DeliveryData, type EventKind, type PortfolioItem, type Role, type Version,
} from "./model";

type Mode = "local" | "connecting" | "shared";

interface DeliveryState {
  local: DeliveryData;
  shared: DeliveryData | null;
  mode: Mode;
  localRole: Role;
  sharedRole: Role;
  meId: string | null;
  names: Record<string, string>;
  focus: string | null;
  readOnlyReason: string | null;
  setLocalRole: (r: Role) => void;
  setFocus: (id: string | null) => void;
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set) => ({
      local: EMPTY,
      shared: null,
      mode: "local",
      localRole: "APPROVER",
      sharedRole: "VIEWER",
      meId: null,
      names: {},
      focus: null,
      readOnlyReason: null,
      setLocalRole: (localRole) => set({ localRole }),
      setFocus: (focus) => set({ focus }),
    }),
    { name: "ufuq-delivery", version: 1, skipHydration: true, partialize: (s) => ({ local: s.local, localRole: s.localRole }) },
  ),
);

/** The data and identity the interface should use right now. */
export function useDelivery() {
  const mode = useDeliveryStore((s) => s.mode);
  const local = useDeliveryStore((s) => s.local);
  const shared = useDeliveryStore((s) => s.shared);
  const localRole = useDeliveryStore((s) => s.localRole);
  const sharedRole = useDeliveryStore((s) => s.sharedRole);
  const meId = useDeliveryStore((s) => s.meId);
  const actor = useApp((s) => s.actor);
  const names = useDeliveryStore((s) => s.names);
  const data = mode === "shared" && shared ? shared : local;
  const role: Role = mode === "shared" ? sharedRole : localRole;
  const me: Actor = mode === "shared" ? { id: meId, name: "" } : { id: null, name: actor };
  const nameOf = (a: Actor) => (a.id ? names[a.id] || (a.id === meId ? "You" : "Colleague") : a.name || "—");
  return { data, mode, role, me, nameOf, canPlan: role !== "VIEWER", canApprove: role === "APPROVER" };
}

// ---------------------------------------------------------------------------------------------
// Shared backend (hosted page only)

/* Minimal shapes of the platform capabilities used here. */
interface Snap { id: string; exists: boolean; data(): Record<string, unknown> | undefined }
interface QSnap { docs: Snap[] }
interface DocRef { set(d: Record<string, unknown>): Promise<void>; update(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> }
interface Query { orderBy(f: string, dir?: "asc" | "desc"): Query; limit(n: number): Query; onSnapshot(next: (s: QSnap) => void, err?: (e: { code: string }) => void): () => void }
interface Coll extends Query { doc(id?: string): DocRef }
interface Db { collection(path: string): Coll; doc(path: string): DocRef }
interface UserCap { id(): Promise<string | null>; canEdit(): Promise<boolean>; can(n: string): Promise<boolean | null>; profiles(ids: string[]): Promise<Record<string, { name: string }>> }
type ClaudeUse = { use(name: string): Promise<unknown> };

let db: Db | null = null;
let userCap: UserCap | null = null;
let started = false;

const clean = <T,>(x: T) => JSON.parse(JSON.stringify(x)) as Record<string, unknown>;

function sharedData(): DeliveryData {
  return useDeliveryStore.getState().shared ?? EMPTY;
}

async function resolveNames(d: DeliveryData) {
  if (!userCap) return;
  const ids = new Set<string>();
  const add = (a?: Actor) => { if (a?.id) ids.add(a.id); };
  Object.values(d.items).forEach((i) => add(i.createdBy));
  Object.values(d.approvals).forEach((a) => add(a.by));
  d.comments.forEach((c) => add(c.by));
  d.events.forEach((e) => add(e.by));
  d.versions.forEach((v) => add(v.by));
  const known = useDeliveryStore.getState().names;
  const missing = [...ids].filter((i) => !(i in known));
  if (!missing.length) return;
  const ps = await userCap.profiles(missing);
  useDeliveryStore.setState((s) => ({ names: { ...s.names, ...Object.fromEntries(missing.map((i) => [i, ps[i]?.name || ""])) } }));
}

/** Connect to the shared workspace when this page is hosted and the platform grants it. Idempotent. */
export async function startShared() {
  if (started || !isHosted()) return;
  started = true;
  const c = (window as unknown as { claude?: ClaudeUse }).claude;
  if (!c?.use) return;
  useDeliveryStore.setState({ mode: "connecting" });
  const [d, u] = (await Promise.all([c.use("db"), c.use("user")])) as [Db | null, UserCap | null];
  if (!d) { useDeliveryStore.setState({ mode: "local" }); return; }
  db = d;
  userCap = u;
  const [meId, editor, write] = u ? await Promise.all([u.id(), u.canEdit(), u.can("data.write")]) : [null, false, null];
  const sharedRole: Role = editor ? "APPROVER" : write === false || !meId ? "VIEWER" : "PLANNER";
  useDeliveryStore.setState({ mode: "shared", shared: { ...EMPTY }, meId, sharedRole });
  const patch = (p: Partial<DeliveryData>) => {
    const next = { ...sharedData(), ...p };
    useDeliveryStore.setState({ shared: next });
    void resolveNames(next);
  };
  const fail = (e: { code: string }) => { if (e.code !== "revoked") useDeliveryStore.setState({ readOnlyReason: e.code }); };
  d.collection("portfolio").onSnapshot((s) => patch({ items: Object.fromEntries(s.docs.filter((x) => x.exists).map((x) => [x.id, x.data() as unknown as PortfolioItem])) }), fail);
  d.collection("approvals").onSnapshot((s) => patch({ approvals: Object.fromEntries(s.docs.filter((x) => x.exists).map((x) => [x.id, x.data() as unknown as Approval])) }), fail);
  d.collection("comments").orderBy("at").limit(1000).onSnapshot((s) => patch({ comments: s.docs.map((x) => x.data() as unknown as Comment) }), fail);
  d.collection("events").orderBy("at", "desc").limit(400).onSnapshot((s) => patch({ events: s.docs.map((x) => x.data() as unknown as AuditEvent).reverse() }), fail);
  d.collection("versions").orderBy("at", "desc").limit(60).onSnapshot((s) => patch({ versions: s.docs.map((x) => x.data() as unknown as Version).reverse() }), fail);
}

async function sharedWrite(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    const code = (e as { code?: string }).code ?? "unavailable";
    if (code === "invalid_argument") useDeliveryStore.setState({ readOnlyReason: "not_permitted", sharedRole: "VIEWER" });
    toast({ message: code === "quota_exceeded" ? "The shared workspace is full — remove old versions or items and try again." : code === "invalid_argument" ? "You can view this workspace but not change it. Ask the owner for edit access." : "The change could not be saved. Please try again." });
  }
}

// ---------------------------------------------------------------------------------------------
// Actions (work in either workspace)

function me(): Actor {
  const s = useDeliveryStore.getState();
  return s.mode === "shared" ? { id: s.meId, name: "" } : { id: null, name: useApp.getState().actor };
}

export const currentActor = () => me();

const shared = () => useDeliveryStore.getState().mode === "shared" && db;

function localSet(fn: (d: DeliveryData) => DeliveryData) {
  useDeliveryStore.setState((s) => ({ local: fn(s.local) }));
}

function event(itemId: string | null, kind: EventKind, detail = ""): AuditEvent {
  return { id: uid("e"), itemId, kind, detail, at: new Date().toISOString(), by: me() };
}

async function logEvent(e: AuditEvent) {
  if (shared()) await sharedWrite(() => db!.collection("events").doc(e.id).set(clean(e)));
  else localSet((d) => ({ ...d, events: [...d.events, e].slice(-600) }));
}

async function putItem(item: PortfolioItem) {
  const it = { ...item, updatedAt: new Date().toISOString() };
  if (shared()) await sharedWrite(() => db!.collection("portfolio").doc(it.id).set(clean(it)));
  else localSet((d) => ({ ...d, items: { ...d.items, [it.id]: it } }));
}

function currentData() {
  const s = useDeliveryStore.getState();
  return s.mode === "shared" && s.shared ? s.shared : s.local;
}

export function inPortfolio(a: Pick<ActionItem, "govId" | "kind">) {
  return currentData().items[itemIdFor(a)] ?? null;
}

export async function propose(a: ActionItem) {
  const it = itemFromAction(a, me());
  if (currentData().items[it.id]) return it.id;
  await putItem(it);
  await logEvent(event(it.id, "PROPOSED", a.title.en));
  return it.id;
}

export async function decide(itemId: string, decision: Approval["decision"], note: string) {
  const ap: Approval = { itemId, decision, note, at: new Date().toISOString(), by: me() };
  if (shared()) await sharedWrite(() => db!.collection("approvals").doc(itemId).set(clean(ap)));
  else localSet((d) => ({ ...d, approvals: { ...d.approvals, [itemId]: ap } }));
  await logEvent(event(itemId, decision, note));
}

export async function updateItem(itemId: string, change: Partial<PortfolioItem>, kind: EventKind, detail: string) {
  const cur = currentData().items[itemId];
  if (!cur) return;
  await putItem({ ...cur, ...change });
  await logEvent(event(itemId, kind, detail));
}

export async function removeItem(itemId: string) {
  const cur = currentData().items[itemId];
  if (!cur) return;
  if (shared()) {
    await sharedWrite(() => db!.collection("portfolio").doc(itemId).delete());
  } else {
    localSet((d) => {
      const items = { ...d.items };
      delete items[itemId];
      return { ...d, items };
    });
  }
  await logEvent(event(itemId, "REMOVED", cur.title.en));
}

export async function addComment(itemId: string, text: string) {
  const c: Comment = { id: uid("c"), itemId, text: text.slice(0, 2000), at: new Date().toISOString(), by: me() };
  if (shared()) await sharedWrite(() => db!.collection("comments").doc(c.id).set(clean(c)));
  else localSet((d) => ({ ...d, comments: [...d.comments, c] }));
  await logEvent(event(itemId, "COMMENT", ""));
}

export async function saveVersion(name: string) {
  const v: Version = { id: uid("v"), name: name.slice(0, 120), at: new Date().toISOString(), by: me(), rows: versionRows(currentData()) };
  if (shared()) await sharedWrite(() => db!.collection("versions").doc(v.id).set(clean(v)));
  else localSet((d) => ({ ...d, versions: [...d.versions, v] }));
  await logEvent(event(null, "VERSION", v.name));
}

export async function loadDemo(actions: ActionItem[]) {
  const { items, approvals, events } = demoPortfolio(actions, me());
  if (shared()) {
    for (const it of items) await sharedWrite(() => db!.collection("portfolio").doc(it.id).set(clean(it)));
    for (const a of approvals) await sharedWrite(() => db!.collection("approvals").doc(a.itemId).set(clean(a)));
    await logEvent(event(null, "DEMO", `${items.length} items`));
  } else {
    localSet((d) => ({
      ...d,
      items: { ...d.items, ...Object.fromEntries(items.map((i) => [i.id, i])) },
      approvals: { ...d.approvals, ...Object.fromEntries(approvals.map((a) => [a.itemId, a])) },
      events: [...d.events, ...events, event(null, "DEMO", `${items.length} items`)].sort((a, b) => a.at.localeCompare(b.at)),
    }));
  }
}

/** Clear the local workspace (local only — the shared workspace is never wiped from the page). */
export function resetLocal() {
  useDeliveryStore.setState({ local: EMPTY });
}

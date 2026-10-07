// Explicit, pure state machines. A status may only change through transition().
// Nothing here touches the database, the clock or the audit log: callers pass
// facts in through the context, and src/state/apply.ts persists and audits.

export type GuardResult = { ok: true } | { ok: false; reason: string };

export const pass: GuardResult = { ok: true };
export const fail = (reason: string): GuardResult => ({ ok: false, reason });

export interface TransitionDef<S extends string, C> {
  from: readonly S[];
  to: S;
  /** Process address that owns this step, e.g. "4.8.1". Written to the audit record. */
  process: string;
  guard?: (ctx: C) => GuardResult;
}

export interface MachineDef<S extends string, E extends string, C> {
  name: string;
  states: readonly S[];
  initial: S;
  terminal: readonly S[];
  events: { readonly [K in E]: TransitionDef<S, C> };
}

export type Machine<S extends string, E extends string, C> = Readonly<MachineDef<S, E, C>>;

export type StateOf<M> = M extends Machine<infer S, string, any> ? S : never;
export type EventOf<M> = M extends Machine<string, infer E, any> ? E : never;
export type ContextOf<M> = M extends Machine<string, string, infer C> ? C : never;

export type TransitionResult<S extends string, E extends string> =
  | { ok: true; machine: string; event: E; from: S; to: S; process: string }
  | { ok: false; machine: string; event: string; from: string; code: "unknown_event" | "illegal_from" | "guard_failed"; reason: string };

export class MachineDefinitionError extends Error {}

export class IllegalTransitionError extends Error {
  constructor(public readonly result: Extract<TransitionResult<string, string>, { ok: false }>) {
    super(`${result.machine}: ${result.event} from ${result.from} refused (${result.code}): ${result.reason}`);
  }
}

/** Validates the definition once, at module load, so a broken machine never ships. */
export function defineMachine<const S extends string, const E extends string, C = Record<string, never>>(
  def: MachineDef<S, E, C>,
): Machine<S, E, C> {
  const states = new Set<string>(def.states);
  if (!states.has(def.initial)) throw new MachineDefinitionError(`${def.name}: initial state ${def.initial} is not a state`);
  for (const t of def.terminal) {
    if (!states.has(t)) throw new MachineDefinitionError(`${def.name}: terminal state ${t} is not a state`);
  }
  const reachable = new Set<string>([def.initial]);
  for (const [event, t] of Object.entries(def.events) as [string, TransitionDef<S, C>][]) {
    if (!states.has(t.to)) throw new MachineDefinitionError(`${def.name}.${event}: target ${t.to} is not a state`);
    if (t.from.length === 0) throw new MachineDefinitionError(`${def.name}.${event}: no source states`);
    for (const f of t.from) {
      if (!states.has(f)) throw new MachineDefinitionError(`${def.name}.${event}: source ${f} is not a state`);
      if (def.terminal.includes(f)) throw new MachineDefinitionError(`${def.name}.${event}: leaves terminal state ${f}`);
    }
    if (!/^\d+(\.\d+)*$/.test(t.process)) throw new MachineDefinitionError(`${def.name}.${event}: process address ${t.process} is malformed`);
  }
  // Every state must be reachable from the initial state.
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of Object.values(def.events) as TransitionDef<S, C>[]) {
      if (!reachable.has(t.to) && t.from.some((f) => reachable.has(f))) {
        reachable.add(t.to);
        grew = true;
      }
    }
  }
  const unreachable = def.states.filter((s) => !reachable.has(s));
  if (unreachable.length) throw new MachineDefinitionError(`${def.name}: unreachable states ${unreachable.join(", ")}`);
  return Object.freeze({ ...def });
}

export function transition<S extends string, E extends string, C>(
  m: Machine<S, E, C>,
  from: S,
  event: E,
  ctx: C,
): TransitionResult<S, E> {
  const t = (m.events as Record<string, TransitionDef<S, C> | undefined>)[event];
  if (!t) return { ok: false, machine: m.name, event, from, code: "unknown_event", reason: `unknown event ${event}` };
  if (!t.from.includes(from)) {
    return { ok: false, machine: m.name, event, from, code: "illegal_from", reason: `${event} is not allowed from ${from}` };
  }
  if (t.guard) {
    const g = t.guard(ctx);
    if (!g.ok) return { ok: false, machine: m.name, event, from, code: "guard_failed", reason: g.reason };
  }
  return { ok: true, machine: m.name, event, from, to: t.to, process: t.process };
}

/** Like transition(), but throws IllegalTransitionError on refusal. */
export function transitionOrThrow<S extends string, E extends string, C>(m: Machine<S, E, C>, from: S, event: E, ctx: C) {
  const r = transition(m, from, event, ctx);
  if (!r.ok) throw new IllegalTransitionError(r);
  return r;
}

/** Events whose source state matches; guards are not evaluated (they need context). */
export function eventsFrom<S extends string, E extends string, C>(m: Machine<S, E, C>, from: S): E[] {
  return (Object.entries(m.events) as [E, TransitionDef<S, C>][]).filter(([, t]) => t.from.includes(from)).map(([e]) => e);
}

export function isTerminal<S extends string>(m: Machine<S, string, any>, s: S): boolean {
  return m.terminal.includes(s);
}

import { describe, expect, it } from "vitest";
import { defineMachine, eventsFrom, IllegalTransitionError, isTerminal, MachineDefinitionError, transitionOrThrow } from "@/state/machine";
import { MACHINES } from "@/state/machines";

describe("defineMachine rejects broken definitions", () => {
  const base = { name: "t", states: ["a", "b", "c"] as const, initial: "a" as const, terminal: ["c"] as const };

  it("rejects a target that is not a state", () => {
    expect(() => defineMachine({ ...base, events: { go: { from: ["a"], to: "z" as "a", process: "1.1" } } })).toThrow(MachineDefinitionError);
  });
  it("rejects leaving a terminal state", () => {
    expect(() =>
      defineMachine({ ...base, events: { go: { from: ["a"], to: "b", process: "1.1" }, end: { from: ["b"], to: "c", process: "1.1" }, back: { from: ["c"], to: "a", process: "1.1" } } }),
    ).toThrow(/terminal/);
  });
  it("rejects unreachable states", () => {
    expect(() => defineMachine({ ...base, events: { go: { from: ["a"], to: "b", process: "1.1" } } })).toThrow(/unreachable states c/);
  });
  it("rejects malformed process addresses", () => {
    expect(() => defineMachine({ ...base, events: { go: { from: ["a"], to: "b", process: "four" }, end: { from: ["b"], to: "c", process: "1" } } })).toThrow(/malformed/);
  });
});

describe("helpers", () => {
  it("transitionOrThrow throws IllegalTransitionError with the refusal attached", () => {
    try {
      transitionOrThrow(MACHINES.shipment, "closed", "depart", {});
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(IllegalTransitionError);
      expect((e as IllegalTransitionError).result.code).toBe("illegal_from");
    }
  });
  it("eventsFrom lists events available from a state", () => {
    expect(eventsFrom(MACHINES.quote, "sent").sort()).toEqual(["accept", "counter", "expire", "reject", "supersede"]);
  });
  it("isTerminal", () => {
    expect(isTerminal(MACHINES.request, "won")).toBe(true);
    expect(isTerminal(MACHINES.request, "quoted")).toBe(false);
  });
  it("machines are frozen", () => {
    expect(Object.isFrozen(MACHINES.quote)).toBe(true);
  });
});

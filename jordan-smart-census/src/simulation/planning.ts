/**
 * Census operational planning calculator.
 *
 *   effective capacity / enumerator / day = interviews per day × efficiency
 *   enumerators      = ⌈ households / (field days × effective capacity) ⌉
 *   reserve          = ⌈ enumerators × reserve % ⌉
 *   supervisors      = ⌈ (enumerators + reserve) / ratio ⌉
 *   devices          = ⌈ (enumerators + reserve + supervisors) × (1 + device reserve %) ⌉
 *   training cohorts = ⌈ field staff / batch size ⌉
 *   interviews / day = enumerators × effective capacity
 *   capacity ratio   = interviews/day × field days / households
 *   completion date  = start + ⌈ households / interviews per day ⌉ working days (Fridays optional)
 */
import { addDays, format } from "date-fns";
import { z } from "zod";

export const PlanInputSchema = z.object({
  households: z.number().int().min(1000).max(10_000_000),
  fieldDays: z.number().int().min(5).max(90),
  interviewsPerDay: z.number().min(4).max(40),
  efficiency: z.number().min(0.4).max(1),
  supervisorRatio: z.number().int().min(3).max(20),
  reservePct: z.number().min(0).max(0.4),
  trainingBatch: z.number().int().min(10).max(80),
  deviceReservePct: z.number().min(0).max(0.3),
  startDate: z.string(),
  referenceDate: z.string(),
  excludeFridays: z.boolean(),
});

export type PlanInput = z.infer<typeof PlanInputSchema>;

export interface PlanResult {
  name: "LEAN" | "BASE" | "ACCELERATED";
  input: PlanInput;
  effectiveCapacity: number;
  enumerators: number;
  reserve: number;
  supervisors: number;
  devices: number;
  fieldStaff: number;
  trainingCohorts: number;
  interviewsPerDay: number;
  capacityRatio: number;
  workingDaysNeeded: number;
  completionDate: string;
  householdsPerEnumerator: number;
}

export function calculatePlan(input: PlanInput, name: PlanResult["name"] = "BASE"): PlanResult {
  const cap = input.interviewsPerDay * input.efficiency;
  const enumerators = Math.ceil(input.households / (input.fieldDays * cap));
  const reserve = Math.ceil(enumerators * input.reservePct);
  const supervisors = Math.ceil((enumerators + reserve) / input.supervisorRatio);
  const fieldStaff = enumerators + reserve + supervisors;
  const devices = Math.ceil(fieldStaff * (1 + input.deviceReservePct));
  const perDay = enumerators * cap;
  const workingDaysNeeded = Math.ceil(input.households / perDay);
  let d = new Date(`${input.startDate}T00:00:00`);
  let counted = 0;
  while (counted < workingDaysNeeded) {
    if (!(input.excludeFridays && d.getDay() === 5)) counted++;
    if (counted < workingDaysNeeded) d = addDays(d, 1);
  }
  return {
    name,
    input,
    effectiveCapacity: cap,
    enumerators,
    reserve,
    supervisors,
    devices,
    fieldStaff,
    trainingCohorts: Math.ceil(fieldStaff / input.trainingBatch),
    interviewsPerDay: perDay,
    capacityRatio: (perDay * input.fieldDays) / input.households,
    workingDaysNeeded,
    completionDate: format(d, "yyyy-MM-dd"),
    householdsPerEnumerator: input.households / enumerators,
  };
}

/** Lean: longer fieldwork, fewer staff, low reserves. Accelerated: shorter fieldwork, more staff, higher reserves. */
export function planScenarios(base: PlanInput): PlanResult[] {
  return [
    calculatePlan({ ...base, fieldDays: Math.round(base.fieldDays * 1.4), reservePct: Math.max(0.03, base.reservePct - 0.05), deviceReservePct: Math.max(0.02, base.deviceReservePct - 0.03), supervisorRatio: base.supervisorRatio + 2 }, "LEAN"),
    calculatePlan(base, "BASE"),
    calculatePlan({ ...base, fieldDays: Math.max(5, Math.round(base.fieldDays * 0.7)), reservePct: base.reservePct + 0.05, deviceReservePct: base.deviceReservePct + 0.03, supervisorRatio: Math.max(3, base.supervisorRatio - 2) }, "ACCELERATED"),
  ];
}

/**
 * Non-response & revisit planning (census operations).
 *
 *   final contact        = 1 − (1 − c₁)(1 − s)^k               c₁ first-visit contact, s revisit success, k max revisits
 *   revisits             = H × (1 − c₁) × Σ_{j<k} (1 − s)^j
 *   refusals             = contacted × r ; converted by supervisors = refusals × v
 *   final response       = contacted × (1 − r) + refusals × v      (share of occupied households)
 *   revisit minutes      = revisits × (travel + attempt) + converted interviews × interview minutes
 *   enumerator-days      = revisit minutes ÷ working minutes per day
 *   follow-up team       = ⌈ enumerator-days ÷ follow-up window (days) ⌉   (dedicated team in the closing window)
 *   workload share       = revisit minutes ÷ (first-visit minutes + revisit minutes)
 */
export interface ResponseInputs {
  households: number;
  firstContact: number;
  revisitSuccess: number;
  maxRevisits: number;
  refusal: number;
  conversion: number;
  travelMin: number;
  attemptMin: number;
  interviewMin: number;
  dayMinutes: number;
  windowDays: number;
}

export const DEFAULT_RESPONSE: Omit<ResponseInputs, "households"> = { firstContact: 0.78, revisitSuccess: 0.5, maxRevisits: 3, refusal: 0.035, conversion: 0.3, travelMin: 12, attemptMin: 4, interviewMin: 28, dayMinutes: 420, windowDays: 10 };

export interface ResponsePlan {
  finalContact: number;
  finalResponse: number;
  revisits: number;
  nonResponse: number;
  refusals: number;
  converted: number;
  revisitMinutes: number;
  enumeratorDays: number;
  workloadShare: number;
  team: number;
  byRevisits: { k: number; response: number; team: number }[];
}

export function planResponse(x: ResponseInputs): ResponsePlan {
  const calc = (k: number) => {
    const miss = 1 - x.firstContact;
    const finalContact = 1 - miss * Math.pow(1 - x.revisitSuccess, k);
    let revisitsPerHH = 0;
    for (let j = 0; j < k; j++) revisitsPerHH += miss * Math.pow(1 - x.revisitSuccess, j);
    const contacted = x.households * finalContact;
    const refusals = contacted * x.refusal;
    const converted = refusals * x.conversion;
    const finalResponse = (contacted - refusals + converted) / x.households;
    const revisits = x.households * revisitsPerHH;
    const contactsViaRevisit = x.households * (finalContact - x.firstContact);
    const revisitMinutes = revisits * (x.travelMin + x.attemptMin) + (contactsViaRevisit + converted) * x.interviewMin;
    const firstMinutes = x.households * (x.travelMin + x.attemptMin) + x.households * x.firstContact * x.interviewMin;
    const enumeratorDays = revisitMinutes / x.dayMinutes;
    const team = Math.ceil(enumeratorDays / Math.max(1, x.windowDays));
    return { finalContact, finalResponse, revisits, nonResponse: x.households * (1 - finalResponse), refusals, converted, revisitMinutes, enumeratorDays, workloadShare: revisitMinutes / (firstMinutes + revisitMinutes), team };
  };
  const main = calc(x.maxRevisits);
  return { ...main, byRevisits: [0, 1, 2, 3, 4, 5].map((k) => ({ k, response: calc(k).finalResponse, team: calc(k).team })) };
}

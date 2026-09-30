import { BIDS, CRITERIA } from "@/data/evaluation";
import type { BidScore } from "@/types";

export interface ComputedScore {
  supplierId: string;
  technical: number; // 0..100 over technical criteria only
  commercial: number; // 0..100
  weighted: number; // 0..100
  riskAdjusted: number; // 0..100
  price: number;
}

export function computeScore(bid: BidScore): ComputedScore {
  const techCriteria = CRITERIA.filter((c) => c.group === "technical");
  const techWeight = techCriteria.reduce((a, c) => a + c.weight, 0);
  const technical = techCriteria.reduce((a, c) => a + bid.scores[c.id] * c.weight, 0) / techWeight;
  const weighted = CRITERIA.reduce((a, c) => a + bid.scores[c.id] * c.weight, 0) / 100;
  return {
    supplierId: bid.supplierId,
    technical: round(technical * 10),
    commercial: round(bid.scores.commercial * 10),
    weighted: round(weighted * 10),
    riskAdjusted: round(weighted * 10 - bid.riskAdjustment),
    price: bid.price,
  };
}

export function allScores(): ComputedScore[] {
  return BIDS.map(computeScore);
}

export function rankedScores(): ComputedScore[] {
  return allScores().sort((a, b) => b.riskAdjusted - a.riskAdjusted);
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

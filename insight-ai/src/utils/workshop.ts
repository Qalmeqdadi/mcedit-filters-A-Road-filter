import { aiStages, answerScale, questions, questionsFor, stageUsesAi, type Question } from '../data/assessment';
import { playById } from '../data/plays';
import { sectorById } from '../data/sectors';
import { serviceById } from '../data/services';
import type { PlayId, ServiceId } from '../data/types';
import { defaultPlay, maturityDimensions, quadrantFor, quadrants, type MaturityDimension, type Quadrant } from '../data/workshop';
import type { ClientSession, UseCase } from '../hooks/useClient';

/** Default target reflects the AI stage; the client can change it per area. */
export function defaultTarget(session: ClientSession) {
  return stageUsesAi(session.aiStage) ? 4 : 3;
}

/** Service that leads each GTM play's landing; used to suggest a play from the biggest gap. */
const playForService: Record<ServiceId, PlayId> = { s01: 'p01', s02: 'p06', s03: 'p03', s04: 'p02', s05: 'p04', s06: 'p05' };

export function targetFor(session: ClientSession, id: string) {
  return session.targets[id] ?? defaultTarget(session);
}

export interface AreaResult {
  dimension: MaturityDimension;
  questions: Question[];
  answered: number;
  unknown: number;
  /** Mean of the 1–5 answers, or null when nothing is scored yet. */
  score: number | null;
  target: number;
  gap: number;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function areaResults(session: ClientSession): AreaResult[] {
  return maturityDimensions.map((d) => {
    const qs = questionsFor(d.id, session.aiStage);
    const vals = qs.map((x) => session.answers[x.id]).filter((a): a is number => typeof a === 'number');
    const unknown = qs.filter((x) => session.answers[x.id] === 'dk').length;
    const score = vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    const target = targetFor(session, d.id);
    return { dimension: d, questions: qs, answered: vals.length + unknown, unknown, score, target, gap: score == null ? 0 : Math.max(0, round1(target - score)) };
  });
}

export function progress(session: ClientSession) {
  const rs = areaResults(session);
  const total = rs.reduce((a, r) => a + r.questions.length, 0);
  const answered = rs.reduce((a, r) => a + r.answered, 0);
  return { total, answered, areasScored: rs.filter((r) => r.score != null).length, areas: rs.length };
}

export function scoredCount(session: ClientSession) {
  return areaResults(session).filter((r) => r.score != null).length;
}

/** Gaps between the client's own area scores and targets, largest first. */
export function gaps(session: ClientSession) {
  return areaResults(session)
    .filter((r) => r.score != null && r.gap > 0)
    .sort((a, b) => b.gap - a.gap || a.score! - b.score!);
}

/** The lowest-scoring individual practices, for specific recommendations. */
export function weakestPractices(session: ClientSession, n = 5) {
  return questions
    .filter((x) => questionsFor(x.area, session.aiStage).includes(x))
    .map((x) => ({ question: x, score: session.answers[x.id] }))
    .filter((x): x is { question: Question; score: number } => typeof x.score === 'number' && x.score <= 2)
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((x) => ({ ...x, area: maturityDimensions.find((d) => d.id === x.question.area)!, label: answerScale[x.score - 1].name }));
}

export function unknownCount(session: ClientSession) {
  return areaResults(session).reduce((a, r) => a + r.unknown, 0);
}

export function stageName(session: ClientSession) {
  return session.aiStage ? aiStages.find((s) => s.id === session.aiStage)!.name : null;
}

/**
 * Recommended starting point. Before AI is in use, the start is always strategy and
 * control foundations; afterwards it is the service carrying the largest total gap.
 */
export function recommendation(session: ClientSession) {
  const g = gaps(session);
  if (session.aiStage && !stageUsesAi(session.aiStage)) {
    return {
      service: serviceById.s01,
      play: playById.p01,
      dimensions: g.slice(0, 3),
      foundations: true,
      reason: 'Before AI is in organisational use, start by agreeing the ambition, the first use cases and the AI Control foundations (acceptable-use policy, approved tools, risk assessment).',
    };
  }
  if (!g.length) return null;
  const byService = new Map<ServiceId, number>();
  for (const x of g) byService.set(x.dimension.service, (byService.get(x.dimension.service) ?? 0) + x.gap);
  const [service] = [...byService.entries()].sort((a, b) => b[1] - a[1])[0];
  const dims = g.filter((x) => x.dimension.service === service);
  return {
    service: serviceById[service],
    play: playById[playForService[service]],
    dimensions: dims,
    foundations: false,
    reason: `Closes the largest share of the client’s gaps (${dims.map((d) => d.dimension.short).join(', ')}).`,
  };
}

/** The play for this session: chosen explicitly, else the sector's lead play, else the default. */
export function sessionPlay(session: ClientSession) {
  if (session.play) return playById[session.play];
  if (session.sector) return playById[sectorById[session.sector].leadPlays[0]];
  return playById[defaultPlay];
}

export interface RankedUseCase extends UseCase {
  quadrant: Quadrant;
  rank: number;
}

/** Use cases ranked by value × readiness, then value. */
export function rankedUseCases(session: ClientSession): RankedUseCase[] {
  return [...session.useCases]
    .sort((a, b) => b.value * b.readiness - a.value * a.readiness || b.value - a.value)
    .map((u, i) => ({ ...u, quadrant: quadrantFor(u.value, u.readiness), rank: i + 1 }));
}

export function roadmap(session: ClientSession) {
  const ranked = rankedUseCases(session);
  return (['Now', 'Next', 'Later'] as const).map((h) => ({ horizon: h, items: ranked.filter((u) => quadrants[u.quadrant].horizon === h) }));
}

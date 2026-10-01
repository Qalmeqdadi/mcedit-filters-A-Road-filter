import { playById } from '../data/plays';
import { sectorById } from '../data/sectors';
import { serviceById } from '../data/services';
import type { PlayId, ServiceId } from '../data/types';
import { defaultPlay, maturityDimensions, quadrantFor, quadrants, type MaturityDimension, type Quadrant } from '../data/workshop';
import type { ClientSession, UseCase } from '../hooks/useClient';

export const DEFAULT_TARGET = 4;

/** Service that leads each GTM play's landing; used to suggest a play from the biggest gap. */
const playForService: Record<ServiceId, PlayId> = { s01: 'p01', s02: 'p06', s03: 'p03', s04: 'p02', s05: 'p04', s06: 'p05' };

export interface Gap {
  dimension: MaturityDimension;
  now: number;
  target: number;
  gap: number;
}

export function targetFor(session: ClientSession, id: string) {
  return session.targets[id] ?? DEFAULT_TARGET;
}

export function scoredCount(session: ClientSession) {
  return maturityDimensions.filter((d) => session.scores[d.id] != null).length;
}

/** Gaps between the client's own current and target scores, largest first. */
export function gaps(session: ClientSession): Gap[] {
  return maturityDimensions
    .filter((d) => session.scores[d.id] != null)
    .map((d) => {
      const now = session.scores[d.id]!;
      const target = targetFor(session, d.id);
      return { dimension: d, now, target, gap: Math.max(0, target - now) };
    })
    .filter((g) => g.gap > 0)
    .sort((a, b) => b.gap - a.gap || a.now - b.now);
}

/** Recommended starting point: the service carrying the largest total gap. */
export function recommendation(session: ClientSession) {
  const g = gaps(session);
  if (!g.length) return null;
  const byService = new Map<ServiceId, number>();
  for (const x of g) byService.set(x.dimension.service, (byService.get(x.dimension.service) ?? 0) + x.gap);
  const [service, total] = [...byService.entries()].sort((a, b) => b[1] - a[1])[0];
  return { service: serviceById[service], totalGap: total, play: playById[playForService[service]], dimensions: g.filter((x) => x.dimension.service === service) };
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

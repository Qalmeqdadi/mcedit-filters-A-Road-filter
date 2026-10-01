import type { AcceleratorId, PlayId, ServiceId, StageId } from './types';

/**
 * CLIENT WORKSHOP content: the maturity self-check dimensions and the use-case
 * prioritisation logic. Scores come only from the client in the room; the app
 * never invents benchmarks or targets.
 */
export interface MaturityDimension {
  id: string;
  name: string;
  short: string;
  group: 'Readiness' | 'AI Control';
  question: string;
  service: ServiceId;
  accelerator?: AcceleratorId;
}

export const maturityLevels = [
  { score: 1, name: 'Ad hoc', description: 'Isolated activity; no shared approach.' },
  { score: 2, name: 'Emerging', description: 'Some practices exist, applied inconsistently.' },
  { score: 3, name: 'Defined', description: 'An agreed approach, applied in most areas.' },
  { score: 4, name: 'Managed', description: 'Applied consistently, measured and owned.' },
  { score: 5, name: 'Optimised', description: 'Continuously improved and built into operations.' },
];

export const maturityDimensions: MaturityDimension[] = [
  { id: 'strategy', name: 'Strategy & value', short: 'Strategy', group: 'Readiness', question: 'Is there an agreed AI ambition, a prioritised portfolio and a way to track value?', service: 's01', accelerator: 'aro' },
  { id: 'data', name: 'Data readiness', short: 'Data', group: 'Readiness', question: 'Is the data AI needs available, governed, of known quality and usable?', service: 's05' },
  { id: 'technology', name: 'Technology readiness', short: 'Technology', group: 'Readiness', question: 'Is there a secure platform for models, copilots and agents, integrated with core systems?', service: 's05', accelerator: 'ai-hub' },
  { id: 'people', name: 'People & adoption', short: 'People', group: 'Readiness', question: 'Do leaders and employees have the skills and confidence to use AI well?', service: 's06', accelerator: 'flight-academy' },
  { id: 'operating-model', name: 'Human + AI operating model', short: 'Op. model', group: 'Readiness', question: 'Are processes, roles and decision rights designed for people and agents working together?', service: 's02' },
  { id: 'identity', name: 'Identity & Access', short: 'Identity', group: 'AI Control', question: 'Does every agent have a verified identity and least-privilege access?', service: 's03', accelerator: 'radius' },
  { id: 'authority', name: 'Authority & Permissions', short: 'Authority', group: 'AI Control', question: 'Is it defined what each agent may recommend, decide or execute, and when it escalates?', service: 's03', accelerator: 'radius' },
  { id: 'policy', name: 'Policy & Guardrails', short: 'Policy', group: 'AI Control', question: 'Are policies translated into controls that are enforced at runtime?', service: 's03', accelerator: 'policy-agent' },
  { id: 'data-model', name: 'Data & Model Governance', short: 'Models', group: 'AI Control', question: 'Are models inventoried, evaluated and approved for defined purposes?', service: 's03', accelerator: 'radius' },
  { id: 'oversight', name: 'Human Oversight', short: 'Oversight', group: 'AI Control', question: 'Do people remain accountable for material decisions, with the ability to intervene?', service: 's03' },
  { id: 'monitoring', name: 'Monitoring, Evidence & Audit', short: 'Monitoring', group: 'AI Control', question: 'Is AI behaviour monitored, with evidence auditors could rely on?', service: 's03', accelerator: 'policy-agent' },
  { id: 'value-ops', name: 'Value & Operational Monitoring', short: 'Value ops', group: 'AI Control', question: 'Are AI value, cost and service levels tracked once in operation?', service: 's06', accelerator: 'tokenscope' },
];

export type Quadrant = 'lighthouse' | 'strategic' | 'quick' | 'park';

export const quadrants: Record<Quadrant, { name: string; action: string; stage: StageId; horizon: 'Now' | 'Next' | 'Later'; service: ServiceId }> = {
  lighthouse: { name: 'Lighthouse', action: 'Prove it now with a Lighthouse PoV.', stage: 'prove', horizon: 'Now', service: 's04' },
  strategic: { name: 'Strategic bet', action: 'Build the data, platform and control foundations first.', stage: 'build', horizon: 'Next', service: 's05' },
  quick: { name: 'Efficiency win', action: 'Deliver through reusable patterns and the AI Factory.', stage: 'industrialise', horizon: 'Next', service: 's06' },
  park: { name: 'Park', action: 'Revisit when value or readiness changes.', stage: 'prioritise', horizon: 'Later', service: 's01' },
};

export function quadrantFor(value: number, readiness: number): Quadrant {
  const highValue = value >= 3;
  const ready = readiness >= 3;
  if (highValue && ready) return 'lighthouse';
  if (highValue) return 'strategic';
  if (ready) return 'quick';
  return 'park';
}

/** Default play for the session when no sector lead play applies. */
export const defaultPlay: PlayId = 'p01';

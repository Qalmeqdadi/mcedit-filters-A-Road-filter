import type { OsActor, OsLayer, OsLayerId } from './types';

/**
 * HUMAN + AI OPERATING SYSTEM: the reference architecture for the client's enterprise.
 * The same five layers are reused by every industry overlay.
 */
export const osLayers: OsLayer[] = [
  {
    id: 'workforce',
    number: '01',
    name: 'Human + AI Workforce',
    icon: 'Users',
    summary: 'People and AI working as one workforce, each with defined roles, authority and accountability.',
    elements: ['Leaders', 'Employees', 'Applications', 'Copilots', 'Specialist Agents', 'Orchestrators', 'Autonomous Agents'],
    services: ['s02', 's06', 's04'],
    controlFocus: ['identity', 'authority', 'oversight'],
    tech: ['workplace', 'enterprise-apps'],
  },
  {
    id: 'orchestration',
    number: '02',
    name: 'Process & Agent Orchestration',
    icon: 'Workflow',
    summary: 'Work flows across people, systems and agents, with clear hand-offs and human escalation.',
    elements: ['Workflows', 'Cases', 'Tasks', 'Events', 'Service delivery', 'Agent coordination', 'Human escalation'],
    services: ['s02', 's04'],
    controlFocus: ['authority', 'policy', 'intervention'],
    tech: ['enterprise-apps'],
  },
  {
    id: 'decision',
    number: '03',
    name: 'Decision & Intelligence',
    icon: 'Brain',
    summary: 'Analytics, reasoning, prediction and simulation that inform or make decisions.',
    elements: ['Analytics', 'Decision support', 'AI reasoning', 'Predictions', 'Simulation', 'Digital twins'],
    services: ['s04', 's01'],
    controlFocus: ['oversight', 'data-model', 'monitoring'],
    tech: ['models', 'data-platforms'],
  },
  {
    id: 'data',
    number: '04',
    name: 'Data, Knowledge & Models',
    icon: 'Database',
    summary: 'The enterprise context AI depends on: governed data, structured knowledge and approved models.',
    elements: ['Enterprise data', 'Knowledge', 'Ontologies', 'Semantic context', 'Models', 'Enterprise context'],
    services: ['s05', 's04'],
    controlFocus: ['data-model', 'identity', 'policy'],
    tech: ['data-platforms', 'models'],
  },
  {
    id: 'platform',
    number: '05',
    name: 'Digital & AI Platform',
    icon: 'Server',
    summary: 'The applications, integration, AI platforms and infrastructure everything above runs on.',
    elements: ['Applications', 'APIs', 'Integration', 'AI platforms', 'Cloud', 'Infrastructure'],
    services: ['s05', 's06'],
    controlFocus: ['identity', 'monitoring', 'value'],
    tech: ['cloud', 'sovereign', 'compute', 'security'],
  },
];

/** The autonomy continuum within the Human + AI Workforce layer. */
export const autonomyContinuum: OsActor[] = [
  { id: 'leaders', name: 'Leaders', mode: 'Human accountable', description: 'Set direction and remain accountable for outcomes.' },
  { id: 'employees', name: 'Employees', mode: 'Human performs', description: 'Perform, review and supervise work.' },
  { id: 'applications', name: 'Applications', mode: 'Rules execute', description: 'Deterministic systems executing defined rules.' },
  { id: 'copilots', name: 'Copilots', mode: 'Human in the loop', description: 'Suggest and draft; a person decides.' },
  { id: 'specialist', name: 'Specialist Agents', mode: 'Human approves', description: 'Complete bounded tasks; material steps are approved.' },
  { id: 'orchestrators', name: 'Orchestrators', mode: 'Human on the loop', description: 'Coordinate agents and hand-offs under supervision.' },
  { id: 'autonomous', name: 'Autonomous Agents', mode: 'Human on exception', description: 'Act within delegated authority; escalate exceptions.' },
];

export const osLayerById = Object.fromEntries(osLayers.map((l) => [l.id, l])) as Record<OsLayerId, OsLayer>;

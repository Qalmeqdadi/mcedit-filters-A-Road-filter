import type { Competitor } from './types';

/**
 * COMPETITIVE LANDSCAPE: a neutral benchmark of market archetypes.
 * No ranking, scoring or market-share figures. Themes summarise each organisation's
 * publicly emphasised positioning; every firm listed operates more broadly.
 */
export const integratedPosition = [
  'Business transformation',
  'Human + AI operating model',
  'AI Control',
  'Agentic engineering',
  'Data / platform / infrastructure',
  'Ecosystem integration',
  'Adoption',
  'Managed operations',
];

export const competitors: Competitor[] = [
  {
    id: 'accenture',
    name: 'Accenture',
    archetype: 'Scale transformation integrator',
    themes: ['Large-scale transformation', 'AI platforms', 'Industry agents', 'Responsible AI'],
    dimensions: ['Business transformation', 'Data / platform / infrastructure', 'Agentic engineering', 'AI Control'],
  },
  {
    id: 'deloitte',
    name: 'Deloitte',
    archetype: 'Transformation and risk advisor',
    themes: ['Transformation', 'Governance', 'Risk', 'Agentic operating models'],
    dimensions: ['Business transformation', 'AI Control', 'Human + AI operating model'],
  },
  {
    id: 'ibm',
    name: 'IBM',
    archetype: 'Platform-led AI and operations',
    themes: ['Enterprise AI platforms', 'Agents', 'Governance', 'Managed operations'],
    dimensions: ['Data / platform / infrastructure', 'Agentic engineering', 'AI Control', 'Managed operations'],
  },
  {
    id: 'capgemini',
    name: 'Capgemini',
    archetype: 'Engineering-led transformation',
    themes: ['Transformation', 'Engineering', 'Enterprise AI'],
    dimensions: ['Business transformation', 'Agentic engineering', 'Data / platform / infrastructure'],
  },
  {
    id: 'kyndryl',
    name: 'Kyndryl',
    archetype: 'Infrastructure and managed services',
    themes: ['Infrastructure', 'Operations', 'Managed services'],
    dimensions: ['Data / platform / infrastructure', 'Managed operations'],
  },
  {
    id: 'wwt',
    name: 'WWT',
    archetype: 'Technology ecosystem and proving',
    themes: ['Technology ecosystem', 'Testing / proving', 'Infrastructure industrialisation'],
    dimensions: ['Ecosystem integration', 'Data / platform / infrastructure'],
  },
  {
    id: 'g42',
    name: 'G42',
    archetype: 'Sovereign AI infrastructure',
    themes: ['Sovereign AI', 'Cloud', 'National-scale AI infrastructure'],
    dimensions: ['Data / platform / infrastructure'],
  },
];

export const landscapeNote =
  'Archetypes summarise each organisation’s publicly emphasised positioning. All of these firms operate across a broader range of services. This view is not an assessment of capability or quality.';

export const integratedStatement =
  'Insight intends to compete on integration: connecting these eight elements into one accountable Human + AI operating system, built on the client’s existing technology estate.';

import type { Accelerator, AcceleratorFilter, AcceleratorId, ServiceId } from './types';
import { services } from './services';

/**
 * INSIGHT IP / ACCELERATORS: proprietary or reusable assets that make delivery faster or better.
 * Descriptions state each asset's role in the architecture only. They contain no performance metrics.
 * Supported services are derived from the service definitions, so there is one source of truth.
 */
export const accelerators: Accelerator[] = [
  {
    id: 'aro',
    name: 'ARO',
    descriptor: 'AI Roadmap Optimizer',
    icon: 'Route',
    whatItDoes:
      'Supports structured prioritisation and sequencing of AI use cases into an investment roadmap, so portfolio choices are explicit and comparable.',
    filters: ['ASSESS'],
    stages: ['understand', 'prioritise'],
    capabilities: ['prioritisation', 'roadmap', 'business-case', 'use-case-discovery'],
    tech: [],
  },
  {
    id: 'radius',
    name: 'Radius',
    descriptor: 'AI readiness and governance framework',
    icon: 'Gauge',
    whatItDoes:
      'Provides a structured framework to assess AI readiness and governance maturity and to define the controls needed before AI scales.',
    filters: ['ASSESS', 'GOVERN'],
    stages: ['understand', 'control'],
    capabilities: ['readiness', 'maturity', 'ai-governance', 'agent-governance'],
    tech: [],
  },
  {
    id: 'helios',
    name: 'HELIOS',
    descriptor: 'Agentic build platform',
    icon: 'Bot',
    whatItDoes:
      'Provides a build foundation for designing, assembling and deploying agents and agentic workflows to a consistent engineering standard.',
    filters: ['BUILD'],
    stages: ['prove', 'build', 'industrialise'],
    capabilities: ['agentic-ai', 'multi-agent', 'rapid-pov', 'ai-sdlc'],
    tech: ['models', 'cloud'],
  },
  {
    id: 'apollo',
    name: 'APOLLO',
    descriptor: 'Business ontology and agent enablement',
    icon: 'Network',
    whatItDoes:
      'Models business entities, relationships and rules as an ontology so agents act with shared enterprise context rather than isolated prompts.',
    filters: ['BUILD', 'PLATFORM'],
    stages: ['prove', 'build'],
    capabilities: ['ontologies', 'knowledge-architecture', 'agentic-ai'],
    tech: ['data-platforms'],
  },
  {
    id: 'junkshon',
    name: 'Junkshon',
    descriptor: 'IT estate intelligence',
    icon: 'Search',
    whatItDoes:
      'Builds an understanding of the existing application and infrastructure estate to inform AI readiness, modernisation and integration decisions.',
    filters: ['ASSESS', 'PLATFORM'],
    stages: ['understand', 'build'],
    capabilities: ['readiness', 'integration', 'cloud'],
    tech: ['enterprise-apps', 'cloud'],
  },
  {
    id: 'ai-hub',
    name: 'Enterprise AI Hub',
    descriptor: 'Enterprise AI platform',
    icon: 'Boxes',
    whatItDoes:
      'Provides a governed enterprise point of access to models, copilots and agents, so AI use runs on a common, controlled platform.',
    filters: ['PLATFORM', 'OPERATE'],
    stages: ['build', 'operate'],
    capabilities: ['ai-platforms', 'integration', 'policy-controls'],
    tech: ['models', 'cloud', 'security'],
  },
  {
    id: 'policy-agent',
    name: 'AI Policy Agent',
    descriptor: 'Policy intelligence and governance',
    icon: 'ScrollText',
    whatItDoes:
      'Applies AI to policy content to support policy interpretation and the mapping of policy requirements to operational controls.',
    filters: ['GOVERN'],
    stages: ['control', 'operate'],
    capabilities: ['policy-controls', 'ai-governance', 'auditability'],
    tech: ['models'],
  },
  {
    id: 'agent-store',
    name: 'Agent Store',
    descriptor: 'Reusable agents and patterns',
    icon: 'Store',
    whatItDoes:
      'A catalogue of reusable agents, components and patterns, so new use cases start from existing building blocks rather than from zero.',
    filters: ['BUILD', 'OPERATE'],
    stages: ['build', 'industrialise'],
    capabilities: ['reusable-patterns', 'ai-factory', 'agentic-ai'],
    tech: ['models'],
  },
  {
    id: 'flight-academy',
    name: 'AI Flight Academy',
    descriptor: 'Enterprise AI adoption',
    icon: 'GraduationCap',
    whatItDoes:
      'A structured adoption and learning programme that builds confident, responsible AI use across leaders, employees and practitioners.',
    filters: ['ADOPT'],
    stages: ['realise'],
    capabilities: ['adoption', 'capability-building', 'role-design'],
    tech: ['workplace'],
  },
  {
    id: 'tokenscope',
    name: 'TokenScope',
    descriptor: 'AI consumption and economics',
    icon: 'Coins',
    whatItDoes:
      'Provides visibility of AI consumption and cost across models, copilots and agents, to inform AI FinOps and value decisions.',
    filters: ['GOVERN', 'OPERATE'],
    stages: ['operate', 'realise'],
    capabilities: ['finops', 'observability', 'value-tracking'],
    tech: ['models', 'cloud'],
  },
  {
    id: 'devshop',
    name: 'Insight Devshop',
    descriptor: 'Rapid application engineering',
    icon: 'Code2',
    whatItDoes:
      'Rapid application engineering capacity that builds the applications, interfaces and integrations around AI solutions.',
    filters: ['BUILD'],
    stages: ['prove', 'build'],
    capabilities: ['intelligent-apps', 'rapid-pov', 'integration'],
    tech: ['enterprise-apps'],
  },
];

export const acceleratorFilters: { id: AcceleratorFilter; description: string }[] = [
  { id: 'ASSESS', description: 'Understand the current state and prioritise' },
  { id: 'GOVERN', description: 'Define and evidence control' },
  { id: 'BUILD', description: 'Engineer solutions and agents' },
  { id: 'PLATFORM', description: 'Establish data and platform foundations' },
  { id: 'ADOPT', description: 'Build workforce capability and use' },
  { id: 'OPERATE', description: 'Run, monitor and optimise' },
];

export const acceleratorById = Object.fromEntries(accelerators.map((a) => [a.id, a])) as Record<
  AcceleratorId,
  Accelerator
>;

/** Services that list the accelerator (single source of truth: services.ts). */
export function servicesForAccelerator(id: AcceleratorId): ServiceId[] {
  return services.filter((s) => s.accelerators.includes(id)).map((s) => s.id);
}

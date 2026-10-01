/** Definitions shown as tooltips wherever a term is marked up with <Term>. */
export const glossary: Record<string, { term: string; definition: string }> = {
  'ai-control': {
    term: 'AI Control',
    definition:
      'The system that governs what AI is permitted to know, decide and do. A horizontal layer embedded in every service, and also sold as Service 03.',
  },
  'human-ai-os': {
    term: 'Human + AI Operating System',
    definition:
      'The reference architecture for the client’s enterprise: five layers in which people, processes, data and agents work as one governed system.',
  },
  'lighthouse-pov': {
    term: 'Lighthouse PoV',
    definition: 'A proof of value on one high-visibility use case that validates technical feasibility and business value together.',
  },
  'ai-factory': {
    term: 'AI Factory',
    definition: 'A repeatable delivery model that takes AI use cases from intake to production using shared patterns and controls.',
  },
  'ai-coe': {
    term: 'AI CoE',
    definition: 'AI Centre of Excellence: the team that sets standards, manages the AI portfolio and builds capability.',
  },
  'agent-authority': {
    term: 'Agent authority',
    definition: 'What an agent may recommend, decide or execute, within which thresholds, and when it must escalate to a person.',
  },
  'agent-registry': {
    term: 'Agent registry',
    definition: 'The authoritative inventory of agents: owner, purpose, authority level, data access and status.',
  },
  'policy-to-control': {
    term: 'Policy-to-control',
    definition: 'Traceable mapping from a written policy or regulation to the technical and process controls that enforce it.',
  },
  'control-gate': {
    term: 'Control gate',
    definition: 'A formal decision point (GO, CONDITIONAL GO, REMEDIATE or STOP) at which AI must meet agreed controls to proceed.',
  },
  'sovereign-ai': {
    term: 'Sovereign AI',
    definition: 'AI whose data, models and infrastructure remain under the jurisdiction and control the client requires.',
  },
  'ai-finops': {
    term: 'AI FinOps',
    definition: 'Visibility, allocation and optimisation of AI consumption costs across models, copilots and agents.',
  },
  'industry-overlay': {
    term: 'Industry overlay',
    definition: 'Sector context applied to the common architecture. It changes examples and control emphasis, never the layers.',
  },
  'entry-offer': {
    term: 'Entry offer',
    definition: 'The defined, time-boxed engagement through which a client first buys a service.',
  },
  'human-on-the-loop': {
    term: 'Human on the loop',
    definition: 'AI acts and a person supervises in real time, able to intervene; contrasted with human in the loop, where a person approves each step.',
  },
};

export type GlossaryKey = keyof typeof glossary;

import type { ControlDomain, ControlDomainId, RuntimeState, ServiceId } from './types';

export const controlHeadline = {
  title: 'AI Control',
  line: 'Govern what AI is permitted to know, decide and do.',
};

/** The eight AI CONTROL domains. */
export const controlDomains: ControlDomain[] = [
  {
    id: 'identity',
    number: '01',
    name: 'Identity & Access',
    short: 'Identity',
    icon: 'Fingerprint',
    purpose: 'Every person, application and agent that acts with AI has a verified identity and least-privilege access.',
    controls: [
      'Unique identities for agents and service principals',
      'Least-privilege, time-bound access to data and tools',
      'Credential and secret management for agents',
      'Access reviews that include non-human identities',
    ],
    evidence: ['Agent identity register', 'Access logs', 'Access review records'],
    accountability: 'The CISO owns the access model; business owners approve agent access to their data.',
    accelerators: ['radius', 'ai-hub'],
  },
  {
    id: 'authority',
    number: '02',
    name: 'Authority & Permissions',
    short: 'Authority',
    icon: 'KeyRound',
    purpose: 'Define what each agent may recommend, decide or execute, the limits of that authority, and when it must escalate.',
    controls: [
      'Agent authority matrix: recommend, decide, execute',
      'Transaction and value thresholds',
      'Escalation and approval rules',
      'Segregation of duties between agents and people',
    ],
    evidence: ['Agent registry with authority levels', 'Approval and escalation records', 'Delegation history'],
    accountability: 'A named business owner is accountable for every agent’s decisions.',
    accelerators: ['radius'],
  },
  {
    id: 'policy',
    number: '03',
    name: 'Policy & Guardrails',
    short: 'Policy',
    icon: 'ScrollText',
    purpose: 'Translate enterprise policy, regulation and ethics into rules that are enforced at runtime.',
    controls: [
      'Policy-to-control mapping',
      'Input and output content guardrails',
      'Prohibited actions and tool restrictions',
      'Risk classification at intake',
    ],
    evidence: ['Policy-to-control traceability', 'Guardrail trigger logs', 'Risk classification records'],
    accountability: 'Risk and compliance own the policies; product owners own their implementation.',
    accelerators: ['policy-agent', 'radius'],
  },
  {
    id: 'data-model',
    number: '04',
    name: 'Data & Model Governance',
    short: 'Data & models',
    icon: 'Database',
    purpose: 'Govern which data AI may know and which models may be used, for which purposes.',
    controls: [
      'Data classification and purpose limitation',
      'Model inventory and approval',
      'Evaluation before release and on every change',
      'Lineage for training and retrieval data',
    ],
    evidence: ['Model cards and evaluation results', 'Data lineage records', 'Model approval log'],
    accountability: 'Data owners and model owners, under the CDAO.',
    accelerators: ['radius', 'ai-hub'],
  },
  {
    id: 'oversight',
    number: '05',
    name: 'Human Oversight',
    short: 'Oversight',
    icon: 'Eye',
    purpose: 'Keep people meaningfully accountable for material decisions, and able to intervene.',
    controls: [
      'Human checkpoints for material decisions',
      'Rationale captured with every recommendation',
      'Override and challenge rights',
      'Oversight training for reviewers',
    ],
    evidence: ['Decision records with the human approver', 'Override logs', 'Reviewer training records'],
    accountability: 'Process owners and the decision-makers named in the decision authority framework.',
    accelerators: ['radius'],
  },
  {
    id: 'monitoring',
    number: '06',
    name: 'Monitoring, Evidence & Audit',
    short: 'Monitoring',
    icon: 'Activity',
    purpose: 'Observe AI behaviour continuously and produce the evidence auditors and regulators need.',
    controls: [
      'Runtime telemetry for prompts, actions and outcomes',
      'Drift, quality and safety monitoring',
      'Tamper-evident audit trail',
      'Periodic control testing',
    ],
    evidence: ['Audit trail', 'Monitoring alerts and reports', 'Control test results'],
    accountability: 'Operations own monitoring; internal audit provides independent assurance.',
    accelerators: ['policy-agent', 'tokenscope'],
  },
  {
    id: 'intervention',
    number: '07',
    name: 'Intervention & Recovery',
    short: 'Intervention',
    icon: 'LifeBuoy',
    purpose: 'Pause, correct, roll back or stop AI safely when something goes wrong.',
    controls: [
      'Pause and stop control for each agent',
      'Rollback to a prior model, prompt or agent version',
      'AI incident playbooks',
      'Fallback to a human or rules-based process',
    ],
    evidence: ['Incident records and timelines', 'Recovery test results', 'Post-incident reviews'],
    accountability: 'The service owner and the incident manager.',
    accelerators: [],
  },
  {
    id: 'value',
    number: '08',
    name: 'Value & Operational Monitoring',
    short: 'Value',
    icon: 'TrendingUp',
    purpose: 'Confirm AI keeps delivering the intended value at acceptable cost and performance.',
    controls: [
      'Benefit tracking against the value case baseline',
      'Consumption and cost thresholds (AI FinOps)',
      'Service levels for AI services',
      'Periodic value review, including retirement',
    ],
    evidence: ['Value dashboard', 'Consumption and cost reports', 'Value review decisions'],
    accountability: 'The business sponsor owns value; finance owns cost.',
    accelerators: ['tokenscope'],
  },
];

/** Runtime control states applied at gates and in operation. */
export const runtimeStates: RuntimeState[] = [
  {
    id: 'go',
    label: 'GO',
    meaning: 'Within authority, policy and thresholds.',
    triggers: ['Controls pass', 'Evaluation within tolerance', 'Authority confirmed'],
    response: 'AI proceeds. Evidence is logged automatically.',
    owner: 'Agent owner',
  },
  {
    id: 'conditional',
    label: 'CONDITIONAL GO',
    meaning: 'Proceeds with constraints.',
    triggers: ['Elevated risk class', 'New data source or tool', 'Threshold approached'],
    response: 'Reduced scope, an added human checkpoint or enhanced monitoring.',
    owner: 'Business owner with risk',
  },
  {
    id: 'remediate',
    label: 'REMEDIATE',
    meaning: 'Paused until a control gap is fixed.',
    triggers: ['Quality or drift breach', 'Control gap found', 'Evidence incomplete'],
    response: 'A remediation owner is assigned; the fix is tracked and re-tested.',
    owner: 'Service owner',
  },
  {
    id: 'stop',
    label: 'STOP',
    meaning: 'Halted: material risk or unauthorised action.',
    triggers: ['Action outside authority', 'Policy breach', 'Safety incident'],
    response: 'Stop control applied, fallback to a human process, incident and recovery.',
    owner: 'Incident manager and accountable executive',
  },
];

/** How AI Control is embedded in every other service offering. */
export const controlEmbedded: { service: ServiceId; contribution: string }[] = [
  { service: 's01', contribution: 'Governance readiness and risk classification shape the prioritised portfolio.' },
  { service: 's02', contribution: 'Decision rights and agent authority are designed into the operating model.' },
  { service: 's03', contribution: 'Sold as a service: assessment, control architecture and managed assurance.' },
  { service: 's04', contribution: 'Guardrails, evaluation and identity are built into the AI SDLC.' },
  { service: 's05', contribution: 'Identity, security and sovereignty are designed into the platform.' },
  { service: 's06', contribution: 'Monitoring, evidence, intervention and FinOps run in managed operations.' },
];

export const controlDomainById = Object.fromEntries(controlDomains.map((d) => [d.id, d])) as Record<
  ControlDomainId,
  ControlDomain
>;

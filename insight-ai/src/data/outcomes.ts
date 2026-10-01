import type { Outcome } from './types';

/**
 * CLIENT OUTCOMES: concrete results, each tied to the evidence that demonstrates it.
 * No numeric claims: targets are set with each client against their own baseline.
 */
export const outcomes: Outcome[] = [
  {
    id: 'roadmap',
    title: 'Prioritised AI investment roadmap',
    description: 'AI investment directed to the use cases with the strongest value case and readiness.',
    evidence: 'Approved portfolio, value case and roadmap',
    stage: 'prioritise',
    services: ['s01'],
    lens: 'CEO & Board',
  },
  {
    id: 'maturity',
    title: 'Target maturity uplift',
    description: 'An agreed maturity baseline and target, with a plan to close the gap.',
    evidence: 'Maturity baseline and re-assessment against target',
    stage: 'understand',
    services: ['s01', 's03'],
    lens: 'CEO & Board',
  },
  {
    id: 'accountability',
    title: 'Clear Human + AI accountability',
    description: 'Every AI-enabled decision has a named human owner and defined agent authority.',
    evidence: 'Decision authority framework and agent responsibility matrix',
    stage: 'control',
    services: ['s02', 's03'],
    lens: 'COO & CHRO',
  },
  {
    id: 'agentic',
    title: 'Production-ready agentic solutions',
    description: 'Agents engineered to enterprise standard and integrated with core systems.',
    evidence: 'Working solution, production backlog and deployment plan',
    stage: 'build',
    services: ['s04'],
    lens: 'CIO & CTO',
  },
  {
    id: 'gates',
    title: 'Control gates and audit evidence',
    description: 'AI moves through defined gates, and evidence is produced as a by-product of operation.',
    evidence: 'Gate decisions, audit trail and control test results',
    stage: 'control',
    services: ['s03'],
    lens: 'CRO, CISO & Audit',
  },
  {
    id: 'architecture',
    title: 'Secure enterprise AI architecture',
    description: 'A secure, integrated and, where required, sovereign foundation for enterprise AI.',
    evidence: 'Target architecture, security model and sovereignty model',
    stage: 'build',
    services: ['s05'],
    lens: 'CIO & CTO',
  },
  {
    id: 'industrialised',
    title: 'Industrialised AI delivery',
    description: 'Each new use case builds on reusable patterns and a repeatable AI Factory.',
    evidence: 'AI Factory model and reusable component catalogue',
    stage: 'industrialise',
    services: ['s06', 's04'],
    lens: 'CIO & CTO',
  },
  {
    id: 'adoption',
    title: 'Higher workforce adoption',
    description: 'AI used consistently and confidently across roles, not only by early adopters.',
    evidence: 'Adoption programme and usage tracked against baseline',
    stage: 'realise',
    services: ['s06', 's02'],
    lens: 'COO & CHRO',
  },
  {
    id: 'scale',
    title: 'Operational AI at scale',
    description: 'AI services run, monitored and supported as part of normal business operations.',
    evidence: 'Managed service model, monitoring model and service levels',
    stage: 'operate',
    services: ['s06'],
    lens: 'CIO & CTO',
  },
  {
    id: 'value',
    title: 'Continuous business value realisation',
    description: 'Benefits tracked against the value case, with the portfolio re-prioritised as results arrive.',
    evidence: 'Value dashboard and periodic value reviews',
    stage: 'realise',
    services: ['s01', 's06'],
    lens: 'CEO & Board',
  },
];

export const outcomeLenses = ['CEO & Board', 'CIO & CTO', 'COO & CHRO', 'CRO, CISO & Audit'];

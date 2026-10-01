import type { Sector, SectorId } from './types';

/**
 * INDUSTRY OVERLAYS: sector-specific application of the SAME architecture.
 * Each overlay supplies sector context for the five operating-system layers and a
 * control emphasis. It never changes the layers, services or capabilities.
 */
export const sectors: Sector[] = [
  {
    id: 'government',
    name: 'Government',
    icon: 'Landmark',
    framing: 'Policy, services and operations that are faster, more proactive and fully accountable to citizens.',
    domains: ['Policy', 'Citizen Services', 'Government Operations', 'Regulation', 'Decision Intelligence'],
    examples: [
      { name: 'Policy simulation', description: 'Model the likely effects of policy options before decisions are taken.', layer: 'decision' },
      { name: 'Proactive citizen services', description: 'Anticipate citizen needs and initiate services across agencies.', layer: 'orchestration' },
      { name: 'Case orchestration', description: 'Coordinate case work across officers, systems and agents.', layer: 'orchestration' },
      { name: 'Regulatory intelligence', description: 'Structure legislation and regulation as knowledge AI can use.', layer: 'data' },
      { name: 'Executive decision support', description: 'Bring evidence and scenarios to senior decision-makers.', layer: 'decision' },
    ],
    layerOverlay: {
      workforce: 'Policy advisers, case officers and service agents',
      orchestration: 'Case orchestration and proactive, cross-agency citizen services',
      decision: 'Policy simulation and executive decision support',
      data: 'Legislative, regulatory and policy knowledge; citizen data under strict purpose limits',
      platform: 'Sovereign cloud and shared government platforms',
    },
    controlEmphasis: 'Transparency for citizen-impacting decisions, sovereignty and full auditability.',
    leadPlays: ['p06', 'p03', 'p04'],
    leadServices: ['s01', 's03', 's05'],
  },
  {
    id: 'energy',
    name: 'Energy',
    icon: 'Flame',
    framing: 'Safer, more predictable operations across assets, production and the supply chain.',
    domains: ['Assets', 'Production', 'Maintenance', 'Supply Chain', 'Corporate Functions', 'Executive Intelligence'],
    examples: [
      { name: 'Asset intelligence', description: 'A connected view of asset condition, history and risk.', layer: 'data' },
      { name: 'Predictive operations', description: 'Anticipate production and equipment issues before they occur.', layer: 'decision' },
      { name: 'Agentic maintenance', description: 'Agents prepare, schedule and coordinate maintenance work.', layer: 'orchestration' },
      { name: 'Supply chain intelligence', description: 'Visibility and early warning across critical supply.', layer: 'decision' },
      { name: 'AI decision twins', description: 'Digital twins used to simulate operational and investment decisions.', layer: 'decision' },
    ],
    layerOverlay: {
      workforce: 'Engineers, operators, field technicians and maintenance agents',
      orchestration: 'Work-order, maintenance and turnaround orchestration',
      decision: 'Predictive operations and AI decision twins',
      data: 'Asset, sensor and engineering data; equipment ontologies',
      platform: 'Hybrid cloud, edge and OT/IT integration',
    },
    controlEmphasis: 'Safety-critical oversight, OT security and human authority over physical operations.',
    leadPlays: ['p02', 'p04', 'p06'],
    leadServices: ['s04', 's05', 's06'],
  },
  {
    id: 'financial',
    name: 'Financial Services',
    icon: 'Banknote',
    framing: 'Customer, risk and operations transformed under regulator-grade control.',
    domains: ['Customer', 'Risk', 'Compliance', 'Operations', 'Procurement', 'Decision Intelligence'],
    examples: [
      { name: 'Customer intelligence', description: 'A richer understanding of customer needs to inform service and advice.', layer: 'decision' },
      { name: 'Risk agents', description: 'Agents that gather evidence and prepare risk assessments for review.', layer: 'workforce' },
      { name: 'Compliance intelligence', description: 'Regulatory obligations mapped to processes and controls.', layer: 'data' },
      { name: 'Procurement orchestration', description: 'Sourcing to contract coordinated across people and agents.', layer: 'orchestration' },
      { name: 'Operations agents', description: 'Agents handling defined operational tasks with human escalation.', layer: 'orchestration' },
    ],
    layerOverlay: {
      workforce: 'Relationship managers, analysts, and risk and operations agents',
      orchestration: 'Operations agents and procurement orchestration',
      decision: 'Customer intelligence and risk decision support',
      data: 'Customer, transaction and regulatory knowledge',
      platform: 'Regulated cloud and core-system integration',
    },
    controlEmphasis: 'Model risk management, explainability and regulatory evidence.',
    leadPlays: ['p03', 'p02', 'p05'],
    leadServices: ['s03', 's04', 's02'],
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: 'HeartPulse',
    framing: 'More time for care: AI that removes administrative burden while clinicians stay accountable.',
    domains: ['Patient Access', 'Clinical Operations', 'Care Coordination', 'Workforce', 'Corporate Services'],
    examples: [
      { name: 'Patient flow intelligence', description: 'Visibility of demand, capacity and flow across sites.', layer: 'decision' },
      { name: 'Clinical documentation support', description: 'Copilots that draft documentation for clinician review.', layer: 'workforce' },
      { name: 'Care-pathway orchestration', description: 'Referrals and pathways coordinated across teams and systems.', layer: 'orchestration' },
      { name: 'Workforce planning intelligence', description: 'Rostering and staffing informed by demand.', layer: 'decision' },
      { name: 'Corporate service agents', description: 'Agents for finance, HR and procurement tasks.', layer: 'orchestration' },
    ],
    layerOverlay: {
      workforce: 'Clinicians, care teams, administrators and administrative agents',
      orchestration: 'Referral and care-pathway orchestration',
      decision: 'Patient flow, capacity and workforce intelligence',
      data: 'Clinical knowledge and terminologies; patient data under strict governance',
      platform: 'Secure clinical-system integration and sovereign data hosting',
    },
    controlEmphasis: 'Clinical accountability stays with clinicians; patient data protection and safety monitoring.',
    leadPlays: ['p03', 'p05', 'p02'],
    leadServices: ['s03', 's02', 's04'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Functions',
    icon: 'Briefcase',
    framing: 'Corporate functions redesigned so people and agents share the work.',
    domains: ['Finance', 'HR', 'Procurement', 'IT', 'Legal', 'Audit', 'Customer Service'],
    examples: [
      { name: 'Finance close agents', description: 'Reconciliation and close tasks prepared by agents for review.', layer: 'orchestration' },
      { name: 'HR service agents', description: 'Employee queries and HR transactions handled with escalation.', layer: 'workforce' },
      { name: 'Procurement orchestration', description: 'Request to contract coordinated end to end.', layer: 'orchestration' },
      { name: 'IT service agents', description: 'Triage and resolution of routine IT requests.', layer: 'workforce' },
      { name: 'Contract intelligence', description: 'Obligations and risks extracted from contracts for Legal.', layer: 'data' },
      { name: 'Continuous audit analytics', description: 'Ongoing testing of transactions and controls.', layer: 'decision' },
      { name: 'Customer service agents', description: 'Customer enquiries resolved with human hand-off.', layer: 'workforce' },
    ],
    layerOverlay: {
      workforce: 'Function teams working with copilots and specialist agents',
      orchestration: 'Procure-to-pay, hire-to-retire and request-to-resolve workflows',
      decision: 'Spend, workforce, service and audit analytics',
      data: 'ERP, HCM and ITSM data; contract and policy knowledge',
      platform: 'Enterprise applications, APIs and the enterprise AI platform',
    },
    controlEmphasis: 'Segregation of duties, financial controls and data privacy.',
    leadPlays: ['p05', 'p02', 'p01'],
    leadServices: ['s02', 's04', 's06'],
  },
];

export const sectorById = Object.fromEntries(sectors.map((s) => [s.id, s])) as Record<SectorId, Sector>;

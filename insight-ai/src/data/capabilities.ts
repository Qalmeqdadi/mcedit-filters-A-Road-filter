import type { Capability, CapabilityGroup, CapabilityGroupId } from './types';

/**
 * CORE DELIVERY CAPABILITIES: how Insight delivers.
 * `services` lists every service offering that consumes the capability.
 * The first entry is always the home service of the group.
 */
export const capabilityGroups: CapabilityGroup[] = [
  {
    id: 'value',
    name: 'Value & Transformation',
    icon: 'Target',
    summary: 'Finding, sizing, prioritising and tracking where AI creates value.',
    homeService: 's01',
    capabilities: [
      { id: 'value-sprint', name: 'AI Value Sprint', definition: 'Time-boxed method to surface value pools and candidate use cases with business leaders.', services: ['s01', 's02'] },
      { id: 'readiness', name: 'Readiness assessment', definition: 'Assessment of data, technology, people and governance readiness for AI.', services: ['s01', 's03', 's05', 's06'] },
      { id: 'maturity', name: 'Maturity assessment', definition: 'Baseline of AI maturity against a structured model, with a target state.', services: ['s01', 's03', 's06'] },
      { id: 'use-case-discovery', name: 'Use-case discovery', definition: 'Structured identification of AI use cases from processes, pain points and value pools.', services: ['s01', 's02', 's04'] },
      { id: 'business-case', name: 'Business case', definition: 'Value, cost and risk case for an AI investment, used to decide and later to measure.', services: ['s01', 's04', 's05'] },
      { id: 'prioritisation', name: 'Portfolio prioritisation', definition: 'Ranking use cases by value, feasibility, readiness and risk into a managed portfolio.', services: ['s01', 's06'] },
      { id: 'roadmap', name: 'Roadmap', definition: 'Sequenced plan of initiatives, foundations and investment over time.', services: ['s01', 's02', 's03', 's05'] },
      { id: 'value-tracking', name: 'Value tracking', definition: 'Measurement of realised benefits against the value case.', services: ['s01', 's04', 's06'] },
    ],
  },
  {
    id: 'operating-model',
    name: 'Operating Model',
    icon: 'Network',
    summary: 'Designing how people, processes and agents work and decide together.',
    homeService: 's02',
    capabilities: [
      { id: 'process-intelligence', name: 'Process intelligence', definition: 'Evidence-based understanding of how processes actually run, from system and event data.', services: ['s02', 's01', 's04'] },
      { id: 'process-redesign', name: 'Process redesign', definition: 'Redesign of end-to-end processes around Human + AI work.', services: ['s02', 's04'] },
      { id: 'role-design', name: 'Human + AI role design', definition: 'Allocation of tasks between people, copilots and agents, and the roles that result.', services: ['s02', 's06'] },
      { id: 'decision-rights', name: 'Decision rights', definition: 'Who decides what, at which threshold, including decisions supported or taken by AI.', services: ['s02', 's03'] },
      { id: 'agent-authority', name: 'Agent authority', definition: 'Definition of what each agent may recommend, decide or execute, and when it escalates.', services: ['s02', 's03', 's04'] },
      { id: 'org-design', name: 'Organisation design', definition: 'Structures, spans and teams for a Human + AI organisation.', services: ['s02'] },
      { id: 'ai-coe', name: 'AI CoE', definition: 'Design of the AI Centre of Excellence: mandate, services, governance and talent.', services: ['s02', 's06'] },
    ],
  },
  {
    id: 'control',
    name: 'Control & Assurance',
    icon: 'ShieldCheck',
    summary: 'Governing, securing, evaluating and evidencing AI in design and in operation.',
    homeService: 's03',
    capabilities: [
      { id: 'ai-governance', name: 'AI governance', definition: 'Policies, forums, roles and processes that govern AI across the enterprise.', services: ['s03', 's01', 's02', 's06'] },
      { id: 'agent-governance', name: 'Agent governance', definition: 'Registration, ownership, authority and lifecycle management of agents.', services: ['s03', 's02', 's04', 's06'] },
      { id: 'policy-controls', name: 'Policy controls', definition: 'Translation of policy and regulation into enforceable technical and process controls.', services: ['s03', 's04', 's05'] },
      { id: 'ai-security', name: 'Security', definition: 'AI-specific security: protecting models, prompts, agents and tools from misuse and attack.', services: ['s03', 's04', 's05'] },
      { id: 'evaluation', name: 'Evaluation', definition: 'Testing AI for quality, safety, bias and fitness for purpose before and after release.', services: ['s03', 's04', 's06'] },
      { id: 'oversight', name: 'Oversight', definition: 'Design of human checkpoints, review and override for material AI decisions.', services: ['s03', 's02'] },
      { id: 'monitoring', name: 'Monitoring', definition: 'Runtime monitoring of AI behaviour, drift, safety and policy adherence.', services: ['s03', 's04', 's06'] },
      { id: 'auditability', name: 'Auditability', definition: 'Evidence and traceability that let auditors and regulators reconstruct AI decisions.', services: ['s03', 's06'] },
      { id: 'recovery', name: 'Recovery', definition: 'Pause, rollback, fallback and incident response for AI systems.', services: ['s03', 's05', 's06'] },
    ],
  },
  {
    id: 'engineering',
    name: 'AI Engineering',
    icon: 'Code2',
    summary: 'Building AI solutions, agents and intelligent applications to enterprise standard.',
    homeService: 's04',
    capabilities: [
      { id: 'rapid-pov', name: 'Rapid PoV', definition: 'Short proof of value that validates technical feasibility and business value together.', services: ['s04', 's01'] },
      { id: 'ai-sdlc', name: 'AI SDLC', definition: 'Engineering lifecycle for AI, with evaluation, controls and release gates built in.', services: ['s04', 's06'] },
      { id: 'genai', name: 'GenAI', definition: 'Solutions using generative models, retrieval and copilots.', services: ['s04'] },
      { id: 'agentic-ai', name: 'Agentic AI', definition: 'Agents that plan and act using tools and enterprise systems within defined authority.', services: ['s04', 's02'] },
      { id: 'multi-agent', name: 'Multi-agent systems', definition: 'Coordinated groups of agents with orchestration and human escalation.', services: ['s04'] },
      { id: 'intelligent-apps', name: 'Intelligent applications', definition: 'Business applications with AI embedded in the workflow and user experience.', services: ['s04'] },
      { id: 'digital-twins', name: 'Digital twins', definition: 'Models of assets, processes or organisations used to simulate and decide.', services: ['s04', 's05'] },
      { id: 'mlops', name: 'MLOps / LLMOps', definition: 'Operational pipelines to deploy, version, monitor and update models.', services: ['s04', 's05', 's06'] },
    ],
  },
  {
    id: 'data-platform',
    name: 'Data & Platform',
    icon: 'Database',
    summary: 'The data, knowledge, platform and infrastructure that AI depends on.',
    homeService: 's05',
    capabilities: [
      { id: 'data-engineering', name: 'Data engineering', definition: 'Pipelines, quality and products that make enterprise data usable by AI.', services: ['s05', 's01', 's04'] },
      { id: 'knowledge-architecture', name: 'Knowledge architecture', definition: 'Organising documents and knowledge so AI can retrieve and cite it reliably.', services: ['s05', 's04'] },
      { id: 'ontologies', name: 'Ontologies', definition: 'Formal models of business entities, relationships and rules that give AI enterprise context.', services: ['s05', 's04'] },
      { id: 'ai-platforms', name: 'AI platforms', definition: 'Design and delivery of the enterprise platform for models, copilots and agents.', services: ['s05', 's04', 's06'] },
      { id: 'integration', name: 'Integration', definition: 'APIs and integration that let AI read from and act in enterprise systems.', services: ['s05', 's04'] },
      { id: 'cloud', name: 'Cloud', definition: 'Public, private and hybrid cloud foundations for AI workloads.', services: ['s05', 's06'] },
      { id: 'sovereign-cloud', name: 'Sovereign cloud', definition: 'In-country, controlled infrastructure for sensitive data and AI.', services: ['s05', 's03'] },
      { id: 'cyber', name: 'Cyber', definition: 'Enterprise cybersecurity for the infrastructure, networks and endpoints AI runs on.', services: ['s05', 's03'] },
      { id: 'finops', name: 'FinOps', definition: 'Visibility and control of cloud and AI consumption costs.', services: ['s05', 's06'] },
    ],
  },
  {
    id: 'scale',
    name: 'Scale & Operate',
    icon: 'Factory',
    summary: 'Industrialising, adopting and running AI as a managed, value-tracked operation.',
    homeService: 's06',
    capabilities: [
      { id: 'ai-factory', name: 'AI Factory', definition: 'Repeatable delivery model that takes use cases from intake to production at scale.', services: ['s06', 's04'] },
      { id: 'production-engineering', name: 'Production engineering', definition: 'Hardening AI solutions for reliability, performance and support.', services: ['s06', 's04'] },
      { id: 'reusable-patterns', name: 'Reusable patterns', definition: 'Shared components, agents and reference patterns reused across use cases.', services: ['s06', 's04'] },
      { id: 'coe-operations', name: 'AI CoE operations', definition: 'Running the AI CoE: intake, standards, portfolio and community.', services: ['s06', 's02'] },
      { id: 'managed-ai', name: 'Managed AI', definition: 'Operating AI services under defined service levels on the client’s behalf.', services: ['s06', 's03', 's05'] },
      { id: 'observability', name: 'Observability', definition: 'End-to-end visibility of AI service health, usage, quality and cost.', services: ['s06', 's03', 's04'] },
      { id: 'adoption', name: 'Adoption', definition: 'Change, communication and enablement that turn access to AI into daily use.', services: ['s06', 's02'] },
      { id: 'capability-building', name: 'Capability building', definition: 'Skills and training for leaders, employees and AI practitioners.', services: ['s06', 's02'] },
      { id: 'value-realisation', name: 'Continuous value realisation', definition: 'Ongoing benefit tracking, optimisation and re-prioritisation of the AI portfolio.', services: ['s06', 's01'] },
    ],
  },
];

export const capabilityGroupById = Object.fromEntries(capabilityGroups.map((g) => [g.id, g])) as Record<
  CapabilityGroupId,
  CapabilityGroup
>;

export const allCapabilities: (Capability & { group: CapabilityGroupId })[] = capabilityGroups.flatMap((g) =>
  g.capabilities.map((c) => ({ ...c, group: g.id })),
);

export const capabilityById = Object.fromEntries(allCapabilities.map((c) => [c.id, c])) as Record<
  string,
  Capability & { group: CapabilityGroupId }
>;

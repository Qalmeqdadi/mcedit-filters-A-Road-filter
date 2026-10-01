/**
 * AI MATURITY SELF-CHECK: detailed question bank.
 *
 * The questionnaire adapts to where the organisation is with AI:
 *  - `all`   questions are asked of every organisation;
 *  - `pre`   questions are asked only before AI is in organisational use (not started / exploring),
 *            reframing control as "are you ready to govern AI?";
 *  - `using` questions are asked only once AI is piloted or in production.
 * Every answer comes from the client; the app supplies no benchmarks.
 */

export type AiStageId = 'none' | 'exploring' | 'piloting' | 'scaling' | 'operating';

export const aiStages: { id: AiStageId; name: string; description: string; using: boolean }[] = [
  { id: 'none', name: 'Not started', description: 'No organisational use of AI yet.', using: false },
  { id: 'exploring', name: 'Exploring', description: 'Individuals try public AI tools; nothing sanctioned or deployed.', using: false },
  { id: 'piloting', name: 'Piloting', description: 'A few sanctioned pilots or proofs of concept.', using: true },
  { id: 'scaling', name: 'Scaling', description: 'Several AI solutions in production.', using: true },
  { id: 'operating', name: 'Operating at scale', description: 'AI and agents embedded across functions.', using: true },
];

export const answerScale = [
  { score: 1, name: 'Not in place' },
  { score: 2, name: 'Initial / ad hoc' },
  { score: 3, name: 'Partly in place' },
  { score: 4, name: 'Largely in place' },
  { score: 5, name: 'Fully embedded' },
] as const;

export type QuestionScope = 'all' | 'pre' | 'using';

export interface Question {
  id: string;
  area: string;
  text: string;
  scope: QuestionScope;
}

const q = (area: string, list: [QuestionScope, string][]): Question[] =>
  list.map(([scope, text], i) => ({ id: `${area}.${i + 1}`, area, scope, text }));

export const questions: Question[] = [
  ...q('strategy', [
    ['all', 'There is a clearly stated business ambition for AI, endorsed by the executive team.'],
    ['all', 'AI opportunities are linked to specific business outcomes and KPIs.'],
    ['all', 'A named executive sponsor is accountable for AI.'],
    ['all', 'There is a funded AI investment plan or roadmap.'],
    ['pre', 'Potential AI use cases have been identified and discussed with business leaders.'],
    ['using', 'AI use cases are prioritised as a portfolio using consistent criteria (value, feasibility, risk).'],
    ['using', 'The benefits of AI solutions are measured against a baseline after deployment.'],
  ]),
  ...q('data', [
    ['all', 'The data needed for priority use cases is identified and accessible.'],
    ['all', 'Data owners are named for the key data domains.'],
    ['all', 'Data quality is measured for the data AI would rely on.'],
    ['all', 'Sensitive and personal data is classified, with rules for how it may be used.'],
    ['all', 'Documents and knowledge (policies, procedures, contracts) are organised so they can be searched and retrieved reliably.'],
    ['using', 'Data pipelines feeding AI solutions are documented and monitored, with lineage.'],
    ['pre', 'Data that cannot leave the country or the organisation has been identified.'],
  ]),
  ...q('technology', [
    ['all', 'There is an agreed target architecture for AI (cloud, hybrid or sovereign).'],
    ['all', 'Core business systems expose APIs or integration points that AI could use.'],
    ['all', 'Security and identity platforms can extend to AI services.'],
    ['all', 'Data residency and sovereignty requirements for AI are understood.'],
    ['pre', 'The organisation has decided which AI platforms or tools are approved for use.'],
    ['using', 'Employees access models and copilots through a governed enterprise platform.'],
    ['using', 'Deployment, versioning and monitoring of AI (MLOps / LLMOps) are automated.'],
  ]),
  ...q('people', [
    ['all', 'Leaders understand what AI can and cannot do, and its risks.'],
    ['all', 'Employees have received practical AI training relevant to their role.'],
    ['all', 'There is a change and communication plan for AI.'],
    ['all', 'Skills gaps in data, AI engineering and AI governance are known.'],
    ['pre', 'Staff know which AI tools they may and may not use.'],
    ['using', 'Usage and adoption of deployed AI tools are tracked.'],
    ['using', 'There is an internal community or champions network for AI.'],
  ]),
  ...q('operating-model', [
    ['all', 'Processes where AI could help are documented, including how work actually happens.'],
    ['all', 'A team or function (such as an AI CoE) owns AI standards and delivery.'],
    ['all', 'Decision rights for AI-supported decisions are defined.'],
    ['all', 'Roles affected by AI have been identified, including how they will change.'],
    ['using', 'Hand-offs between people, systems and AI are designed into processes, with clear escalation.'],
    ['using', 'AI delivery follows a repeatable model from idea to production.'],
    ['pre', 'Teams that would own AI delivery and support have been identified.'],
    ['pre', 'Process owners are willing to redesign work around AI.'],
  ]),
  ...q('identity', [
    ['all', 'Identity and access management covers non-human identities such as service accounts and bots.'],
    ['pre', 'There is an agreed approach for how AI tools and agents will be given access to data and systems.'],
    ['using', 'Every AI agent or service has its own identity, not shared credentials.'],
    ['using', 'AI access to data and tools follows least privilege and is time-bound.'],
    ['using', 'Access rights of AI services are reviewed periodically.'],
    ['pre', 'Access to sensitive data and systems is role-based and reviewed today.'],
    ['pre', 'There are rules for connecting external AI tools (SaaS, browser plug-ins) to company accounts.'],
  ]),
  ...q('authority', [
    ['all', 'It is clear which decisions must always remain with people.'],
    ['pre', 'There are agreed principles for what AI may and may not do on the organisation’s behalf.'],
    ['using', 'Each AI solution or agent has a named business owner.'],
    ['using', 'What each agent may recommend, decide or execute is documented in an authority matrix.'],
    ['using', 'Value or risk thresholds trigger escalation to a person.'],
    ['using', 'A registry of AI systems and agents exists and is kept current.'],
    ['pre', 'Accountability for AI decisions across business, IT and risk has been discussed and agreed.'],
    ['pre', 'Use cases where AI would act on its own have been identified for extra scrutiny.'],
  ]),
  ...q('policy', [
    ['all', 'An AI policy or acceptable-use policy is approved and communicated.'],
    ['all', 'Relevant regulation and standards for AI (data protection, sector rules) are identified.'],
    ['pre', 'There is a process to assess risk before any AI use case is approved.'],
    ['using', 'AI use cases are risk-classified at intake.'],
    ['using', 'Policies are translated into technical guardrails such as content filters and prohibited actions.'],
    ['using', 'Guardrail triggers and policy breaches are logged and reviewed.'],
    ['pre', 'Staff use of public generative AI tools is governed: allowed, restricted or blocked.'],
    ['pre', 'Ethical principles for AI (fairness, transparency, accountability) are defined.'],
  ]),
  ...q('data-model', [
    ['all', 'Rules exist for which data may be used with which AI tools, including public tools.'],
    ['pre', 'Criteria for selecting and approving AI models and vendors are defined.'],
    ['using', 'Models in use are inventoried with owner, purpose and version.'],
    ['using', 'Models are evaluated for quality, bias and safety before release and after changes.'],
    ['using', 'Data used for retrieval or training has documented lineage and permission to use.'],
    ['pre', 'Staff know not to enter confidential or personal data into public AI tools.'],
    ['pre', 'Contracts with AI vendors are reviewed for data use, retention and intellectual property.'],
  ]),
  ...q('oversight', [
    ['all', 'It is defined where human review of AI output is mandatory.'],
    ['pre', 'Staff are guided to check AI-generated content before relying on it.'],
    ['using', 'Material AI-supported decisions record the human approver and rationale.'],
    ['using', 'People can override or challenge AI recommendations, and overrides are logged.'],
    ['using', 'Reviewers are trained to oversee AI effectively.'],
    ['pre', 'Decisions that would need human sign-off if AI were involved have been identified.'],
    ['pre', 'The people who would review AI output have been identified and have capacity.'],
  ]),
  ...q('monitoring', [
    ['all', 'Internal audit or risk functions have AI on their plan.'],
    ['pre', 'There is a plan for how AI behaviour will be logged and monitored once deployed.'],
    ['using', 'AI behaviour (prompts, actions and outcomes) is logged in production.'],
    ['using', 'Quality, drift and safety are monitored, with alerts.'],
    ['using', 'Evidence would satisfy an auditor or regulator asking how a specific AI decision was made.'],
    ['pre', 'Existing logging and audit capabilities could be extended to AI.'],
    ['pre', 'Risk and audit teams have the skills to assess AI.'],
  ]),
  ...q('intervention', [
    ['all', 'AI incidents are covered by the incident-management process.'],
    ['pre', 'The organisation knows how it would stop or roll back an AI tool if something went wrong.'],
    ['using', 'Each agent or AI service can be paused or stopped quickly.'],
    ['using', 'Fallback to a manual or rules-based process is defined for critical AI services.'],
    ['using', 'Recovery and rollback are tested.'],
    ['pre', 'Business continuity plans would cover the failure of an AI service.'],
    ['pre', 'Someone is accountable for responding to an AI incident.'],
  ]),
  ...q('value-ops', [
    ['all', 'The cost of AI (licences, consumption, cloud) is visible.'],
    ['pre', 'There is an agreed way to measure the value of the first AI use cases.'],
    ['using', 'AI consumption and cost are tracked per use case or department (AI FinOps).'],
    ['using', 'Service levels exist for AI services in production.'],
    ['using', 'AI solutions are reviewed periodically for value, including retirement.'],
    ['pre', 'A budget for AI (licences, consumption, people) has been estimated.'],
    ['pre', 'Baseline measures exist for the processes AI would improve.'],
  ]),
];

export function stageUsesAi(stage: AiStageId | null) {
  return !!stage && aiStages.find((s) => s.id === stage)!.using;
}

/** Questions that apply to an area at the organisation's AI stage. */
export function questionsFor(area: string, stage: AiStageId | null) {
  const using = stageUsesAi(stage);
  return questions.filter((x) => x.area === area && (x.scope === 'all' || (using ? x.scope === 'using' : x.scope === 'pre')));
}

/**
 * Core strategic types for Insight AI.
 *
 * The information architecture deliberately separates seven categories.
 * Every object in the application belongs to exactly one of them, and the
 * ids below are the only way one category refers to another.
 *
 *   SERVICE OFFERING        what clients buy
 *   CAPABILITY              how Insight delivers
 *   ACCELERATOR / IP        reusable asset that makes delivery faster or better
 *   TECHNOLOGY / ECOSYSTEM  enabling platform, product or provider
 *   REFERENCE ARCHITECTURE  what the client's future enterprise looks like
 *   GTM PLAY                how Insight lands and expands commercially
 *   INDUSTRY OVERLAY        sector-specific application of the same architecture
 */

export type CategoryId =
  | 'service'
  | 'capability'
  | 'accelerator'
  | 'technology'
  | 'architecture'
  | 'play'
  | 'industry';

export type ServiceId = 's01' | 's02' | 's03' | 's04' | 's05' | 's06';

export type CapabilityGroupId =
  | 'value'
  | 'operating-model'
  | 'control'
  | 'engineering'
  | 'data-platform'
  | 'scale';

export type AcceleratorId =
  | 'aro'
  | 'radius'
  | 'helios'
  | 'apollo'
  | 'junkshon'
  | 'ai-hub'
  | 'policy-agent'
  | 'agent-store'
  | 'flight-academy'
  | 'tokenscope'
  | 'devshop';

export type AcceleratorFilter = 'ASSESS' | 'GOVERN' | 'BUILD' | 'PLATFORM' | 'ADOPT' | 'OPERATE';

export type StageId =
  | 'understand'
  | 'prioritise'
  | 'control'
  | 'prove'
  | 'build'
  | 'industrialise'
  | 'operate'
  | 'realise';

export type OsLayerId = 'workforce' | 'orchestration' | 'decision' | 'data' | 'platform';

export type ControlDomainId =
  | 'identity'
  | 'authority'
  | 'policy'
  | 'data-model'
  | 'oversight'
  | 'monitoring'
  | 'intervention'
  | 'value';

export type RuntimeStateId = 'go' | 'conditional' | 'remediate' | 'stop';

export type SectorId = 'government' | 'energy' | 'financial' | 'healthcare' | 'enterprise';

export type PlayId = 'p01' | 'p02' | 'p03' | 'p04' | 'p05' | 'p06';

export type TechId =
  | 'cloud'
  | 'sovereign'
  | 'compute'
  | 'models'
  | 'data-platforms'
  | 'enterprise-apps'
  | 'security'
  | 'workplace';

export type ArchitectureLayerId =
  | 'plays'
  | 'os'
  | 'control'
  | 'services'
  | 'capabilities'
  | 'accelerators'
  | 'foundations';

/** Lucide icon key, resolved in components/Icon.tsx */
export type IconKey = string;

export interface Category {
  id: CategoryId;
  label: string;
  short: string;
  definition: string;
  rule: string;
  icon: IconKey;
}

export interface Service {
  id: ServiceId;
  number: string;
  name: string;
  shortName: string;
  icon: IconKey;
  question: string;
  summary: string;
  scope: string[];
  entry: string;
  entryDescription: string;
  outputs: string[];
  accelerators: AcceleratorId[];
  homeGroup: CapabilityGroupId;
  stages: StageId[];
  osLayers: OsLayerId[];
  sponsors: string[];
}

export interface Capability {
  id: string;
  name: string;
  definition: string;
  services: ServiceId[];
}

export interface CapabilityGroup {
  id: CapabilityGroupId;
  name: string;
  icon: IconKey;
  summary: string;
  homeService: ServiceId;
  capabilities: Capability[];
}

export interface Accelerator {
  id: AcceleratorId;
  name: string;
  descriptor: string;
  icon: IconKey;
  whatItDoes: string;
  filters: AcceleratorFilter[];
  stages: StageId[];
  capabilities: string[];
  tech: TechId[];
}

export interface Stage {
  id: StageId;
  number: string;
  name: string;
  items: string[];
  summary: string;
  controlRole: string;
  gate?: string;
  services: ServiceId[];
  capabilities: string[];
  accelerators: AcceleratorId[];
  outputs: string[];
}

export interface OsActor {
  id: string;
  name: string;
  mode: string;
  description: string;
}

export interface OsLayer {
  id: OsLayerId;
  number: string;
  name: string;
  icon: IconKey;
  summary: string;
  elements: string[];
  services: ServiceId[];
  controlFocus: ControlDomainId[];
  tech: TechId[];
}

export interface ControlDomain {
  id: ControlDomainId;
  number: string;
  name: string;
  /** Short label for tight spaces such as diagram rails. */
  short: string;
  icon: IconKey;
  purpose: string;
  controls: string[];
  evidence: string[];
  accountability: string;
  accelerators: AcceleratorId[];
}

export interface RuntimeState {
  id: RuntimeStateId;
  label: string;
  meaning: string;
  triggers: string[];
  response: string;
  owner: string;
}

export interface TechFoundation {
  id: TechId;
  name: string;
  icon: IconKey;
  examples: string[];
}

export interface PlayStep {
  label: string;
  service: ServiceId;
}

export interface Play {
  id: PlayId;
  number: string;
  name: string;
  icon: IconKey;
  trigger: string;
  land: PlayStep;
  expand: PlayStep[];
  operate: { label: string; service: ServiceId; description: string };
  accelerators: AcceleratorId[];
  sponsors: string[];
  questions: string[];
}

export interface SectorExample {
  name: string;
  description: string;
  layer: OsLayerId;
}

export interface Sector {
  id: SectorId;
  name: string;
  icon: IconKey;
  framing: string;
  domains: string[];
  examples: SectorExample[];
  layerOverlay: Record<OsLayerId, string>;
  controlEmphasis: string;
  leadPlays: PlayId[];
  leadServices: ServiceId[];
}

export interface Competitor {
  id: string;
  name: string;
  archetype: string;
  themes: string[];
  dimensions: string[];
}

export interface Outcome {
  id: string;
  title: string;
  description: string;
  evidence: string;
  stage: StageId;
  services: ServiceId[];
  lens: string;
}

export interface ArchitectureLayer {
  id: ArchitectureLayerId;
  letter: string;
  title: string;
  question: string;
  category: CategoryId | 'control';
  summary: string;
  detail: string;
  serves: ArchitectureLayerId[];
  reliesOn: ArchitectureLayerId[];
  section: string;
}

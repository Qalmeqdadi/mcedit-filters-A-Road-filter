import type { TechFoundation, TechId } from './types';

/**
 * TECHNOLOGY & ECOSYSTEM FOUNDATIONS: enabling platforms, products and providers.
 * Shown as categories. Insight is technology-neutral: provider choice follows the
 * client's architecture, sovereignty and commercial requirements.
 */
export const techFoundations: TechFoundation[] = [
  { id: 'cloud', name: 'Cloud & hybrid', icon: 'Cloud', examples: ['Public cloud', 'Private cloud', 'Hybrid and edge'] },
  { id: 'sovereign', name: 'Sovereign AI infrastructure', icon: 'Landmark', examples: ['In-country compute', 'Sovereign cloud', 'Data residency controls'] },
  { id: 'compute', name: 'AI compute & networking', icon: 'Cpu', examples: ['Accelerated compute', 'High-performance networking', 'AI-ready storage'] },
  { id: 'models', name: 'Models & AI services', icon: 'Sparkles', examples: ['Frontier models', 'Open-weight models', 'Domain models', 'Model gateways'] },
  { id: 'data-platforms', name: 'Data platforms', icon: 'Database', examples: ['Lakehouse and warehouse', 'Data integration', 'Vector and knowledge stores'] },
  { id: 'enterprise-apps', name: 'Enterprise applications', icon: 'Boxes', examples: ['ERP', 'CRM', 'ITSM', 'HCM', 'Case management'] },
  { id: 'security', name: 'Security & identity', icon: 'Fingerprint', examples: ['Identity providers', 'Security operations', 'Data protection'] },
  { id: 'workplace', name: 'Workplace & devices', icon: 'Users', examples: ['Productivity suites', 'Embedded copilots', 'Endpoints'] },
];

export const techById = Object.fromEntries(techFoundations.map((t) => [t.id, t])) as Record<TechId, TechFoundation>;

export const techPrinciple =
  'Technology-neutral by design: provider choice follows the client’s architecture, sovereignty and commercial requirements.';

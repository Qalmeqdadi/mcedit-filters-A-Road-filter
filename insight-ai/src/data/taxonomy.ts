import type { Category, CategoryId } from './types';

/**
 * The seven information-architecture categories.
 * These are never mixed: every card, chip and node carries exactly one.
 */
export const categories: Category[] = [
  {
    id: 'service',
    label: 'Service offering',
    short: 'What clients buy',
    definition: 'A market-facing offer a client contracts for, with a defined entry point and outputs.',
    rule: 'Six services. Each has one entry offer.',
    icon: 'Briefcase',
  },
  {
    id: 'capability',
    label: 'Capability',
    short: 'How Insight delivers',
    definition: 'A delivery skill, method or practice that one or more services draw on.',
    rule: 'Capabilities are consumed by services. They are not sold on their own.',
    icon: 'Wrench',
  },
  {
    id: 'accelerator',
    label: 'Accelerator / IP',
    short: 'What makes delivery faster or better',
    definition: 'A proprietary or reusable Insight asset that speeds up or strengthens delivery.',
    rule: 'Accelerators support services and capabilities. They are not the service.',
    icon: 'Zap',
  },
  {
    id: 'technology',
    label: 'Technology / ecosystem',
    short: 'What it runs on',
    definition: 'An enabling platform, product or provider from the technology ecosystem.',
    rule: 'Technology-neutral: provider choice follows the client’s architecture.',
    icon: 'Server',
  },
  {
    id: 'architecture',
    label: 'Reference architecture',
    short: 'What the client’s enterprise becomes',
    definition: 'The target shape of the client’s Human + AI enterprise that services design, build and run.',
    rule: 'One reference architecture, reused in every sector.',
    icon: 'Layers',
  },
  {
    id: 'play',
    label: 'GTM play',
    short: 'How Insight lands and expands',
    definition: 'A repeatable sales motion: a client trigger, a landing offer and an expansion path.',
    rule: 'Plays sequence services commercially. They do not create new services.',
    icon: 'Route',
  },
  {
    id: 'industry',
    label: 'Industry overlay',
    short: 'Same architecture, sector context',
    definition: 'A sector-specific application of the common architecture, with sector examples and control emphasis.',
    rule: 'Overlays change the examples, never the architecture.',
    icon: 'Building2',
  },
];

export const categoryById = Object.fromEntries(categories.map((c) => [c.id, c])) as Record<CategoryId, Category>;

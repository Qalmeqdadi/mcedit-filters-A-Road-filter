import type { ArchitectureLayer, ArchitectureLayerId } from './types';

/**
 * MASTER AI GTM ARCHITECTURE.
 * Read top to bottom: where value is created, what the enterprise becomes, how it is
 * controlled, what clients buy, how Insight delivers, what accelerates it, what it runs on.
 */
export const architectureLayers: ArchitectureLayer[] = [
  {
    id: 'plays',
    letter: 'A',
    title: 'Industry & Function Transformation Plays',
    question: 'Where value is created',
    category: 'industry',
    summary: 'Sector propositions applied to one common architecture.',
    detail:
      'Government, Energy, Financial Services, Healthcare and Enterprise Functions are overlays. Each brings sector domains, examples and control emphasis, and reuses Layers B to F unchanged.',
    serves: [],
    reliesOn: ['os'],
    section: 'sectors',
  },
  {
    id: 'os',
    letter: 'B',
    title: 'Human + AI Operating System',
    question: 'What the client’s enterprise becomes',
    category: 'architecture',
    summary: 'Five layers where people, processes, data and agents operate as one system.',
    detail:
      'The reference architecture for the client’s future enterprise: workforce, orchestration, decision, data and platform. Services design, build and run it; sector overlays apply to it.',
    serves: ['plays'],
    reliesOn: ['services'],
    section: 'operating-system',
  },
  {
    id: 'control',
    letter: '',
    title: 'AI Control',
    question: 'How it stays safe and accountable',
    category: 'control',
    summary: 'Govern what AI is permitted to know, decide and do.',
    detail:
      'A horizontal control system of eight domains, embedded in every layer and every service. It is also sold on its own as Service 03, AI Control, Governance & Assurance.',
    serves: ['plays', 'os'],
    reliesOn: ['services', 'capabilities', 'accelerators', 'foundations'],
    section: 'ai-control',
  },
  {
    id: 'services',
    letter: 'C',
    title: 'Insight AI Service Portfolio',
    question: 'What clients buy',
    category: 'service',
    summary: 'Six market-facing services, each with a defined entry offer.',
    detail:
      'The commercial portfolio. GTM plays land with one service’s entry offer and expand across the others. Services design, build and operate the Human + AI Operating System.',
    serves: ['os'],
    reliesOn: ['capabilities'],
    section: 'services',
  },
  {
    id: 'capabilities',
    letter: 'D',
    title: 'Core Delivery Capabilities',
    question: 'How Insight delivers',
    category: 'capability',
    summary: 'Six capability groups that every service draws on.',
    detail:
      'Delivery skills and methods. Capabilities are shared: one capability is typically consumed by several services, which is what makes the portfolio integrated rather than siloed.',
    serves: ['services'],
    reliesOn: ['accelerators', 'foundations'],
    section: 'capabilities',
  },
  {
    id: 'accelerators',
    letter: 'E',
    title: 'Insight IP & Accelerators',
    question: 'What makes delivery faster and better',
    category: 'accelerator',
    summary: 'Proprietary and reusable assets that strengthen delivery.',
    detail:
      'Insight’s assets, from assessment frameworks to build platforms and adoption programmes. They accelerate capabilities and services; they are not services in their own right.',
    serves: ['capabilities'],
    reliesOn: ['foundations'],
    section: 'accelerators',
  },
  {
    id: 'foundations',
    letter: 'F',
    title: 'Technology & Ecosystem Foundations',
    question: 'What it runs on',
    category: 'technology',
    summary: 'Cloud, sovereign infrastructure, models, data, applications and security.',
    detail:
      'The enabling technology ecosystem. Insight is technology-neutral: provider choice follows the client’s architecture, sovereignty and commercial requirements.',
    serves: ['accelerators', 'capabilities', 'os'],
    reliesOn: [],
    section: 'architecture',
  },
];

export const architectureLayerById = Object.fromEntries(architectureLayers.map((l) => [l.id, l])) as Record<
  ArchitectureLayerId,
  ArchitectureLayer
>;

/** The pages, in reading order. Ids double as URL anchors. `group` drives the sidebar headings. */
export const sections = [
  { id: 'overview', number: '01', label: 'Overview', title: 'Executive Overview', group: 'architecture' },
  { id: 'architecture', number: '02', label: 'Architecture', title: 'Master AI GTM Architecture', group: 'architecture' },
  { id: 'services', number: '03', label: 'Services', title: 'Service Portfolio', group: 'architecture' },
  { id: 'operating-system', number: '04', label: 'Operating System', title: 'Human + AI Operating System', group: 'architecture' },
  { id: 'ai-control', number: '05', label: 'AI Control', title: 'AI Control', group: 'architecture' },
  { id: 'capabilities', number: '06', label: 'Capabilities', title: 'Delivery Capabilities', group: 'architecture' },
  { id: 'accelerators', number: '07', label: 'Accelerators', title: 'Insight Accelerators', group: 'architecture' },
  { id: 'plays', number: '08', label: 'GTM Plays', title: 'Go-to-Market Plays', group: 'architecture' },
  { id: 'sectors', number: '09', label: 'Industries', title: 'Industry Overlays', group: 'architecture' },
  { id: 'landscape', number: '10', label: 'Landscape', title: 'Competitive Landscape', group: 'architecture' },
  { id: 'journey', number: '11', label: 'Journey', title: 'Client Transformation Journey', group: 'architecture' },
  { id: 'outcomes', number: '12', label: 'Outcomes', title: 'Outcomes', group: 'architecture' },
  { id: 'maturity', number: '13', label: 'Self-Check', title: 'AI Maturity Self-Check', group: 'workshop' },
  { id: 'prioritiser', number: '14', label: 'Prioritiser', title: 'Use-Case Prioritiser', group: 'workshop' },
  { id: 'summary', number: '15', label: 'Summary', title: 'Client Summary', group: 'workshop' },
] as const;

export type SectionId = (typeof sections)[number]['id'];

export const sectionGroups = [
  { id: 'architecture', label: 'The architecture' },
  { id: 'workshop', label: 'Client workshop' },
] as const;

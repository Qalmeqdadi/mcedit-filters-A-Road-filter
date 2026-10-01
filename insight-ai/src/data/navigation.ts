/** The twelve major views, in reading order. Ids double as URL anchors. */
export const sections = [
  { id: 'overview', number: '01', label: 'Overview', title: 'Executive Overview' },
  { id: 'architecture', number: '02', label: 'Architecture', title: 'Master AI GTM Architecture' },
  { id: 'services', number: '03', label: 'Services', title: 'Service Portfolio' },
  { id: 'operating-system', number: '04', label: 'Operating System', title: 'Human + AI Operating System' },
  { id: 'ai-control', number: '05', label: 'AI Control', title: 'AI Control' },
  { id: 'capabilities', number: '06', label: 'Capabilities', title: 'Delivery Capabilities' },
  { id: 'accelerators', number: '07', label: 'Accelerators', title: 'Insight Accelerators' },
  { id: 'plays', number: '08', label: 'GTM Plays', title: 'Go-to-Market Plays' },
  { id: 'sectors', number: '09', label: 'Industries', title: 'Industry Overlays' },
  { id: 'landscape', number: '10', label: 'Landscape', title: 'Competitive Landscape' },
  { id: 'journey', number: '11', label: 'Journey', title: 'Client Transformation Journey' },
  { id: 'outcomes', number: '12', label: 'Outcomes', title: 'Outcomes' },
] as const;

export type SectionId = (typeof sections)[number]['id'];

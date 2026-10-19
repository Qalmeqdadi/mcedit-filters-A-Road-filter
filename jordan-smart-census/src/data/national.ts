export interface NationalIndicator { code: string; pillar: string; owner: string; title: string; description: string; series: [number, number][]; sha: string }
export interface NationalData { fetchedAt: string; source: string; indicators: NationalIndicator[] }

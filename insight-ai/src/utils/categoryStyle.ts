import type { CategoryId } from '../data/types';

export type StyleKey = CategoryId | 'control';

/** Consistent visual coding for each information-architecture category. */
export const categoryStyle: Record<
  StyleKey,
  { text: string; soft: string; border: string; dot: string; ring: string; hex: string }
> = {
  service: { text: 'text-magenta', soft: 'bg-magenta-soft', border: 'border-magenta/30', dot: 'bg-magenta', ring: 'ring-magenta/40', hex: '#d4006f' },
  capability: { text: 'text-navy', soft: 'bg-navy-soft', border: 'border-navy/25', dot: 'bg-navy', ring: 'ring-navy/40', hex: '#1f3b7a' },
  accelerator: { text: 'text-purple', soft: 'bg-purple-soft', border: 'border-purple/30', dot: 'bg-purple', ring: 'ring-purple/40', hex: '#6b2bd9' },
  technology: { text: 'text-slate', soft: 'bg-slate-soft', border: 'border-slate/25', dot: 'bg-slate', ring: 'ring-slate/40', hex: '#475569' },
  architecture: { text: 'text-blue', soft: 'bg-blue-soft', border: 'border-blue/30', dot: 'bg-blue', ring: 'ring-blue/40', hex: '#2f6fdb' },
  play: { text: 'text-copper', soft: 'bg-copper-soft', border: 'border-copper/30', dot: 'bg-copper', ring: 'ring-copper/40', hex: '#9a5412' },
  industry: { text: 'text-teal', soft: 'bg-teal-soft', border: 'border-teal/30', dot: 'bg-teal', ring: 'ring-teal/40', hex: '#0f766e' },
  control: { text: 'text-purple', soft: 'control-gradient-soft', border: 'border-purple/30', dot: 'control-gradient', ring: 'ring-purple/40', hex: '#a3179f' },
};

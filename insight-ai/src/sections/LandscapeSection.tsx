import { Plus } from 'lucide-react';
import { useState } from 'react';
import { competitors, integratedPosition, integratedStatement, landscapeNote } from '../data/landscape';
import { Section } from '../components/Section';
import { useDetail } from '../hooks/useAppState';
import { cn } from '../utils/cn';

/** Insight's intended combined position as an additive equation. */
export function IntegratedPosition({ highlight, compact }: { highlight?: string[] | null; compact?: boolean }) {
  return (
    <div className="control-gradient rounded-2xl p-[2px]">
      <div className={cn('rounded-[14px] bg-surface', compact ? 'p-5' : 'p-6')}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-control-gradient text-[12px] font-bold tracking-[0.2em] uppercase">Insight’s integrated position</div>
          <div className="text-[12px] text-ink-3">Intended position, not a ranking</div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {integratedPosition.map((d, i) => {
            const lit = !highlight || highlight.includes(d);
            return (
              <span key={d} className="flex items-center gap-1.5">
                {i > 0 && <Plus className="size-3.5 text-ink-4" aria-hidden />}
                <span
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] transition',
                    lit ? 'border-ink/10 bg-ink text-white' : 'border-line-soft bg-mist text-ink-3',
                  )}
                >
                  {d}
                </span>
              </span>
            );
          })}
        </div>
        <p className={cn('mt-4 max-w-3xl leading-relaxed text-ink-2', compact ? 'text-[14px]' : 'text-[15px]')}>{integratedStatement}</p>
      </div>
    </div>
  );
}

export function CompetitorGrid({ selected, onSelect, compact }: { selected: string | null; onSelect: (id: string | null) => void; compact?: boolean }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', compact ? 'lg:grid-cols-7' : 'lg:grid-cols-4 xl:grid-cols-7')}>
      {competitors.map((c) => {
        const on = selected === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(on ? null : c.id)}
            aria-pressed={on}
            className={cn(
              'flex flex-col rounded-xl border p-4 text-left transition',
              on ? 'border-ink bg-surface shadow-lift' : 'border-line-soft bg-surface shadow-card hover:border-line',
              selected && !on && 'opacity-60',
            )}
          >
            <span className="text-[16px] font-semibold tracking-tight text-ink">{c.name}</span>
            <span className="mt-1 text-[12.5px] leading-snug font-medium text-ink-3">{c.archetype}</span>
            <span className="mt-3 flex flex-wrap gap-1">
              {c.themes.map((t) => (
                <span key={t} className="rounded bg-mist px-1.5 py-0.5 text-[11.5px] leading-snug text-ink-2">
                  {t}
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function LandscapeSection() {
  const detail = useDetail();
  const [selected, setSelected] = useState<string | null>(null);
  const sel = competitors.find((c) => c.id === selected);
  return (
    <Section
      id="landscape"
      number="10"
      eyebrow="Competitive landscape"
      title="A neutral view of market archetypes"
      lead="Each organisation has a distinct centre of gravity in how it positions AI. Insight’s intended position is the integration of all eight elements into one accountable operating system."
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="eyebrow">Market archetypes · publicly emphasised themes</div>
        <div className="text-[12.5px] text-ink-3">Select an organisation to see where its emphasis maps to the eight elements.</div>
      </div>
      <CompetitorGrid selected={selected} onSelect={setSelected} />
      <div className="mt-8">
        <IntegratedPosition highlight={sel ? sel.dimensions : null} />
        {sel && (
          <p className="mt-3 text-[13px] text-ink-3">
            Highlighted: the elements most associated with {sel.name}’s public positioning. {sel.name} also operates more broadly.
          </p>
        )}
      </div>
      <p className={cn('mt-6 max-w-3xl text-[12.5px] leading-relaxed text-ink-3', detail && 'text-[13px]')}>{landscapeNote}</p>
    </Section>
  );
}

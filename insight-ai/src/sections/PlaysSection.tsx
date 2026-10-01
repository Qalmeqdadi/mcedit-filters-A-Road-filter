import { useState } from 'react';
import { plays } from '../data/plays';
import type { PlayId } from '../data/types';
import { Icon } from '../components/Icon';
import { Section } from '../components/Section';
import { TypeBadge } from '../components/TypeBadge';
import { PlayFlow } from '../diagrams/PlayFlow';
import { useDetail } from '../hooks/useAppState';
import { cn } from '../utils/cn';

export function PlayTabs({ active, onChange, compact }: { active: PlayId; onChange: (id: PlayId) => void; compact?: boolean }) {
  return (
    <div role="tablist" aria-label="GTM plays" className={cn('grid gap-1.5', compact ? 'grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1')}>
      {plays.map((p) => {
        const on = active === p.id;
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(p.id)}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition',
              on ? 'border-transparent bg-ink text-white shadow-lift' : 'border-line-soft bg-surface hover:border-copper/40',
            )}
          >
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', on ? 'bg-white/10 text-white' : 'bg-copper-soft text-copper')}>
              <Icon name={p.icon} className="size-4" />
            </span>
            <span className="min-w-0">
              <span className={cn('block font-mono text-[10.5px] font-semibold', on ? 'text-white/65' : 'text-copper')}>PLAY {p.number}</span>
              <span className={cn('block text-[14px] leading-tight font-semibold', on ? 'text-white' : 'text-ink')}>{p.name}</span>
              {!compact && (
                <span className={cn('mt-1 hidden text-[12px] leading-snug lg:block', on ? 'text-white/70' : 'text-ink-3')}>{p.trigger}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PlaysSection() {
  const detail = useDetail();
  const [active, setActive] = useState<PlayId>('p01');
  return (
    <Section
      id="plays"
      number="08"
      eyebrow="Go-to-market plays"
      title="Six ways Insight lands and expands"
      lead="Each play starts from a trigger the client recognises, lands with one service’s entry offer, expands across the portfolio and settles into recurring operational value."
      aside={<TypeBadge category="play" />}
    >
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <PlayTabs active={active} onChange={setActive} />
        <div role="tabpanel" aria-label="Selected play">
          <PlayFlow id={active} detail={detail} />
        </div>
      </div>
    </Section>
  );
}

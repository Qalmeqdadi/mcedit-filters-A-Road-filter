import { motion } from 'framer-motion';
import { useState } from 'react';
import { stageById } from '../data/journey';
import { outcomeLenses, outcomes } from '../data/outcomes';
import { positioning } from '../data/positioning';
import { services } from '../data/services';
import { Section } from '../components/Section';
import { useDetail } from '../hooks/useAppState';
import { cn } from '../utils/cn';

export function OutcomeGrid({ lens, compact }: { lens: string | null; compact?: boolean }) {
  const detail = useDetail();
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', compact ? 'lg:grid-cols-5' : 'lg:grid-cols-3 xl:grid-cols-5')}>
      {outcomes.map((o, i) => {
        const lit = !lens || o.lens === lens;
        return (
          <motion.div
            key={o.id}
            animate={{ opacity: lit ? 1 : 0.32 }}
            transition={{ duration: 0.2 }}
            className={cn('card relative flex flex-col overflow-hidden', compact ? 'p-4' : 'p-5')}
          >
            <span className="font-mono text-[11px] font-semibold text-magenta">{String(i + 1).padStart(2, '0')}</span>
            <h3 className={cn('mt-2 leading-snug font-semibold tracking-tight text-ink', compact ? 'text-[15px]' : 'text-[16.5px]')}>{o.title}</h3>
            {!compact && <p className="mt-2 text-[13px] leading-snug text-ink-3">{o.description}</p>}
            <div className="mt-auto pt-4">
              {detail && !compact && (
                <div className="mb-2 rounded-md bg-mist px-2.5 py-2">
                  <div className="text-[10px] font-semibold tracking-[0.12em] text-ink-3 uppercase">Evidenced by</div>
                  <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{o.evidence}</div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="rounded bg-ink/5 px-1.5 py-0.5 font-medium text-ink-2">{stageById[o.stage].name}</span>
                {o.services.map((s) => (
                  <span key={s} className="rounded bg-magenta-soft px-1.5 py-0.5 font-mono font-semibold text-magenta">
                    S{services.find((x) => x.id === s)!.number}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function LensFilter({ lens, onChange }: { lens: string | null; onChange: (l: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter outcomes by stakeholder">
      {[null, ...outcomeLenses].map((l) => (
        <button
          key={l ?? 'all'}
          onClick={() => onChange(l)}
          aria-pressed={lens === l}
          className={cn(
            'rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition',
            lens === l ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:text-ink',
          )}
        >
          {l ?? 'All stakeholders'}
        </button>
      ))}
    </div>
  );
}

export function OutcomesSection({ onPresent }: { onPresent: () => void }) {
  const [lens, setLens] = useState<string | null>(null);
  return (
    <Section
      id="outcomes"
      number="12"
      eyebrow="Client outcomes"
      title="What clients get"
      lead="Concrete outcomes, each demonstrated by evidence the client can inspect. Targets are set with each client against its own baseline."
    >
      <div className="mb-5">
        <LensFilter lens={lens} onChange={setLens} />
      </div>
      <OutcomeGrid lens={lens} />

      {/* Close */}
      <div className="mt-16 overflow-hidden rounded-2xl bg-ink text-white">
        <div className="relative px-6 py-12 md:px-12 md:py-16">
          <div aria-hidden className="absolute -top-24 -right-24 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(212,0,111,0.35),transparent)]" />
          <div aria-hidden className="absolute -bottom-32 left-1/3 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(107,43,217,0.35),transparent)]" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div>
              <div className="text-[12px] font-semibold tracking-[0.24em] text-white/60 uppercase">Insight AI</div>
              <p className="mt-4 font-serif text-[28px] leading-[1.2] italic md:text-[34px]">
                {positioning.secondary[0]}
                <br />
                {positioning.secondary[1]}
              </p>
              <button
                onClick={onPresent}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-medium text-ink transition hover:bg-white/90"
              >
                Present this architecture
              </button>
            </div>
            <div>
              <div className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-white/60 uppercase">Where to start: six entry offers</div>
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {services.map((s) => (
                  <li key={s.id} className="flex items-baseline gap-3 py-2.5">
                    <span className="font-mono text-[11px] font-semibold text-[#ff6fb4]">S{s.number}</span>
                    <span className="text-[14.5px] font-medium">{s.entry}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

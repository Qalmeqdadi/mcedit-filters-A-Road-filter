import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, RefreshCcw } from 'lucide-react';
import { playById } from '../data/plays';
import { serviceById } from '../data/services';
import type { PlayId, ServiceId } from '../data/types';
import { AcceleratorTag } from '../components/Tags';
import { cn } from '../utils/cn';

function SvcBadge({ id }: { id: ServiceId }) {
  return (
    <span className="rounded bg-magenta-soft px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-magenta" title={serviceById[id].name}>
      S{serviceById[id].number}
    </span>
  );
}

/** TRIGGER → LAND → EXPAND → OPERATE / RECURRING VALUE for one GTM play. */
export function PlayFlow({ id, detail, compact }: { id: PlayId; detail?: boolean; compact?: boolean }) {
  const p = playById[id];
  const path = [...new Set([p.land.service, ...p.expand.map((e) => e.service), p.operate.service])].sort();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
        <div
          className={cn(
            'grid items-stretch gap-2',
            compact ? 'grid-cols-[1fr_auto_1fr_auto_1.25fr_auto_1fr]' : 'lg:grid-cols-[1fr_auto_1fr_auto_1.25fr_auto_1fr]',
          )}
        >
          <Stage label="Trigger" tone="copper" compact={compact}>
            <p className={cn('font-serif leading-snug text-ink italic', compact ? 'text-[17px]' : 'text-[19px]')}>“{p.trigger}”</p>
            <p className="mt-auto pt-3 text-[12px] text-ink-3">What the client says</p>
          </Stage>
          <Arrow />
          <Stage label="Land" tone="magenta" compact={compact}>
            <p className={cn('leading-snug font-semibold tracking-tight text-ink', compact ? 'text-[16px]' : 'text-[17px]')}>{p.land.label}</p>
            <div className="mt-auto flex items-center gap-2 pt-3 text-[12px] text-ink-3">
              <SvcBadge id={p.land.service} /> Entry offer
            </div>
          </Stage>
          <Arrow />
          <Stage label="Expand" tone="navy" compact={compact}>
            <ul className="space-y-1">
              {p.expand.map((e, i) => (
                <motion.li
                  key={e.label}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.05 }}
                  className="flex items-center justify-between gap-2 rounded-md border border-line-soft bg-surface px-2.5 py-1.5"
                >
                  <span className="text-[13px] leading-tight font-medium text-ink">{e.label}</span>
                  <SvcBadge id={e.service} />
                </motion.li>
              ))}
            </ul>
          </Stage>
          <Arrow />
          <Stage label="Operate / recurring value" tone="purple" compact={compact}>
            <p className={cn('leading-snug font-semibold tracking-tight text-ink', compact ? 'text-[16px]' : 'text-[17px]')}>{p.operate.label}</p>
            <p className="mt-2 text-[13px] leading-snug text-ink-3">{p.operate.description}</p>
            <div className="mt-auto flex items-center gap-2 pt-3 text-[12px] text-ink-3">
              <RefreshCcw className="size-3.5 text-purple" /> Recurring <SvcBadge id={p.operate.service} />
            </div>
          </Stage>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line-soft bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">Services engaged</span>
            {path.map((s) => (
              <span key={s} className="text-[12.5px] font-medium text-ink-2">
                <SvcBadge id={s} /> <span className="hidden xl:inline">{serviceById[s].shortName}</span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">Accelerators</span>
            {p.accelerators.map((a) => (
              <AcceleratorTag key={a} id={a} className="text-[11.5px]" />
            ))}
          </div>
        </div>

        {detail && (
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_2fr]">
            <div className="rounded-xl border border-line-soft bg-surface p-4">
              <div className="eyebrow mb-2">Typical sponsors</div>
              <p className="text-[13.5px] leading-relaxed text-ink-2">{p.sponsors.join(' · ')}</p>
            </div>
            <div className="rounded-xl border border-copper/20 bg-copper-soft/60 p-4">
              <div className="eyebrow mb-2 text-copper">Qualifying questions</div>
              <ol className="space-y-1.5">
                {p.questions.map((q, i) => (
                  <li key={q} className="flex gap-2.5 text-[13.5px] leading-snug text-ink-2">
                    <span className="font-mono text-[11px] font-semibold text-copper">{i + 1}</span>
                    {q}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function Stage({ label, tone, children, compact }: { label: string; tone: 'copper' | 'magenta' | 'navy' | 'purple'; children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={cn('card relative flex flex-col overflow-hidden', compact ? 'p-4' : 'p-5')}>
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-[3px]',
          tone === 'copper' && 'bg-copper',
          tone === 'magenta' && 'bg-magenta',
          tone === 'navy' && 'bg-navy',
          tone === 'purple' && 'control-gradient',
        )}
      />
      <div
        className={cn(
          'mb-3 text-[11px] font-bold tracking-[0.16em] uppercase',
          tone === 'copper' && 'text-copper',
          tone === 'magenta' && 'text-magenta',
          tone === 'navy' && 'text-navy',
          tone === 'purple' && 'text-purple',
        )}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center py-1 lg:py-0" aria-hidden>
      <ArrowRight className="size-4 rotate-90 text-ink-4 lg:rotate-0" />
    </div>
  );
}

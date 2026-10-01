import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { controlDomainById, controlDomains, controlEmbedded, runtimeStates } from '../data/control';
import { serviceById } from '../data/services';
import type { ControlDomainId, RuntimeStateId } from '../data/types';
import { Icon } from '../components/Icon';
import { AcceleratorTag, PlainList } from '../components/Tags';
import { cn } from '../utils/cn';

/** AI Control is both a sellable service AND a horizontal system embedded in every service. */
export function ControlDualRole({ compact }: { compact?: boolean }) {
  const s03 = serviceById.s03;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
      <div className={cn('card relative overflow-hidden', compact ? 'p-5' : 'p-6')}>
        <span className="absolute inset-x-0 top-0 h-[3px] bg-magenta" />
        <div className="text-[11px] font-semibold tracking-[0.16em] text-magenta uppercase">Role 1 · A sellable service</div>
        <h3 className="mt-2 text-[19px] leading-snug font-semibold tracking-tight text-ink">
          Service {s03.number}: {s03.name}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-3">
          Bought on its own when AI and agents are spreading faster than governance.
        </p>
        <div className="mt-4 rounded-lg border border-magenta/15 bg-magenta-soft/50 px-3 py-2.5">
          <div className="text-[10.5px] font-semibold tracking-[0.14em] text-magenta uppercase">Entry offer</div>
          <div className="mt-0.5 text-[14px] font-semibold text-ink">{s03.entry}</div>
        </div>
        {!compact && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {s03.accelerators.map((a) => (
              <AcceleratorTag key={a} id={a} />
            ))}
          </div>
        )}
      </div>

      <div className={cn('card relative overflow-hidden', compact ? 'p-5' : 'p-6')}>
        <div className="text-[11px] font-semibold tracking-[0.16em] text-purple uppercase">
          Role 2 · A horizontal control system embedded in every service
        </div>
        <div className="relative mt-5">
          <div className="control-gradient absolute top-[22px] right-0 left-0 h-[6px] rounded-full opacity-90" aria-hidden />
          <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {controlEmbedded.map(({ service, contribution }) => {
              const s = serviceById[service];
              const isSelf = service === 's03';
              return (
                <div key={service} className="flex flex-col items-center text-center">
                  <span
                    className={cn(
                      'z-10 flex h-[50px] w-full items-center justify-center rounded-lg border px-1 font-mono text-[12px] font-semibold',
                      isSelf ? 'control-gradient border-transparent text-white' : 'border-magenta/30 bg-surface text-magenta',
                    )}
                  >
                    S{s.number}
                  </span>
                  <span className="mt-2 text-[12.5px] leading-tight font-semibold text-ink">{s.shortName}</span>
                  {!compact && <span className="mt-1.5 text-[12px] leading-snug text-ink-3">{contribution}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Eight control domains; selecting one expands purpose, controls, evidence and accountability. */
export function ControlDomainGrid({
  selected,
  onSelect,
  compact,
  showPurpose = true,
}: {
  selected: ControlDomainId | null;
  onSelect: (id: ControlDomainId) => void;
  compact?: boolean;
  showPurpose?: boolean;
}) {
  const d = selected ? controlDomainById[selected] : null;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {controlDomains.map((c) => {
          const on = selected === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              aria-expanded={on}
              className={cn(
                'group relative flex flex-col rounded-xl border text-left transition duration-200',
                compact ? 'p-3.5' : 'p-4',
                on ? 'border-transparent bg-ink text-white shadow-lift' : 'border-line-soft bg-surface shadow-card hover:-translate-y-0.5 hover:border-purple/30',
              )}
            >
              <span className="flex items-center justify-between">
                <span className={cn('font-mono text-[11px] font-semibold', on ? 'text-white/70' : 'text-purple')}>{c.number}</span>
                <span className={cn('flex size-8 items-center justify-center rounded-lg', on ? 'bg-white/10 text-white' : 'bg-purple-soft text-purple')}>
                  <Icon name={c.icon} className="size-4" />
                </span>
              </span>
              <span className={cn('mt-2 leading-snug font-semibold tracking-tight', compact ? 'text-[14px]' : 'text-[15px]', on ? 'text-white' : 'text-ink')}>
                {c.name}
              </span>
              {showPurpose && !compact && (
                <span className={cn('mt-1.5 text-[12.5px] leading-snug', on ? 'text-white/75' : 'text-ink-3')}>{c.purpose}</span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {d && (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
            className="mt-3 grid gap-5 rounded-xl border border-purple/20 bg-surface p-5 shadow-card md:grid-cols-4"
          >
            <Block label="Purpose">
              <p className="text-[14px] leading-snug text-ink-2">{d.purpose}</p>
            </Block>
            <Block label="Example controls">
              <PlainList items={d.controls} className="[&_li]:text-[13px]" />
            </Block>
            <Block label="Evidence produced">
              <PlainList items={d.evidence} className="[&_li]:text-[13px]" />
            </Block>
            <Block label="Human accountability">
              <p className="text-[13.5px] leading-snug text-ink-2">{d.accountability}</p>
            </Block>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-purple uppercase">{label}</div>
      {children}
    </div>
  );
}

const stateTone: Record<RuntimeStateId, { bar: string; text: string; soft: string; border: string }> = {
  go: { bar: 'bg-go', text: 'text-go', soft: 'bg-go-soft', border: 'border-go/25' },
  conditional: { bar: 'bg-cond', text: 'text-cond', soft: 'bg-cond-soft', border: 'border-cond/25' },
  remediate: { bar: 'bg-remediate', text: 'text-remediate', soft: 'bg-remediate-soft', border: 'border-remediate/25' },
  stop: { bar: 'bg-stop', text: 'text-stop', soft: 'bg-stop-soft', border: 'border-stop/25' },
};

/** Runtime control states: how control decisions are expressed at gates and in operation. */
export function RuntimeStates({ detail, compact }: { detail?: boolean; compact?: boolean }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-ink-2">
        {['AI action or release requested', 'Checked against identity, authority, policy and data', 'Control decision'].map(
          (step, i) => (
            <span key={step} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="size-3.5 text-ink-4" />}
              <span className="rounded-full border border-line bg-surface px-3 py-1">{step}</span>
            </span>
          ),
        )}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {runtimeStates.map((s) => {
          const t = stateTone[s.id];
          return (
            <div key={s.id} className={cn('relative overflow-hidden rounded-xl border bg-surface', t.border, compact ? 'p-4' : 'p-5')}>
              <span className={cn('absolute inset-x-0 top-0 h-1', t.bar)} />
              <div className="flex items-center gap-2">
                <span className={cn('size-2.5 rounded-full', t.bar)} />
                <span className={cn('text-[13px] font-bold tracking-[0.12em]', t.text)}>{s.label}</span>
              </div>
              <p className="mt-2 text-[14.5px] leading-snug font-semibold text-ink">{s.meaning}</p>
              <p className="mt-1.5 text-[13px] leading-snug text-ink-3">{s.response}</p>
              {detail && (
                <>
                  <div className={cn('mt-3 rounded-lg px-2.5 py-2', t.soft)}>
                    <div className="mb-1 text-[10.5px] font-semibold tracking-[0.12em] text-ink-3 uppercase">Typical triggers</div>
                    <div className="text-[12.5px] leading-snug text-ink-2">{s.triggers.join(' · ')}</div>
                  </div>
                  <div className="mt-2 text-[12px] text-ink-3">
                    <span className="font-semibold text-ink-2">Decision owner:</span> {s.owner}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

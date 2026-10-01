import { motion } from 'framer-motion';
import { MousePointerClick, X } from 'lucide-react';
import { Fragment, useMemo, useRef, useState } from 'react';
import { capabilityById, capabilityGroupById, capabilityGroups } from '../data/capabilities';
import { services } from '../data/services';
import type { CapabilityGroupId, ServiceId } from '../data/types';
import { Icon } from '../components/Icon';
import { Section } from '../components/Section';
import { TypeBadge } from '../components/TypeBadge';
import { useDetail } from '../hooks/useAppState';
import { useConnectors } from '../hooks/useConnectors';
import { cn } from '../utils/cn';

type Selection = { kind: 'cap'; id: string } | { kind: 'group'; id: CapabilityGroupId } | null;

/** Capability ↔ service consumption explorer. Reused by present mode. */
export function CapabilityExplorer({ compact }: { compact?: boolean }) {
  const detail = useDetail();
  const [selected, setSelected] = useState<Selection>(null);
  const [hover, setHover] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const active: Selection = selected ?? (hover ? { kind: 'cap', id: hover } : null);

  // Number of capabilities (within the selection) consumed by each service.
  const consumption = useMemo(() => {
    const map = new Map<ServiceId, number>();
    if (!active) return map;
    const caps = active.kind === 'cap' ? [capabilityById[active.id]] : capabilityGroupById[active.id].capabilities;
    for (const c of caps) for (const s of c.services) map.set(s, (map.get(s) ?? 0) + 1);
    return map;
  }, [active]);
  const total = active ? (active.kind === 'cap' ? 1 : capabilityGroupById[active.id].capabilities.length) : 0;

  const specs = useMemo(() => {
    if (!selected || selected.kind !== 'cap') return [];
    return capabilityById[selected.id].services.map((s) => ({ from: `cap:${selected.id}`, to: `svcr:${s}`, tone: '#d4006f' }));
  }, [selected]);
  const { paths, size } = useConnectors(ref, specs, `${detail}-${compact}`);

  const selectedCap = active?.kind === 'cap' ? capabilityById[active.id] : null;
  const selectedGroup = active?.kind === 'group' ? capabilityGroupById[active.id] : null;

  return (
    <div ref={ref} className="relative">
      {/* Service receivers */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="eyebrow">Service offerings that consume the selection</div>
        {selected ? (
          <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-3 hover:text-ink">
            <X className="size-3.5" /> Clear selection
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
            <MousePointerClick className="size-3.5 text-magenta" /> Select a capability or a group
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {services.map((s) => {
          const n = consumption.get(s.id) ?? 0;
          const lit = n > 0;
          return (
            <motion.div
              key={s.id}
              data-node={`svcr:${s.id}`}
              animate={{ opacity: active && !lit ? 0.35 : 1, y: lit ? -2 : 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'rounded-xl border px-3 py-2.5 transition-colors',
                lit ? 'border-magenta bg-magenta-soft shadow-card' : 'border-line-soft bg-surface',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold text-magenta">S{s.number}</span>
                {active && lit && total > 1 && (
                  <span className="rounded-full bg-magenta px-1.5 text-[10.5px] font-semibold text-white tabular-nums">
                    {n}/{total}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[13px] leading-tight font-semibold text-ink">{s.shortName}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Status line */}
      <div className="my-4 min-h-[44px] rounded-lg bg-mist/80 px-4 py-2.5 text-[13.5px] leading-snug text-ink-2">
        {selectedCap ? (
          <>
            <strong className="font-semibold text-ink">{selectedCap.name}</strong> is consumed by{' '}
            <strong className="font-semibold text-magenta">{selectedCap.services.length} of 6</strong> services.
            {detail && <span className="text-ink-3"> {selectedCap.definition}</span>}
          </>
        ) : selectedGroup ? (
          <>
            <strong className="font-semibold text-ink">{selectedGroup.name}</strong> capabilities are drawn on by{' '}
            <strong className="font-semibold text-magenta">{consumption.size} of 6</strong> services. Home service: S
            {services.find((s) => s.id === selectedGroup.homeService)!.number}.
          </>
        ) : (
          <span className="text-ink-3">
            Capabilities are shared across services. That sharing is what makes the portfolio integrated rather than six silos.
          </span>
        )}
      </div>

      {/* Capability groups */}
      <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', !compact && 'xl:grid-cols-6')}>
        {capabilityGroups.map((g) => {
          const groupOn = selected?.kind === 'group' && selected.id === g.id;
          return (
            <div key={g.id} className={cn('rounded-xl border bg-surface p-3', groupOn ? 'border-navy shadow-lift' : 'border-line-soft shadow-card')}>
              <button
                onClick={() => setSelected(groupOn ? null : { kind: 'group', id: g.id })}
                aria-pressed={groupOn}
                className="mb-2.5 flex w-full items-start gap-2.5 rounded-lg p-1 text-left hover:bg-mist"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-soft text-navy">
                  <Icon name={g.icon} className="size-4" />
                </span>
                <span>
                  <span className="block text-[14px] leading-tight font-semibold text-ink">{g.name}</span>
                  {detail && !compact && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-3">{g.summary}</span>}
                </span>
              </button>
              <div className={cn('flex flex-wrap gap-1', compact ? '' : 'xl:flex-col xl:flex-nowrap')}>
                {g.capabilities.map((c) => {
                  const on = selected?.kind === 'cap' && selected.id === c.id;
                  const dim = active?.kind === 'cap' && active.id !== c.id;
                  return (
                    <button
                      key={c.id}
                      data-node={`cap:${c.id}`}
                      onClick={() => setSelected(on ? null : { kind: 'cap', id: c.id })}
                      onMouseEnter={() => setHover(c.id)}
                      onMouseLeave={() => setHover(null)}
                      aria-pressed={on}
                      title={c.definition}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-[12.5px] leading-tight font-medium transition',
                        on ? 'border-navy bg-navy text-white' : 'border-line-soft bg-surface text-ink hover:border-navy/30 hover:bg-navy-soft/50',
                        dim && !on && 'opacity-55',
                      )}
                    >
                      <span>{c.name}</span>
                      <span className={cn('font-mono text-[10px] tabular-nums', on ? 'text-white/70' : 'text-ink-4')}>{c.services.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {paths.length > 0 && (
        <svg aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-visible" width={size.w} height={size.h}>
          {paths.map((p) => (
            <g key={p.key}>
              <path d={p.d} fill="none" stroke={p.tone} strokeOpacity={0.15} strokeWidth={5} />
              <path d={p.d} fill="none" stroke={p.tone} strokeOpacity={0.75} strokeWidth={1.5} className="connector-animated" />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

function CoverageMatrix() {
  return (
    <div className="mt-10 overflow-x-auto rounded-xl border border-line-soft bg-surface">
      <table className="w-full min-w-[760px] text-left text-[12.5px]">
        <caption className="px-4 pt-4 pb-1 text-left">
          <span className="eyebrow">Practitioner view: capability consumption by service</span>
        </caption>
        <thead>
          <tr className="border-b border-line-soft">
            <th className="px-4 py-2 font-semibold text-ink-3">Capability</th>
            {services.map((s) => (
              <th key={s.id} className="px-2 py-2 text-center font-mono text-[11px] font-semibold text-magenta" title={s.name}>
                S{s.number}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {capabilityGroups.map((g) => (
            <Fragment key={g.id}>
              <tr className="bg-mist/70">
                <td colSpan={7} className="px-4 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-navy uppercase">
                  {g.name}
                </td>
              </tr>
              {g.capabilities.map((c) => (
                <tr key={c.id} className="border-b border-line-soft/70">
                  <td className="px-4 py-1.5 text-ink-2">{c.name}</td>
                  {services.map((s) => (
                    <td key={s.id} className="px-2 py-1.5 text-center">
                      {c.services[0] === s.id ? (
                        <span className="inline-block size-2.5 rounded-full bg-navy" title="Home service" />
                      ) : c.services.includes(s.id) ? (
                        <span className="inline-block size-2.5 rounded-full border-2 border-navy/60" title="Also consumed" />
                      ) : (
                        <span className="text-line">·</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="flex gap-5 px-4 py-3 text-[11.5px] text-ink-3">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-navy" /> Home service</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-navy/60" /> Also consumed</span>
      </div>
    </div>
  );
}

export function CapabilitiesSection() {
  const detail = useDetail();
  return (
    <Section
      id="capabilities"
      number="06"
      eyebrow="Core delivery capabilities"
      title="How Insight delivers"
      lead="Six capability groups sit beneath the six services. Select any capability to see every service offering that consumes it."
      aside={<TypeBadge category="capability" />}
    >
      <CapabilityExplorer />
      {detail && <CoverageMatrix />}
    </Section>
  );
}

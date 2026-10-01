import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { acceleratorById, acceleratorFilters, accelerators, servicesForAccelerator } from '../data/accelerators';
import type { AcceleratorFilter, AcceleratorId } from '../data/types';
import { DetailBlock, Drawer } from '../components/Drawer';
import { Icon } from '../components/Icon';
import { LifecycleMini } from '../components/LifecycleMini';
import { Section } from '../components/Section';
import { CapabilityTag, ServiceTag } from '../components/Tags';
import { TypeBadge } from '../components/TypeBadge';
import { useDetail } from '../hooks/useAppState';
import { cn } from '../utils/cn';

export const acceleratorNote =
  'Descriptions state each asset’s role in this architecture. Confirm feature-level detail and any performance evidence with the asset owner before external use.';

export function AcceleratorFilters({
  filter,
  onChange,
}: {
  filter: AcceleratorFilter | null;
  onChange: (f: AcceleratorFilter | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter accelerators">
      <FilterButton on={filter === null} onClick={() => onChange(null)} label="All" count={accelerators.length} />
      {acceleratorFilters.map((f) => (
        <FilterButton
          key={f.id}
          on={filter === f.id}
          onClick={() => onChange(filter === f.id ? null : f.id)}
          label={f.id}
          title={f.description}
          count={accelerators.filter((a) => a.filters.includes(f.id)).length}
        />
      ))}
    </div>
  );
}

function FilterButton({ on, onClick, label, count, title }: { on: boolean; onClick: () => void; label: string; count: number; title?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      title={title}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold tracking-[0.08em] transition',
        on ? 'border-purple bg-purple text-white' : 'border-line bg-surface text-ink-2 hover:border-purple/40 hover:text-ink',
      )}
    >
      {label}
      <span className={cn('font-mono text-[10.5px] tabular-nums', on ? 'text-white/75' : 'text-ink-4')}>{count}</span>
    </button>
  );
}

export function AcceleratorGrid({
  filter,
  onSelect,
  selected,
  compact,
}: {
  filter: AcceleratorFilter | null;
  onSelect: (id: AcceleratorId) => void;
  selected?: AcceleratorId | null;
  compact?: boolean;
}) {
  const detail = useDetail();
  const visible = accelerators.filter((a) => !filter || a.filters.includes(filter));
  return (
    <motion.div layout className={cn('grid gap-3 sm:grid-cols-2', compact ? 'lg:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-4')}>
      <AnimatePresence mode="popLayout">
        {visible.map((a) => (
          <motion.button
            layout
            key={a.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            onClick={() => onSelect(a.id)}
            aria-haspopup="dialog"
            className={cn(
              'card group relative flex flex-col overflow-hidden text-left transition-shadow hover:shadow-lift',
              compact ? 'p-4' : 'p-5',
              selected === a.id && 'ring-2 ring-purple/40',
            )}
          >
            <span className="absolute inset-x-0 top-0 h-[3px] bg-purple" />
            <span className="flex items-start justify-between gap-3">
              <span>
                <span className={cn('block font-semibold tracking-tight text-ink', compact ? 'text-[17px]' : 'text-[19px]')}>{a.name}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{a.descriptor}</span>
              </span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-soft text-purple">
                <Icon name={a.icon} className="size-[18px]" />
              </span>
            </span>
            {detail && !compact && <span className="mt-3 text-[13px] leading-relaxed text-ink-2">{a.whatItDoes}</span>}
            <span className="mt-auto flex flex-wrap gap-1 pt-4">
              {a.filters.map((f) => (
                <span
                  key={f}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10.5px] font-semibold tracking-[0.08em]',
                    filter === f ? 'bg-purple text-white' : 'bg-purple-soft text-purple',
                  )}
                >
                  {f}
                </span>
              ))}
            </span>
          </motion.button>
        ))}
        {!filter && !compact && (
          <motion.div
            layout
            key="note"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col justify-center rounded-xl border border-dashed border-purple/30 p-5"
          >
            <span className="text-[11px] font-semibold tracking-[0.14em] text-purple uppercase">How to position them</span>
            <span className="mt-2 text-[14px] leading-snug text-ink-2">
              Lead with the service and its outcome. Accelerators explain why Insight delivers it faster and with more confidence.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AcceleratorDetail({ id }: { id: AcceleratorId }) {
  const a = acceleratorById[id];
  const svcs = servicesForAccelerator(id);
  return (
    <div>
      <DetailBlock label="What it does">
        <p className="text-[15px] leading-relaxed text-ink-2">{a.whatItDoes}</p>
      </DetailBlock>
      <DetailBlock label="Lifecycle position">
        <LifecycleMini active={a.stages} />
      </DetailBlock>
      <DetailBlock label="Supported service">
        {svcs.length ? (
          <div className="flex flex-wrap gap-1.5">
            {svcs.map((s) => (
              <ServiceTag key={s} id={s} />
            ))}
          </div>
        ) : (
          <p className="text-[13.5px] text-ink-3">Supports delivery across services through the capabilities below.</p>
        )}
      </DetailBlock>
      <DetailBlock label="Supported capability">
        <div className="flex flex-wrap gap-1.5">
          {a.capabilities.map((c) => (
            <CapabilityTag key={c} id={c} />
          ))}
        </div>
      </DetailBlock>
      <DetailBlock label="Role">
        <div className="flex flex-wrap gap-1.5">
          {a.filters.map((f) => (
            <span key={f} className="rounded-md bg-purple-soft px-2 py-1 text-[11.5px] font-semibold tracking-[0.08em] text-purple">
              {f}
            </span>
          ))}
        </div>
      </DetailBlock>
      <p className="rounded-lg bg-mist px-3 py-2.5 text-[12.5px] leading-snug text-ink-3">{acceleratorNote}</p>
    </div>
  );
}

export function AcceleratorsSection() {
  const [filter, setFilter] = useState<AcceleratorFilter | null>(null);
  const [selected, setSelected] = useState<AcceleratorId | null>(null);
  return (
    <Section
      id="accelerators"
      number="07"
      eyebrow="Insight IP & accelerators"
      title="What makes delivery faster and better"
      lead="Eleven Insight assets that strengthen delivery across the lifecycle. They accelerate services and capabilities; they are not services in their own right."
      aside={<TypeBadge category="accelerator" />}
    >
      <div className="mb-6">
        <AcceleratorFilters filter={filter} onChange={setFilter} />
      </div>
      <AcceleratorGrid filter={filter} onSelect={setSelected} selected={selected} />
      <p className="mt-6 text-[12.5px] text-ink-3">{acceleratorNote}</p>
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${acceleratorById[selected].name}` : ''}
        eyebrow={
          selected && (
            <span className="flex flex-wrap items-center gap-2">
              <TypeBadge category="accelerator" />
              <span className="text-[13px] text-ink-3">{acceleratorById[selected].descriptor}</span>
            </span>
          )
        }
      >
        {selected && <AcceleratorDetail id={selected} />}
      </Drawer>
    </Section>
  );
}

import { useState } from 'react';
import { capabilityGroups } from '../data/capabilities';
import { plays } from '../data/plays';
import { services, serviceById } from '../data/services';
import type { ServiceId } from '../data/types';
import { DetailBlock, Drawer } from '../components/Drawer';
import { Icon } from '../components/Icon';
import { LifecycleMini } from '../components/LifecycleMini';
import { Section } from '../components/Section';
import { AcceleratorTag, PlainList } from '../components/Tags';
import { Term } from '../components/Term';
import { TypeBadge } from '../components/TypeBadge';
import { useDetail } from '../hooks/useAppState';
import { cn } from '../utils/cn';

export function ServiceCard({
  id,
  selected,
  onSelect,
  compact,
  detail,
}: {
  id: ServiceId;
  selected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
  detail?: boolean;
}) {
  const s = serviceById[id];
  return (
    <button
      onClick={onSelect}
      aria-haspopup="dialog"
      className={cn(
        'card group relative flex h-full flex-col overflow-hidden text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        compact ? 'p-5' : 'p-6',
        selected && 'ring-2 ring-magenta/40',
      )}
    >
      <span className="absolute inset-x-0 top-0 h-[3px] bg-magenta" />
      <div className="mb-4 flex items-start justify-between">
        <span className="font-mono text-[13px] font-semibold text-magenta">SERVICE {s.number}</span>
        <span className="flex size-9 items-center justify-center rounded-lg bg-magenta-soft text-magenta">
          <Icon name={s.icon} className="size-[18px]" />
        </span>
      </div>
      <h3 className={cn('font-semibold tracking-tight text-ink', compact ? 'text-[17px] leading-snug' : 'text-[19px] leading-snug')}>
        {s.name}
      </h3>
      <p className={cn('mt-3 font-serif text-ink-2 italic', compact ? 'text-[15px] leading-snug' : 'text-[16.5px] leading-snug')}>
        “{s.question}”
      </p>
      {detail && (
        <>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-3">{s.summary}</p>
          <div className="mt-4 flex flex-wrap gap-1">
            {s.scope.slice(0, 7).map((x) => (
              <span key={x} className="rounded bg-mist px-1.5 py-0.5 text-[11.5px] text-ink-2">
                {x}
              </span>
            ))}
            {s.scope.length > 7 && (
              <span className="rounded px-1.5 py-0.5 text-[11.5px] font-medium text-ink-3">+{s.scope.length - 7} more</span>
            )}
          </div>
        </>
      )}
      <div className="mt-auto pt-5">
        <div className="rounded-lg border border-magenta/15 bg-magenta-soft/50 px-3 py-2.5">
          <div className="text-[10.5px] font-semibold tracking-[0.14em] text-magenta uppercase">Entry offer</div>
          <div className="mt-0.5 text-[14px] leading-snug font-semibold text-ink">{s.entry}</div>
        </div>
        {detail && s.accelerators.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {s.accelerators.map((a) => (
              <AcceleratorTag key={a} id={a} className="text-[11.5px]" />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/** Full service detail used in drawers (explore and present). */
export function ServiceDetail({ id }: { id: ServiceId }) {
  const s = serviceById[id];
  const lands = plays.filter((p) => p.land.service === id);
  const expands = plays.filter((p) => p.land.service !== id && p.expand.some((e) => e.service === id));
  const caps = capabilityGroups
    .map((g) => ({ g, caps: g.capabilities.filter((c) => c.services.includes(id)) }))
    .filter((x) => x.caps.length);

  return (
    <div>
      <p className="mb-5 font-serif text-[18px] leading-snug text-ink italic">“{s.question}”</p>
      <p className="mb-6 text-[14.5px] leading-relaxed text-ink-2">{s.summary}</p>
      <DetailBlock label="Entry offer">
        <div className="rounded-lg border border-magenta/20 bg-magenta-soft/60 px-3 py-2.5">
          <div className="text-[14.5px] font-semibold text-ink">{s.entry}</div>
          <div className="mt-0.5 text-[13px] leading-snug text-ink-3">{s.entryDescription}</div>
        </div>
      </DetailBlock>
      <DetailBlock label="Scope">
        <div className="flex flex-wrap gap-1">
          {s.scope.map((x) => (
            <span key={x} className="rounded bg-mist px-2 py-1 text-[12.5px] text-ink-2">
              {x}
            </span>
          ))}
        </div>
      </DetailBlock>
      <DetailBlock label="Client outputs">
        <PlainList items={s.outputs} />
      </DetailBlock>
      {s.accelerators.length > 0 && (
        <DetailBlock label="Accelerators / IP">
          <div className="flex flex-wrap gap-1.5">
            {s.accelerators.map((a) => (
              <AcceleratorTag key={a} id={a} />
            ))}
          </div>
        </DetailBlock>
      )}
      <DetailBlock label="Capabilities consumed">
        <div className="space-y-2.5">
          {caps.map(({ g, caps }) => (
            <div key={g.id}>
              <div className="mb-1 text-[12px] font-semibold text-navy">{g.name}</div>
              <div className="text-[13px] leading-snug text-ink-2">{caps.map((c) => c.name).join(' · ')}</div>
            </div>
          ))}
        </div>
      </DetailBlock>
      <DetailBlock label="Lifecycle position">
        <LifecycleMini active={s.stages} />
      </DetailBlock>
      {(lands.length > 0 || expands.length > 0) && (
        <DetailBlock label="GTM plays">
          <div className="space-y-1 text-[13.5px] text-ink-2">
            {lands.map((p) => (
              <div key={p.id}>
                <span className="font-semibold text-copper">Lands</span> Play {p.number}: {p.name}
              </div>
            ))}
            {expands.map((p) => (
              <div key={p.id}>
                <span className="font-semibold text-ink-3">Expands</span> Play {p.number}: {p.name}
              </div>
            ))}
          </div>
        </DetailBlock>
      )}
      <DetailBlock label="Typical sponsors">
        <p className="text-[13.5px] text-ink-2">{s.sponsors.join(' · ')}</p>
      </DetailBlock>
    </div>
  );
}

export function ServicesSection() {
  const detail = useDetail();
  const [selected, setSelected] = useState<ServiceId | null>(null);
  return (
    <Section
      id="services"
      number="03"
      eyebrow="Service portfolio"
      title={<>Six services. What clients buy.</>}
      lead={
        <>
          Each service answers one executive question and starts with a defined <Term id="entry-offer" />. Capabilities and
          accelerators sit underneath; they are how Insight delivers, not what clients buy.
        </>
      }
      aside={<TypeBadge category="service" />}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((s) => (
          <ServiceCard key={s.id} id={s.id} detail={detail} selected={selected === s.id} onSelect={() => setSelected(s.id)} />
        ))}
      </div>
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? serviceById[selected].name : ''}
        eyebrow={selected && <TypeBadge category="service" />}
        width={500}
      >
        {selected && <ServiceDetail id={selected} />}
      </Drawer>
    </Section>
  );
}

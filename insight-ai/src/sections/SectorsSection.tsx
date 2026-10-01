import { AnimatePresence, motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { playById } from '../data/plays';
import { sectorById, sectors } from '../data/sectors';
import type { SectorId } from '../data/types';
import { Icon } from '../components/Icon';
import { Section } from '../components/Section';
import { ServiceTag } from '../components/Tags';
import { Term } from '../components/Term';
import { TypeBadge } from '../components/TypeBadge';
import { OperatingSystemDiagram } from '../diagrams/OperatingSystemDiagram';
import { useDetail } from '../hooks/useAppState';
import { useClient } from '../hooks/useClient';
import { cn } from '../utils/cn';

export function SectorTabs({ active, onChange }: { active: SectorId; onChange: (id: SectorId) => void }) {
  return (
    <div role="tablist" aria-label="Industry overlays" className="flex flex-wrap gap-1.5">
      {sectors.map((s) => {
        const on = s.id === active;
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(s.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13.5px] font-medium transition',
              on ? 'border-teal bg-teal text-white shadow-card' : 'border-line bg-surface text-ink-2 hover:border-teal/40 hover:text-ink',
            )}
          >
            <Icon name={s.icon} className="size-4" />
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

export function SectorBrief({ id, compact }: { id: SectorId; compact?: boolean }) {
  const detail = useDetail();
  const s = sectorById[id];
  return (
    <AnimatePresence mode="wait">
      <motion.div key={id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
        <p className={cn('font-serif leading-snug text-ink italic', compact ? 'text-[18px]' : 'text-[20px]')}>{s.framing}</p>
        <div className="mt-5">
          <div className="eyebrow mb-2">Sector domains</div>
          <div className="flex flex-wrap gap-1.5">
            {s.domains.map((d) => (
              <span key={d} className="rounded-md border border-teal/25 bg-teal-soft px-2 py-1 text-[12.5px] font-medium text-ink">
                {d}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-5">
          <div className="eyebrow mb-2">Example propositions</div>
          <ul className="space-y-1.5">
            {s.examples.map((e) => (
              <li key={e.name} className="text-[13.5px] leading-snug">
                <span className="font-semibold text-ink">{e.name}</span>
                {detail && <span className="text-ink-3"> · {e.description}</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-5 rounded-lg border border-purple/20 bg-purple-soft/50 px-3 py-2.5">
          <div className="text-[10.5px] font-semibold tracking-[0.14em] text-purple uppercase">AI Control emphasis</div>
          <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{s.controlEmphasis}</p>
        </div>
        {!compact && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <div className="eyebrow mb-2">Typical lead plays</div>
              <div className="space-y-1 text-[13px] text-ink-2">
                {s.leadPlays.map((p) => (
                  <div key={p}>
                    <span className="font-mono text-[11px] font-semibold text-copper">PLAY {playById[p].number}</span> {playById[p].name}
                  </div>
                ))}
              </div>
            </div>
            {detail && (
              <div>
                <div className="eyebrow mb-2">Typical lead services</div>
                <div className="flex flex-wrap gap-1.5">
                  {s.leadServices.map((x) => (
                    <ServiceTag key={x} id={x} short />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function UnchangedStrip() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-[12px] text-ink-3">
      <span className="flex items-center gap-1.5 font-semibold text-ink-2">
        <Lock className="size-3.5" /> Unchanged in every sector
      </span>
      <span>Operating-system layers</span>
      <span>·</span>
      <span>AI Control domains</span>
      <span>·</span>
      <span>Six services</span>
      <span>·</span>
      <span>Capabilities</span>
      <span>·</span>
      <span>Accelerators</span>
      <span>·</span>
      <span>Foundations</span>
    </div>
  );
}

export function SectorsSection() {
  const { session } = useClient();
  const [active, setActive] = useState<SectorId>(session.sector ?? 'government');
  return (
    <Section
      id="sectors"
      number="09"
      eyebrow="Industry overlays"
      title="Same architecture. Sector-specific application."
      lead={
        <>
          Each sector proposition is an <Term id="industry-overlay" /> on the common Insight AI architecture. Switch sectors:
          the layers stay fixed, and only the sector context changes.
        </>
      }
      aside={<TypeBadge category="industry" />}
    >
      <div className="mb-6 flex flex-col gap-3">
        <SectorTabs active={active} onChange={setActive} />
        <UnchangedStrip />
      </div>
      <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div role="tabpanel" aria-label={`${sectorById[active].name} overlay`}>
          <SectorBrief id={active} />
        </div>
        <OperatingSystemDiagram overlay={sectorById[active]} />
      </div>
    </Section>
  );
}

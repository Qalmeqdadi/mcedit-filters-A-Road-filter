import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { stageById, stages } from '../data/journey';
import type { StageId } from '../data/types';
import { Section } from '../components/Section';
import { AcceleratorTag, CapabilityTag, PlainList, ServiceTag } from '../components/Tags';
import { LifecycleBand } from '../diagrams/LifecycleBand';
import { useDetail } from '../hooks/useAppState';
import { cn } from '../utils/cn';

export function StagePanel({ id, compact }: { id: StageId; compact?: boolean }) {
  const detail = useDetail();
  const s = stageById[id];
  const caps = compact || !detail ? s.capabilities.slice(0, 5) : s.capabilities;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22 }}
        className="card overflow-hidden"
      >
        <div className={cn('flex flex-wrap items-start justify-between gap-4 border-b border-line-soft', compact ? 'px-5 py-4' : 'px-6 py-5')}>
          <div className="max-w-2xl">
            <div className="font-mono text-[12px] font-semibold text-magenta">STAGE {s.number}</div>
            <h3 className={cn('mt-1 font-semibold tracking-tight text-ink', compact ? 'text-[22px]' : 'text-[26px]')}>{s.name}</h3>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{s.summary}</p>
          </div>
          <div className="max-w-sm rounded-lg border border-purple/20 bg-purple-soft/60 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-purple uppercase">
              <ShieldCheck className="size-3.5" /> AI Control at this stage{s.gate ? ` · ${s.gate}` : ''}
            </div>
            <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{s.controlRole}</p>
          </div>
        </div>
        <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-4', compact ? 'px-5 py-4' : 'px-6 py-5')}>
          <Col label="Relevant services" tone="text-magenta">
            <div className="flex flex-col items-start gap-1.5">
              {s.services.map((x) => (
                <ServiceTag key={x} id={x} short />
              ))}
            </div>
          </Col>
          <Col label="Capabilities" tone="text-navy">
            <div className="flex flex-wrap gap-1.5">
              {caps.map((c) => (
                <CapabilityTag key={c} id={c} />
              ))}
              {caps.length < s.capabilities.length && (
                <span className="px-1 py-1 text-[12px] font-medium text-ink-3">+{s.capabilities.length - caps.length} more</span>
              )}
            </div>
          </Col>
          <Col label="Accelerators" tone="text-purple">
            <div className="flex flex-wrap gap-1.5">
              {s.accelerators.map((a) => (
                <AcceleratorTag key={a} id={a} />
              ))}
            </div>
          </Col>
          <Col label="Client outputs" tone="text-ink">
            <PlainList items={s.outputs} />
          </Col>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Col({ label, tone, children }: { label: string; tone: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={cn('mb-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase', tone)}>{label}</div>
      {children}
    </div>
  );
}

export function JourneySection() {
  const detail = useDetail();
  const [active, setActive] = useState<StageId>('understand');
  const idx = stages.findIndex((s) => s.id === active);
  return (
    <Section
      id="journey"
      number="11"
      eyebrow="Client transformation journey"
      title="From ambition to realised value"
      lead="Eight stages, each with the services, capabilities, accelerators and outputs that apply. Select a stage."
    >
      <LifecycleBand active={active} onSelect={setActive} showItems={detail} />
      <div className="mt-6">
        <StagePanel id={active} />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setActive(stages[Math.max(0, idx - 1)].id)}
          disabled={idx === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition hover:text-ink disabled:opacity-40"
        >
          <ChevronLeft className="size-4" /> Previous stage
        </button>
        <span className="text-[12.5px] text-ink-3 tabular-nums">
          {idx + 1} of {stages.length}
        </span>
        <button
          onClick={() => setActive(stages[Math.min(stages.length - 1, idx + 1)].id)}
          disabled={idx === stages.length - 1}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition hover:text-ink disabled:opacity-40"
        >
          Next stage <ChevronRight className="size-4" />
        </button>
      </div>
    </Section>
  );
}

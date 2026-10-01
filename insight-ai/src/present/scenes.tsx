import { useState, type ReactNode } from 'react';
import { acceleratorById } from '../data/accelerators';
import { brand } from '../data/brand';
import { controlHeadline } from '../data/control';
import { positioning } from '../data/positioning';
import { sectorById } from '../data/sectors';
import { serviceById, services } from '../data/services';
import { categories } from '../data/taxonomy';
import type { AcceleratorFilter, AcceleratorId, ControlDomainId, PlayId, SectorId, ServiceId, StageId } from '../data/types';
import { BrandMark } from '../components/BrandMark';
import { Drawer } from '../components/Drawer';
import { Icon } from '../components/Icon';
import { TypeBadge } from '../components/TypeBadge';
import { WorkedExample } from '../components/WorkedExample';
import { ArchitectureExplorer } from '../diagrams/ArchitectureExplorer';
import { ControlDomainGrid, ControlDualRole, RuntimeStates } from '../diagrams/ControlDiagrams';
import { LifecycleBand } from '../diagrams/LifecycleBand';
import { OperatingSystemDiagram } from '../diagrams/OperatingSystemDiagram';
import { PlayFlow } from '../diagrams/PlayFlow';
import { AcceleratorDetail, AcceleratorFilters, AcceleratorGrid } from '../sections/AcceleratorsSection';
import { CapabilityExplorer } from '../sections/CapabilitiesSection';
import { StagePanel } from '../sections/JourneySection';
import { CompetitorGrid, IntegratedPosition } from '../sections/LandscapeSection';
import { LensFilter, OutcomeGrid } from '../sections/OutcomesSection';
import { PlayTabs } from '../sections/PlaysSection';
import { SectorBrief, SectorTabs, UnchangedStrip } from '../sections/SectorsSection';
import { ServiceCard, ServiceDetail } from '../sections/ServicesSection';
import { useDetail } from '../hooks/useAppState';
import { useClient } from '../hooks/useClient';
import { sessionPlay } from '../utils/workshop';
import { MaturityInsights, MaturityScorer } from '../sections/MaturitySection';
import { RoadmapColumns, UseCaseEditor } from '../sections/PrioritiserSection';
import { SummaryDocument } from '../sections/SummarySection';
import { PriorityMatrix } from '../diagrams/PriorityMatrix';
import { rankedUseCases } from '../utils/workshop';
import { categoryStyle } from '../utils/categoryStyle';
import { cn } from '../utils/cn';

export interface Scene {
  id: string;
  section: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  Body: () => ReactNode;
  dense?: boolean;
}

/** Shared scene frame inside the 1600×900 stage. */
export function SceneFrame({ scene, index }: { scene: Scene; index: number }) {
  const { Body } = scene;
  return (
    <div className={cn('flex h-full flex-col', scene.dense ? 'px-16 pt-9' : 'px-[72px] pt-12')}>
      {scene.title && (
        <header className={cn('shrink-0', scene.dense ? 'mb-4' : 'mb-7')}>
          <div className="eyebrow mb-2.5 flex items-center gap-3">
            <span className="font-mono text-magenta">{String(index + 1).padStart(2, '0')}</span>
            <span className="h-px w-8 bg-line" />
            {scene.section}
          </div>
          <h2 className={cn('leading-[1.05] font-semibold tracking-[-0.025em] text-ink', scene.dense ? 'text-[34px]' : 'text-[42px]')}>
            {scene.title}
          </h2>
          {scene.subtitle && <p className="mt-2.5 max-w-[1100px] text-[17px] leading-snug text-ink-3">{scene.subtitle}</p>}
        </header>
      )}
      <div className="min-h-0 flex-1">
        <Body />
      </div>
    </div>
  );
}

function TitleScene() {
  const { session, active } = useClient();
  return (
    <div className="relative flex h-full flex-col justify-center overflow-hidden">
      <div aria-hidden className="hairline-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_20%_30%,black_5%,transparent_65%)]" />
      <div aria-hidden className="absolute top-[-120px] right-[-60px] h-[640px] w-[760px] rounded-full bg-[radial-gradient(closest-side,rgba(107,43,217,0.12),transparent)]" />
      <div aria-hidden className="absolute right-[260px] bottom-[-120px] h-[480px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(212,0,111,0.10),transparent)]" />
      <div className="relative">
        <BrandMark size="hero" />
        <h1 className="mt-10 text-[112px] leading-[0.98] font-semibold tracking-[-0.04em] text-ink">
          AI Transformation.
          <br />
          <span className="text-control-gradient">Built to Operate.</span>
        </h1>
        <p className="mt-12 max-w-[980px] text-[28px] leading-[1.4] text-ink-2">{positioning.primary}</p>
        {active && (
          <p className="mt-10 inline-flex items-center gap-3 rounded-full border border-magenta/25 bg-magenta-soft/70 px-5 py-2.5 text-[20px] text-ink">
            <span className="font-semibold tracking-[0.14em] text-magenta uppercase">Prepared for</span>
            <span className="font-semibold">{session.name || 'Client'}</span>
            {session.sector && <span className="text-ink-3">· {sectorById[session.sector].name}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function PropositionScene() {
  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-12">
      <blockquote className="border-l-[3px] border-magenta pl-8 font-serif text-[52px] leading-[1.15] text-ink italic">
        {positioning.secondary[0]}
        <br />
        {positioning.secondary[1]}
      </blockquote>
      <div className="grid grid-cols-3 gap-6 self-start">
        {positioning.principles.map((p) => (
          <div key={p.title} className="card p-7">
            <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-mist text-ink">
              <Icon name={p.icon} className="size-5" />
            </div>
            <h3 className="text-[22px] font-semibold tracking-tight text-ink">{p.title}</h3>
            <p className="mt-2 text-[16px] leading-relaxed text-ink-3">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesScene() {
  return (
    <div className="space-y-5">
    <div className="grid grid-cols-7 gap-3">
      {categories.map((c) => {
        const s = categoryStyle[c.id];
        return (
          <div key={c.id} className="card relative flex flex-col overflow-hidden p-5">
            <span className={cn('absolute inset-x-0 top-0 h-1', s.dot)} />
            <div className={cn('mb-4 flex size-10 items-center justify-center rounded-lg', s.soft, s.text)}>
              <Icon name={c.icon} className="size-5" />
            </div>
            <div className={cn('text-[12px] font-semibold tracking-[0.12em] uppercase', s.text)}>{c.label}</div>
            <div className="mt-1.5 text-[18px] leading-snug font-semibold tracking-tight text-ink">{c.short}</div>
            <p className="mt-3 text-[13.5px] leading-snug text-ink-3">{c.definition}</p>
            <p className="mt-auto border-t border-line-soft pt-3 text-[13px] leading-snug font-medium text-ink-2">{c.rule}</p>
          </div>
        );
      })}
    </div>
    <WorkedExample large />
    </div>
  );
}

function ServicesScene() {
  const [sel, setSel] = useState<ServiceId | null>(null);
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {services.map((s) => (
          <ServiceCard key={s.id} id={s.id} compact selected={sel === s.id} onSelect={() => setSel(s.id)} />
        ))}
      </div>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? serviceById[sel].name : ''} eyebrow={<TypeBadge category="service" />} width={500}>
        {sel && <ServiceDetail id={sel} />}
      </Drawer>
    </>
  );
}

function ControlRolesScene() {
  return (
    <div className="space-y-8">
      <ControlDualRole />
      <RuntimeStates compact />
    </div>
  );
}

function ControlDomainsScene() {
  const [sel, setSel] = useState<ControlDomainId | null>('authority');
  return <ControlDomainGrid selected={sel} onSelect={(id) => setSel((c) => (c === id ? null : id))} compact />;
}

function AcceleratorsScene() {
  const [filter, setFilter] = useState<AcceleratorFilter | null>(null);
  const [sel, setSel] = useState<AcceleratorId | null>(null);
  return (
    <>
      <div className="mb-5">
        <AcceleratorFilters filter={filter} onChange={setFilter} />
      </div>
      <AcceleratorGrid filter={filter} onSelect={setSel} selected={sel} compact />
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? acceleratorById[sel].name : ''} eyebrow={<TypeBadge category="accelerator" />}>
        {sel && <AcceleratorDetail id={sel} />}
      </Drawer>
    </>
  );
}

function PlaysScene() {
  const detail = useDetail();
  const { session, active } = useClient();
  const [p, setP] = useState<PlayId>(active ? sessionPlay(session).id : 'p01');
  return (
    <div className="space-y-5">
      <PlayTabs active={p} onChange={setP} compact />
      <PlayFlow id={p} compact detail={detail} />
    </div>
  );
}

function SectorsScene() {
  const { session } = useClient();
  const [s, setS] = useState<SectorId>(session.sector ?? 'government');
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <SectorTabs active={s} onChange={setS} />
      </div>
      <div className="grid min-h-0 grid-cols-[400px_1fr] gap-8">
        <div>
          <SectorBrief id={s} compact />
          <div className="mt-5">
            <UnchangedStrip />
          </div>
        </div>
        <OperatingSystemDiagram overlay={sectorById[s]} compact />
      </div>
    </div>
  );
}

function LandscapeScene() {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="space-y-8">
      <CompetitorGrid selected={sel} onSelect={setSel} compact />
      <IntegratedPosition compact />
    </div>
  );
}

function JourneyScene() {
  const [s, setS] = useState<StageId>('understand');
  return (
    <div className="space-y-5">
      <LifecycleBand active={s} onSelect={setS} />
      <StagePanel id={s} compact />
    </div>
  );
}

function OutcomesScene() {
  const [lens, setLens] = useState<string | null>(null);
  return (
    <>
      <div className="mb-5">
        <LensFilter lens={lens} onChange={setLens} />
      </div>
      <OutcomeGrid lens={lens} compact />
    </>
  );
}

function MaturityScene() {
  return (
    <div className="grid h-full grid-cols-[1fr_400px] gap-8">
      <div className="min-h-0 overflow-y-auto pr-1">
        <MaturityScorer compact />
      </div>
      <div className="min-h-0 overflow-y-auto pr-1">
        <MaturityInsights compact />
      </div>
    </div>
  );
}

function PrioritiserScene() {
  const { session } = useClient();
  return (
    <div className="grid h-full grid-cols-[1fr_380px] gap-8">
      <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
        <UseCaseEditor compact />
        <RoadmapColumns compact />
      </div>
      <div className="card self-start p-4">
        <PriorityMatrix items={rankedUseCases(session)} size={360} />
      </div>
    </div>
  );
}

function SummaryScene() {
  return (
    <div className="h-full overflow-y-auto pr-1">
      <SummaryDocument compact />
    </div>
  );
}

function CloseScene() {
  return (
    <div className="relative -mx-[72px] -mt-12 flex h-[calc(100%+48px)] items-center overflow-hidden bg-ink px-[72px] text-white">
      <div aria-hidden className="absolute -top-40 -right-20 size-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(212,0,111,0.38),transparent)]" />
      <div aria-hidden className="absolute -bottom-48 left-[30%] size-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(107,43,217,0.38),transparent)]" />
      <div className="relative grid w-full grid-cols-[1.15fr_1fr] gap-20">
        <div>
          <div className="text-[16px] font-semibold tracking-[0.3em] text-white/60 uppercase">{brand.name}</div>
          <p className="mt-6 font-serif text-[54px] leading-[1.12] italic">
            {positioning.secondary[0]}
            <br />
            {positioning.secondary[1]}
          </p>
          <p className="mt-10 text-[22px] font-medium text-white/80">{brand.line}</p>
        </div>
        <div className="self-center">
          <div className="mb-4 text-[13px] font-semibold tracking-[0.2em] text-white/60 uppercase">Where to start: six entry offers</div>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {services.map((s) => (
              <li key={s.id} className="flex items-baseline gap-4 py-3.5">
                <span className="font-mono text-[13px] font-semibold text-[#ff6fb4]">S{s.number}</span>
                <span className="text-[19px] font-medium">{s.entry}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export const scenes: Scene[] = [
  { id: 'title', section: 'Executive Overview', Body: TitleScene },
  { id: 'proposition', section: 'Executive Overview', title: 'The proposition', Body: PropositionScene },
  {
    id: 'transformation',
    section: 'Executive Overview',
    title: 'Eight stages. One control system across all of them.',
    subtitle: 'The core transformation, from understanding to realised value, with AI Control spanning the lifecycle.',
    Body: () => <LifecycleBand showItems size="lg" />,
  },
  {
    id: 'categories',
    section: 'Executive Overview',
    title: 'How to read the architecture: seven categories, never mixed',
    Body: CategoriesScene,
  },
  {
    id: 'architecture-simple',
    section: 'Master AI GTM Architecture',
    title: 'One architecture, read top to bottom',
    dense: true,
    Body: () => <ArchitectureExplorer variant="present" initialSimplified />,
  },
  {
    id: 'architecture',
    section: 'Master AI GTM Architecture',
    title: 'Every element connected',
    dense: true,
    Body: () => <ArchitectureExplorer variant="present" />,
  },
  {
    id: 'services',
    section: 'Service Portfolio',
    title: 'Six services. What clients buy.',
    subtitle: 'Each answers one executive question and starts with a defined entry offer. Select a service for detail.',
    Body: ServicesScene,
    dense: true,
  },
  {
    id: 'os',
    section: 'Human + AI Operating System',
    title: 'The Human + AI Operating System',
    subtitle: 'Five layers where people, processes, data and agents work as one system, wrapped by AI Control.',
    Body: () => <OperatingSystemDiagram compact />,
    dense: true,
  },
  {
    id: 'control-roles',
    section: 'AI Control',
    title: (
      <>
        <span className="text-control-gradient">{controlHeadline.title}.</span> {controlHeadline.line}
      </>
    ),
    Body: ControlRolesScene,
    dense: true,
  },
  {
    id: 'control-domains',
    section: 'AI Control',
    title: 'Eight control domains',
    subtitle: 'Select a domain: purpose, example controls, evidence produced and human accountability.',
    Body: ControlDomainsScene,
    dense: true,
  },
  {
    id: 'capabilities',
    section: 'Delivery Capabilities',
    title: 'How Insight delivers',
    subtitle: 'Select a capability to light up every service offering that consumes it.',
    Body: () => <CapabilityExplorer compact />,
    dense: true,
  },
  {
    id: 'accelerators',
    section: 'Insight Accelerators',
    title: 'What makes delivery faster and better',
    Body: AcceleratorsScene,
    dense: true,
  },
  { id: 'plays', section: 'Go-to-Market Plays', title: 'Six ways Insight lands and expands', Body: PlaysScene, dense: true },
  {
    id: 'sectors',
    section: 'Industry Overlays',
    title: 'Same architecture. Sector-specific application.',
    Body: SectorsScene,
    dense: true,
  },
  {
    id: 'landscape',
    section: 'Competitive Landscape',
    title: 'A neutral view of market archetypes',
    subtitle: 'Archetypes summarise publicly emphasised positioning. All firms operate more broadly. Not a ranking.',
    Body: LandscapeScene,
    dense: true,
  },
  {
    id: 'journey',
    section: 'Client Transformation Journey',
    title: 'From ambition to realised value',
    Body: JourneyScene,
    dense: true,
  },
  {
    id: 'outcomes',
    section: 'Outcomes',
    title: 'What clients get',
    subtitle: 'Concrete outcomes, each demonstrated by evidence. Targets are set against each client’s own baseline.',
    Body: OutcomesScene,
    dense: true,
  },
  {
    id: 'maturity',
    section: 'Client Workshop',
    title: 'AI maturity self-check',
    subtitle: 'Score each dimension with the client, 1 (ad hoc) to 5 (optimised), against an agreed target.',
    Body: MaturityScene,
    dense: true,
  },
  {
    id: 'prioritiser',
    section: 'Client Workshop',
    title: 'Use-case prioritiser',
    subtitle: 'Score value and readiness together; the ranking becomes a Now / Next / Later roadmap.',
    Body: PrioritiserScene,
    dense: true,
  },
  { id: 'summary', section: 'Client Workshop', Body: SummaryScene, dense: true },
  { id: 'close', section: 'Outcomes', Body: CloseScene },
];

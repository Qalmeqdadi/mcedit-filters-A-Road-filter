import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { accelerators } from '../data/accelerators';
import { brand } from '../data/brand';
import { capabilityGroups } from '../data/capabilities';
import { controlDomains } from '../data/control';
import { plays } from '../data/plays';
import { positioning } from '../data/positioning';
import { sectors } from '../data/sectors';
import { services } from '../data/services';
import { categories } from '../data/taxonomy';
import { Icon } from '../components/Icon';
import { Term } from '../components/Term';
import { WorkedExample } from '../components/WorkedExample';
import { useDetail } from '../hooks/useAppState';
import { useClient } from '../hooks/useClient';
import { sectorById } from '../data/sectors';
import { LifecycleBand } from '../diagrams/LifecycleBand';
import { categoryStyle } from '../utils/categoryStyle';
import { cn } from '../utils/cn';

const glance = [
  { n: services.length, label: 'Service offerings', note: 'What clients buy', section: 'services' },
  { n: capabilityGroups.length, label: 'Capability groups', note: 'How Insight delivers', section: 'capabilities' },
  { n: accelerators.length, label: 'Accelerators / IP', note: 'What makes delivery faster', section: 'accelerators' },
  { n: controlDomains.length, label: 'AI Control domains', note: 'Know, decide and do', section: 'ai-control' },
  { n: plays.length, label: 'GTM plays', note: 'How we land and expand', section: 'plays' },
  { n: sectors.length, label: 'Industry overlays', note: 'One common architecture', section: 'sectors' },
];

export function OverviewSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const detail = useDetail();
  const { session, active } = useClient();
  return (
    <section id="overview" aria-labelledby="overview-title" className="relative overflow-hidden">
      <div aria-hidden className="hairline-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_30%_0%,black_10%,transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(107,43,217,0.10),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute top-10 right-[18%] h-[380px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(212,0,111,0.08),transparent)]" />

      <div className="relative mx-auto max-w-[1360px] px-4 pt-10 pb-14 sm:px-6 md:pt-14 lg:px-10">
        <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-14">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="eyebrow mb-6 flex items-center gap-3">
              <span className="font-mono text-magenta">01</span>
              <span className="h-px w-8 bg-line" />
              {positioning.eyebrow}
            </div>
            <p className="mb-3 text-[15px] font-semibold tracking-[0.28em] text-ink uppercase">{brand.name}</p>
            {active && (
              <p className="mb-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-magenta/25 bg-magenta-soft/70 px-3.5 py-1.5 text-[13px] text-ink">
                <span className="font-semibold tracking-[0.12em] text-magenta uppercase">Prepared for</span>
                <span className="font-semibold">{session.name || 'Client'}</span>
                {session.sector && <span className="text-ink-3">· {sectorById[session.sector].name}</span>}
              </p>
            )}
            <h1 id="overview-title" className="text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] text-ink sm:text-[60px] lg:text-[76px]">
              AI Transformation.
              <br />
              <span className="text-control-gradient">Built to Operate.</span>
            </h1>
            <p className="mt-8 max-w-[680px] text-[19px] leading-[1.5] text-ink-2 md:text-[21px]">
              Insight transforms existing enterprise technology into governed{' '}
              <Term id="human-ai-os">Human + AI operations</Term> that deliver measurable value.
            </p>
            <blockquote className="mt-8 max-w-[620px] border-l-2 border-magenta pl-5 font-serif text-[20px] leading-snug text-ink italic md:text-[22px]">
              {positioning.secondary[0]}
              <br />
              {positioning.secondary[1]}
            </blockquote>
            <div className="mt-10 flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('architecture')}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-ink-2"
              >
                Explore the architecture <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() => onNavigate('services')}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink transition hover:border-ink-4"
              >
                See the six services
              </button>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="card self-start p-6"
            aria-label="At a glance"
          >
            <div className="eyebrow mb-4">The architecture at a glance</div>
            <ul className="divide-y divide-line-soft">
              {glance.map((g) => (
                <li key={g.label}>
                  <button
                    onClick={() => onNavigate(g.section)}
                    className="group flex w-full items-center gap-4 py-3 text-left"
                  >
                    <span className="w-9 text-[28px] leading-none font-semibold tracking-tight text-ink tabular-nums">{g.n}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-ink">{g.label}</span>
                      <span className="block text-[12.5px] text-ink-3">{g.note}</span>
                    </span>
                    <ArrowRight className="size-4 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-magenta" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-line-soft pt-4 text-[12.5px] leading-snug text-ink-3">
              {positioning.audienceLine}
            </p>
          </motion.aside>
        </div>

        {/* Core transformation */}
        <div className="mt-20">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="eyebrow mb-2">The core transformation</div>
              <h2 className="text-[24px] font-semibold tracking-tight text-ink md:text-[28px]">
                Eight stages, one control system across all of them
              </h2>
            </div>
            <button onClick={() => onNavigate('journey')} className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-magenta hover:text-magenta-deep">
              Explore the client journey <ArrowRight className="size-4" />
            </button>
          </div>
          <LifecycleBand showItems={detail} />
        </div>

        {/* Principles */}
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {positioning.principles.map((p) => (
            <div key={p.title} className="card p-6">
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-mist text-ink">
                <Icon name={p.icon} className="size-5" />
              </div>
              <h3 className="text-[17px] font-semibold tracking-tight text-ink">{p.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">{p.body}</p>
            </div>
          ))}
        </div>

        {/* Information architecture */}
        <div className="mt-20">
          <div className="mb-6 max-w-3xl">
            <div className="eyebrow mb-2">How to read this architecture</div>
            <h2 className="text-[24px] font-semibold tracking-tight text-ink md:text-[28px]">Seven categories, never mixed</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-3">
              Every element in this application belongs to exactly one category, with its own colour throughout. A service is
              what clients buy; a capability is how Insight delivers it; an accelerator makes delivery faster or better.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {categories.map((c) => {
              const s = categoryStyle[c.id];
              return (
                <div key={c.id} className="card relative overflow-hidden p-4">
                  <span className={cn('absolute inset-x-0 top-0 h-[3px]', s.dot)} />
                  <div className={cn('mb-3 flex size-8 items-center justify-center rounded-lg', s.soft, s.text)}>
                    <Icon name={c.icon} className="size-4" />
                  </div>
                  <div className={cn('text-[11px] font-semibold tracking-[0.12em] uppercase', s.text)}>{c.label}</div>
                  <div className="mt-1 text-[15px] leading-snug font-semibold tracking-tight text-ink">{c.short}</div>
                  {detail && (
                    <>
                      <p className="mt-2 text-[12.5px] leading-snug text-ink-3">{c.definition}</p>
                      <p className="mt-2 border-t border-line-soft pt-2 text-[12px] leading-snug font-medium text-ink-2">{c.rule}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <WorkedExample />
          </div>
        </div>
      </div>
    </section>
  );
}

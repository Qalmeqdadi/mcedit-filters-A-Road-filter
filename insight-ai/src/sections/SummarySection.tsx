import { Check, Copy, Pencil, Printer } from 'lucide-react';
import { useState } from 'react';
import { BrandMark } from '../components/BrandMark';
import { ClientSetup } from '../components/ClientSetup';
import { acceleratorById } from '../data/accelerators';
import { brand } from '../data/brand';
import { plays } from '../data/plays';
import { sectorById } from '../data/sectors';
import { serviceById } from '../data/services';
import type { PlayId } from '../data/types';
import { maturityDimensions, quadrants } from '../data/workshop';
import { RadarChart } from '../diagrams/RadarChart';
import { useClient, type ClientSession } from '../hooks/useClient';
import { cn } from '../utils/cn';
import { gaps, progress, rankedUseCases, recommendation, roadmap, scoredCount, sessionPlay, stageName, weakestPractices } from '../utils/workshop';
import { stageUsesAi } from '../data/assessment';

const formatDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Next steps derived only from what was captured in the session. */
export function nextSteps(session: ClientSession): string[] {
  const play = sessionPlay(session);
  const landService = serviceById[play.land.service];
  const ranked = rankedUseCases(session);
  const lighthouse = ranked.find((u) => u.quadrant === 'lighthouse');
  const topGap = gaps(session)[0];
  const highRisk = ranked.filter((u) => u.risk === 'High');
  const steps = [`Agree the entry offer: ${play.land.label} (Service ${landService.number}).`];
  if (lighthouse) steps.push(`Scope “${lighthouse.name}” as the Lighthouse PoV.`);
  else if (ranked.length) steps.push('Validate value and readiness scores for the top-ranked use cases.');
  else steps.push('Capture and score the client’s priority use cases.');
  if (session.aiStage && !stageUsesAi(session.aiStage)) {
    steps.push('Put AI Control foundations in place before the first deployment: acceptable-use policy, approved tools and a risk assessment for each use case.');
  }
  if (topGap) {
    const acc = topGap.dimension.accelerator ? `, using ${acceleratorById[topGap.dimension.accelerator].name}` : '';
    steps.push(`Close the ${topGap.dimension.name} gap (${topGap.score!.toFixed(1)} → ${topGap.target}) through ${serviceById[topGap.dimension.service].shortName}${acc}.`);
  } else {
    steps.push('Complete the AI maturity self-check to baseline readiness and control.');
  }
  if (highRisk.length) steps.push(`Run an AI Control design gate for ${highRisk.map((u) => `“${u.name}”`).join(', ')} before any PoV.`);
  steps.push(`Confirm sponsors: ${play.sponsors.join(', ')}.`);
  return steps;
}

export function summaryText(session: ClientSession) {
  const play = sessionPlay(session);
  const lines = [
    `${brand.name} · Client summary`,
    `Prepared for: ${session.name || 'Client'}${session.sector ? ` (${sectorById[session.sector].name})` : ''}${session.date ? ` · ${formatDate(session.date)}` : ''}`,
    '',
    `Lead play: Play ${play.number} · ${play.name}`,
    `Trigger: ${play.trigger}`,
    `Entry offer: ${play.land.label}`,
    '',
    `Maturity self-check: AI stage ${stageName(session) ?? 'not set'}; ${progress(session).answered}/${progress(session).total} questions answered`,
    ...gaps(session).slice(0, 5).map((g) => `- ${g.dimension.name}: ${g.score!.toFixed(1)} → ${g.target}`),
    ...(weakestPractices(session, 5).length ? ['Weakest practices:', ...weakestPractices(session, 5).map((w) => `- ${w.question.text} (${w.score})`)] : []),
    '',
    'Prioritised use cases',
    ...rankedUseCases(session).map((u) => `${u.rank}. ${u.name} (value ${u.value}, readiness ${u.readiness}, ${u.risk} risk) · ${quadrants[u.quadrant].name}`),
    '',
    'Roadmap',
    ...roadmap(session).map((c) => `${c.horizon}: ${c.items.map((u) => u.name).join('; ') || '-'}`),
    '',
    'Next steps',
    ...nextSteps(session).map((s, i) => `${i + 1}. ${s}`),
  ];
  if (session.notes.trim()) lines.push('', 'Notes', session.notes.trim());
  return lines.join('\n');
}

function Block({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('break-inside-avoid rounded-xl border border-line-soft bg-surface p-4 print:p-3', className)}>
      <h3 className="mb-2.5 text-[11px] font-bold tracking-[0.14em] text-ink-3 uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** The printable one-page summary. */
export function SummaryDocument({ compact }: { compact?: boolean }) {
  const { session, update } = useClient();
  const play = sessionPlay(session);
  const rec = recommendation(session);
  const top = gaps(session).slice(0, 4);
  const ranked = rankedUseCases(session);
  const steps = nextSteps(session);
  const sector = session.sector ? sectorById[session.sector] : null;

  return (
    <article className="summary-doc space-y-3 print:space-y-2" aria-label="Client summary">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-3 print:pb-2">
        <div>
          <BrandMark size={compact ? 'md' : 'lg'} />
          <h2 className={cn('mt-3 font-semibold tracking-tight text-ink print:mt-2 print:text-[24px]', compact ? 'text-[24px]' : 'text-[28px]')}>
            {session.name ? `${session.name}: AI transformation summary` : 'AI transformation summary'}
          </h2>
        </div>
        <div className="text-right text-[12.5px] leading-snug text-ink-3">
          {sector && <div className="font-semibold text-ink">{sector.name}</div>}
          {session.date && <div>{formatDate(session.date)}</div>}
          <div>{brand.line}</div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-[1.1fr_1fr] print:grid-cols-[1.1fr_1fr]">
        <Block title="Lead play and entry offer">
          <div className="text-[12px] font-semibold text-copper">PLAY {play.number}</div>
          <div className="text-[18px] leading-snug font-semibold text-ink">{play.name}</div>
          <p className="mt-1 font-serif text-[14.5px] text-ink-2 italic">“{play.trigger}”</p>
          <div className="mt-3 rounded-lg border border-magenta/20 bg-magenta-soft/60 px-3 py-2">
            <div className="text-[10.5px] font-semibold tracking-[0.14em] text-magenta uppercase">Entry offer · S{serviceById[play.land.service].number}</div>
            <div className="text-[14.5px] font-semibold text-ink">{play.land.label}</div>
          </div>
          <div className="mt-2 text-[12.5px] text-ink-3">Expands to: {play.expand.map((e) => e.label).join(' · ')}</div>
          {rec && rec.play.id !== play.id && (
            <div className="mt-2 text-[12.5px] text-ink-3">
              The self-check points to Play {rec.play.number} ({rec.play.name}) as an alternative starting point.
            </div>
          )}
        </Block>

        <Block title={`Maturity self-check${session.aiStage ? ` · AI stage: ${stageName(session)}` : ''} · ${scoredCount(session)} of ${maturityDimensions.length} areas`}>
          {scoredCount(session) ? (
            <div className="grid grid-cols-[250px_1fr] items-center gap-3">
              <RadarChart session={session} size={300} showLegend={false} />
              <div>
                <div className="mb-1.5 text-[11.5px] font-semibold text-ink-2">Biggest gaps (now → target)</div>
                {top.length ? (
                  <ul className="space-y-1">
                    {top.map((g) => (
                      <li key={g.dimension.id} className="flex justify-between gap-2 text-[12.5px] text-ink">
                        <span>{g.dimension.name}</span>
                        <span className="tabular-nums text-ink-3">{g.score!.toFixed(1)} → {g.target}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12.5px] text-ink-3">All scored dimensions are at or above target.</p>
                )}
                <div className="mt-2 flex gap-3 text-[11px] text-ink-3">
                  <span className="flex items-center gap-1"><span className="h-[3px] w-4 bg-magenta" /> Now</span>
                  <span className="flex items-center gap-1"><span className="h-0 w-4 border-t-2 border-dashed border-purple" /> Target</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-ink-3">Not yet completed.</p>
          )}
        </Block>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.1fr_1fr] print:grid-cols-[1.1fr_1fr]">
        <Block title="Prioritised use cases">
          {ranked.length ? (
            <ol className="space-y-1.5">
              {ranked.slice(0, compact ? 5 : 8).map((u) => (
                <li key={u.id} className="flex items-start justify-between gap-3 text-[13px]">
                  <span className="flex items-start gap-2 text-ink">
                    <span className="mt-[1px] flex size-5 shrink-0 items-center justify-center rounded-full bg-magenta text-[10px] font-bold text-white">{u.rank}</span>
                    <span>
                      {u.name}
                      {u.risk === 'High' && <span className="ml-1.5 text-[11px] font-semibold text-stop">! High risk</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-3">
                    V{u.value} · R{u.readiness} · {quadrants[u.quadrant].name}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[13px] text-ink-3">Not yet captured.</p>
          )}
        </Block>
        <Block title="Roadmap">
          <div className="grid grid-cols-3 gap-2">
            {roadmap(session).map((c) => (
              <div key={c.horizon}>
                <div className="mb-1 text-[11.5px] font-bold tracking-[0.1em] text-ink uppercase">{c.horizon}</div>
                {c.items.length ? (
                  <ul className="space-y-1 text-[12.5px] leading-snug text-ink-2">
                    {c.items.slice(0, 4).map((u) => <li key={u.id}>{u.rank}. {u.name}</li>)}
                  </ul>
                ) : (
                  <div className="text-[12px] text-ink-4">-</div>
                )}
              </div>
            ))}
          </div>
        </Block>
      </div>

      <Block title="Agreed next steps" className="border-magenta/25">
        <ol className="gap-x-8 md:columns-2 print:columns-2">
          {steps.map((s, i) => (
            <li key={s} className="mb-1.5 flex break-inside-avoid gap-2.5 text-[13.5px] leading-snug text-ink">
              <span className="font-mono text-[12px] font-semibold text-magenta">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </Block>

      {!compact && (
        <Block title="Notes">
          <textarea
            value={session.notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Capture what the client said, decisions and owners…"
            rows={4}
            aria-label="Meeting notes"
            className="w-full resize-y rounded-lg border border-line bg-canvas px-3 py-2 text-[13.5px] leading-relaxed text-ink outline-none focus:border-purple print:hidden"
          />
          <p className="hidden text-[13px] leading-relaxed whitespace-pre-wrap text-ink print:block">{session.notes || '-'}</p>
        </Block>
      )}
      <p className="text-[11px] leading-snug text-ink-4">
        Scores and use cases were provided by the client during the session. Indicative self-assessment; not a formal Radius assessment.
      </p>
    </article>
  );
}

export function SummarySection() {
  const { session, update } = useClient();
  const [copied, setCopied] = useState(false);
  const [setup, setSetup] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText(session));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy the summary:', summaryText(session));
    }
  };

  return (
    <section id="summary" aria-labelledby="summary-title" className="pt-10 pb-14 md:pt-14 print:p-0">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-10 print:max-w-none print:px-0">
        <div className="mb-6 print:hidden">
          <div className="eyebrow mb-3 flex items-center gap-3">
            <span className="font-mono text-magenta">15</span>
            <span className="h-px w-8 bg-line" />
            <span>Client workshop</span>
          </div>
          <h2 id="summary-title" className="text-[32px] leading-[1.08] font-semibold tracking-[-0.022em] text-ink md:text-[42px]">
            Client summary
          </h2>
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-3">
            A one-page leave-behind built from this session: lead play, self-check, prioritised use cases, roadmap and next steps.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-2">
              <Printer className="size-4" /> Print / Save as PDF
            </button>
            <button onClick={copy} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink hover:border-ink-4">
              {copied ? <Check className="size-4 text-go" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy as text'}
            </button>
            <button onClick={() => setSetup(true)} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink hover:border-ink-4">
              <Pencil className="size-4" /> {session.name ? 'Edit client' : 'Set up client'}
            </button>
            <label className="ml-auto flex items-center gap-2 text-[12.5px] font-medium text-ink-3">
              Lead play
              <select
                value={sessionPlay(session).id}
                onChange={(e) => update({ play: e.target.value as PlayId })}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px] text-ink"
              >
                {plays.map((p) => (
                  <option key={p.id} value={p.id}>
                    Play {p.number}: {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <SummaryDocument />
      </div>
      <ClientSetup open={setup} onClose={() => setSetup(false)} />
    </section>
  );
}

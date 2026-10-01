import { ArrowRight, RotateCcw } from 'lucide-react';
import { maturityDimensions, maturityLevels } from '../data/workshop';
import { Section } from '../components/Section';
import { AcceleratorTag, ServiceTag } from '../components/Tags';
import { RadarChart } from '../diagrams/RadarChart';
import { useDetail } from '../hooks/useAppState';
import { useClient } from '../hooks/useClient';
import { cn } from '../utils/cn';
import { gaps, recommendation, scoredCount, targetFor } from '../utils/workshop';

/** Score each dimension 1–5 (now) and set a target. Reused in present mode. */
export function MaturityScorer({ compact }: { compact?: boolean }) {
  const detail = useDetail();
  const { session, update } = useClient();
  const setScore = (id: string, v: number) =>
    update({ scores: { ...session.scores, [id]: session.scores[id] === v ? null : v } });
  const setTarget = (id: string, v: number) => update({ targets: { ...session.targets, [id]: v } });

  return (
    <div className="space-y-5">
      {(['Readiness', 'AI Control'] as const).map((group) => (
        <div key={group}>
          <div className={cn('eyebrow mb-2', group === 'AI Control' && 'text-purple')}>{group}</div>
          <div className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line-soft bg-surface">
            {maturityDimensions
              .filter((d) => d.group === group)
              .map((d) => {
                const now = session.scores[d.id];
                const target = targetFor(session, d.id);
                return (
                  <div key={d.id} className={cn('grid items-center gap-3', compact ? 'grid-cols-[1fr_auto_auto] px-3 py-1.5' : 'px-4 py-3 md:grid-cols-[1fr_auto_auto]')}>
                    <div className="min-w-0">
                      <div className={cn('font-semibold text-ink', compact ? 'text-[13px]' : 'text-[14px]')}>{d.name}</div>
                      {!compact && (detail || !now) && <div className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{d.question}</div>}
                    </div>
                    <div role="radiogroup" aria-label={`${d.name}: current score`} className="flex items-center gap-1">
                      <span className="mr-1 text-[10.5px] font-semibold tracking-[0.1em] text-ink-4 uppercase">Now</span>
                      {maturityLevels.map((l) => {
                        const on = now === l.score;
                        return (
                          <button
                            key={l.score}
                            role="radio"
                            aria-checked={on}
                            title={`${l.score} · ${l.name}: ${l.description}`}
                            onClick={() => setScore(d.id, l.score)}
                            className={cn(
                              'flex items-center justify-center rounded-md border font-semibold tabular-nums transition',
                              compact ? 'size-7 text-[12px]' : 'size-8 text-[13px]',
                              on
                                ? 'border-magenta bg-magenta text-white'
                                : now && l.score < now
                                  ? 'border-magenta/25 bg-magenta-soft text-magenta'
                                  : 'border-line bg-surface text-ink-3 hover:border-magenta/40 hover:text-ink',
                            )}
                          >
                            {l.score}
                          </button>
                        );
                      })}
                    </div>
                    <label className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-purple uppercase">
                      Target
                      <select
                        value={target}
                        onChange={(e) => setTarget(d.id, Number(e.target.value))}
                        aria-label={`${d.name}: target score`}
                        className="rounded-md border border-purple/30 bg-purple-soft/50 px-1.5 py-1 text-[12.5px] font-semibold text-ink"
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Radar, biggest gaps and the recommended starting point. */
export function MaturityInsights({ compact, onNext }: { compact?: boolean; onNext?: () => void }) {
  const { session, update } = useClient();
  const scored = scoredCount(session);
  const top = gaps(session).slice(0, 3);
  const rec = recommendation(session);

  return (
    <div className="space-y-4">
      <div className={cn('card', compact ? 'px-4 pt-3 pb-2' : 'p-4')}>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <div className="eyebrow">Maturity profile</div>
          <div className="text-[12px] text-ink-3 tabular-nums">
            {scored} of {maturityDimensions.length} scored
          </div>
        </div>
        <div className={cn(compact && 'mx-auto max-w-[280px]')}>
          <RadarChart session={session} size={compact ? 300 : 380} />
        </div>
      </div>

      {top.length > 0 ? (
        <div className="card p-4">
          <div className="eyebrow mb-2.5">Biggest gaps to target</div>
          <ol className="space-y-2">
            {top.map((g) => (
              <li key={g.dimension.id} className="flex items-center justify-between gap-3">
                <span className="text-[13.5px] font-medium text-ink">{g.dimension.name}</span>
                <span className="shrink-0 text-[12.5px] text-ink-3 tabular-nums">
                  {g.now} → {g.target} <strong className="ml-1 text-magenta">+{g.gap}</strong>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] leading-snug text-ink-3">
          Score the dimensions with the client. Gaps to target and a recommended starting point appear here.
        </p>
      )}

      {rec && (
        <div className="control-gradient rounded-xl p-[1.5px]">
          <div className="rounded-[10px] bg-surface p-4">
            <div className="eyebrow mb-2 text-magenta">Recommended starting point</div>
            <div className="mb-2">
              <ServiceTag id={rec.service.id} />
            </div>
            <div className="text-[15px] leading-snug font-semibold text-ink">{rec.service.entry}</div>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-3">
              Closes the largest share of the client’s gaps ({rec.dimensions.map((d) => d.dimension.short).join(', ')}). Play{' '}
              {rec.play.number}: {rec.play.name}.
            </p>
            {!compact && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...new Set(rec.dimensions.map((d) => d.dimension.accelerator).filter(Boolean))].map((a) => (
                  <AcceleratorTag key={a} id={a!} />
                ))}
              </div>
            )}
            {!compact && session.play !== rec.play.id && (
              <button
                onClick={() => update({ play: rec.play.id })}
                className="mt-3 text-[12.5px] font-semibold text-magenta underline-offset-4 hover:underline"
              >
                Use Play {rec.play.number} as this client’s lead play
              </button>
            )}
          </div>
        </div>
      )}

      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => update({ scores: {}, targets: {} })}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3 hover:text-ink"
          >
            <RotateCcw className="size-3.5" /> Reset scores
          </button>
          {onNext && (
            <button onClick={onNext} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-2">
              Prioritise use cases <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function MaturitySection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { session } = useClient();
  return (
    <Section
      id="maturity"
      number="13"
      eyebrow={session.name ? `Client workshop · ${session.name}` : 'Client workshop'}
      title="AI maturity self-check"
      lead="Score each dimension with the client, from 1 (ad hoc) to 5 (optimised), and agree a target. The profile, biggest gaps and a recommended starting point update as you go. This is an indicative self-assessment, not a formal Radius assessment."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <MaturityScorer />
        <div className="xl:sticky xl:top-6 xl:self-start">
          <MaturityInsights onNext={() => onNavigate('prioritiser')} />
        </div>
      </div>
    </Section>
  );
}

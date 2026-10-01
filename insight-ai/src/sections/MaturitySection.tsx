import { ArrowLeft, ArrowRight, CircleHelp, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { aiStages, answerScale, stageUsesAi } from '../data/assessment';
import { maturityDimensions } from '../data/workshop';
import { Section } from '../components/Section';
import { AcceleratorTag, ServiceTag } from '../components/Tags';
import { RadarChart } from '../diagrams/RadarChart';
import { useClient, type Answer } from '../hooks/useClient';
import { cn } from '../utils/cn';
import { areaResults, gaps, progress, recommendation, unknownCount, weakestPractices } from '../utils/workshop';

/** Step 1: where the organisation is with AI. Drives which questions are asked. */
export function StagePicker({ compact }: { compact?: boolean }) {
  const { session, update } = useClient();
  return (
    <div>
      <div className={cn('mb-2 font-semibold text-ink', compact ? 'text-[14px]' : 'text-[16px]')}>
        Step 1 · Where is the organisation with AI today?
      </div>
      <div role="radiogroup" aria-label="AI stage" className={cn('grid gap-2', compact ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5')}>
        {aiStages.map((s, i) => {
          const on = session.aiStage === s.id;
          return (
            <button
              key={s.id}
              role="radio"
              aria-checked={on}
              onClick={() => update({ aiStage: s.id })}
              className={cn(
                'rounded-xl border text-left transition',
                compact ? 'px-3 py-2' : 'px-3.5 py-3',
                on ? 'border-transparent bg-ink text-white shadow-lift' : 'border-line-soft bg-surface hover:border-magenta/40',
              )}
            >
              <span className={cn('block font-mono text-[10.5px] font-semibold', on ? 'text-white/60' : 'text-magenta')}>STAGE {i + 1}</span>
              <span className={cn('block font-semibold', compact ? 'text-[13px]' : 'text-[14px]', on ? 'text-white' : 'text-ink')}>{s.name}</span>
              {!compact && <span className={cn('mt-0.5 block text-[12px] leading-snug', on ? 'text-white/75' : 'text-ink-3')}>{s.description}</span>}
            </button>
          );
        })}
      </div>
      {session.aiStage && !compact && (
        <p className="mt-2 text-[12.5px] text-ink-3">
          {stageUsesAi(session.aiStage)
            ? 'AI is in use, so the questions cover how AI is governed and run today.'
            : 'AI is not yet in organisational use, so the AI Control questions ask whether the organisation is ready to govern it.'}
        </p>
      )}
    </div>
  );
}

function QuestionRow({ id, text, index, compact }: { id: string; text: string; index: number; compact?: boolean }) {
  const { session, update } = useClient();
  const value = session.answers[id];
  const set = (a: Answer) => {
    const next = { ...session.answers };
    if (next[id] === a) delete next[id];
    else next[id] = a;
    update({ answers: next });
  };
  return (
    <div className={cn('grid items-center gap-2', compact ? 'grid-cols-[1fr_auto] py-1.5' : 'py-3 md:grid-cols-[1fr_auto] md:gap-4')}>
      <div className={cn('flex gap-2.5 leading-snug text-ink', compact ? 'text-[12.5px]' : 'text-[14px]')}>
        <span className="mt-[1px] w-5 shrink-0 font-mono text-[11px] font-semibold text-ink-4">{index}</span>
        <span>{text}</span>
      </div>
      <div role="radiogroup" aria-label={text} className={cn('flex items-center gap-1', !compact && 'pl-7 md:pl-0')}>
        {answerScale.map((l) => {
          const on = value === l.score;
          return (
            <button
              key={l.score}
              role="radio"
              aria-checked={on}
              aria-label={`${l.score} · ${l.name}`}
              title={`${l.score} · ${l.name}`}
              onClick={() => set(l.score)}
              className={cn(
                'flex items-center justify-center rounded-md border font-semibold tabular-nums transition',
                compact ? 'size-7 text-[12px]' : 'size-8 text-[13px]',
                on ? 'border-magenta bg-magenta text-white' : 'border-line bg-surface text-ink-3 hover:border-magenta/40 hover:text-ink',
              )}
            >
              {l.score}
            </button>
          );
        })}
        <button
          role="radio"
          aria-checked={value === 'dk'}
          title="Don’t know"
          aria-label="Don’t know"
          onClick={() => set('dk')}
          className={cn(
            'ml-1 flex items-center justify-center rounded-md border transition',
            compact ? 'h-7 px-1.5' : 'h-8 px-2',
            value === 'dk' ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-4 hover:text-ink',
          )}
        >
          <CircleHelp className="size-3.5" />
          {!compact && <span className="ml-1 text-[11.5px] font-medium">Don’t know</span>}
        </button>
      </div>
    </div>
  );
}

/** Step 2: area-by-area questionnaire. Reused in present mode. */
export function Questionnaire({ compact }: { compact?: boolean }) {
  const { session, update } = useClient();
  const results = areaResults(session);
  const [active, setActive] = useState(results[0].dimension.id);
  const idx = results.findIndex((r) => r.dimension.id === active);
  const r = results[idx];

  if (!session.aiStage) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13.5px] text-ink-3">
        Choose the organisation’s AI stage first. The questions adapt to it.
      </p>
    );
  }

  return (
    <div className={cn('grid gap-4', compact ? 'grid-cols-[210px_1fr]' : 'lg:grid-cols-[250px_1fr]')}>
      <nav aria-label="Assessment areas" className="space-y-3">
        {(['Readiness', 'AI Control'] as const).map((group) => (
          <div key={group}>
            <div className={cn('eyebrow mb-1.5 px-1', group === 'AI Control' && 'text-purple')}>{group}</div>
            <ul className="space-y-0.5">
              {results
                .filter((x) => x.dimension.group === group)
                .map((x) => {
                  const on = x.dimension.id === active;
                  const done = x.answered === x.questions.length;
                  return (
                    <li key={x.dimension.id}>
                      <button
                        data-area={x.dimension.id}
                        onClick={() => setActive(x.dimension.id)}
                        aria-current={on ? 'step' : undefined}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-2.5 text-left transition',
                          compact ? 'py-1 text-[12px]' : 'py-1.5 text-[13px]',
                          on ? 'bg-surface font-semibold text-ink shadow-card' : 'text-ink-2 hover:bg-surface/70',
                        )}
                      >
                        <span className={cn('size-2 shrink-0 rounded-full', done ? 'bg-magenta' : x.answered ? 'bg-magenta/40' : 'bg-stone')} />
                        <span className="min-w-0 flex-1 truncate">{x.dimension.name}</span>
                        <span className="shrink-0 font-mono text-[10.5px] text-ink-4 tabular-nums">
                          {x.score != null ? x.score.toFixed(1) : `${x.answered}/${x.questions.length}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="min-w-0 rounded-xl border border-line-soft bg-surface">
        <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line-soft', compact ? 'px-4 py-2.5' : 'px-5 py-4')}>
          <div className="min-w-0">
            <div className={cn('text-[10.5px] font-semibold tracking-[0.14em] uppercase', r.dimension.group === 'AI Control' ? 'text-purple' : 'text-magenta')}>
              {r.dimension.group} · area {idx + 1} of {results.length}
            </div>
            <h3 className={cn('font-semibold tracking-tight text-ink', compact ? 'text-[16px]' : 'text-[19px]')}>{r.dimension.name}</h3>
            {!compact && <p className="mt-0.5 text-[13px] text-ink-3">{r.dimension.question}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10.5px] font-semibold tracking-[0.1em] text-ink-4 uppercase">Area score</div>
              <div className="text-[18px] font-semibold text-ink tabular-nums">{r.score != null ? r.score.toFixed(1) : '–'}</div>
            </div>
            <label className="flex flex-col text-[10.5px] font-semibold tracking-[0.1em] text-purple uppercase">
              Target
              <select
                value={r.target}
                onChange={(e) => update({ targets: { ...session.targets, [r.dimension.id]: Number(e.target.value) } })}
                aria-label={`${r.dimension.name}: target score`}
                className="mt-0.5 rounded-md border border-purple/30 bg-purple-soft/50 px-1.5 py-1 text-[13px] font-semibold text-ink"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className={cn('divide-y divide-line-soft', compact ? 'px-4' : 'px-5')}>
          {r.questions.map((x, i) => (
            <QuestionRow key={x.id} id={x.id} text={x.text} index={i + 1} compact={compact} />
          ))}
        </div>
        <div className={cn('flex items-center justify-between gap-2 border-t border-line-soft', compact ? 'px-4 py-2' : 'px-5 py-3')}>
          <button
            onClick={() => setActive(results[Math.max(0, idx - 1)].dimension.id)}
            disabled={idx === 0}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3 hover:text-ink disabled:opacity-30"
          >
            <ArrowLeft className="size-4" /> Previous area
          </button>
          <span className="hidden text-[11.5px] text-ink-4 sm:inline">1 Not in place · 3 Partly · 5 Fully embedded</span>
          <button
            onClick={() => setActive(results[Math.min(results.length - 1, idx + 1)].dimension.id)}
            disabled={idx === results.length - 1}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-magenta hover:text-magenta-deep disabled:opacity-30"
          >
            Next area <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Results: radar, area scores, weakest practices and the recommended starting point. */
export function MaturityResults({ compact, onNext }: { compact?: boolean; onNext?: () => void }) {
  const { session, update } = useClient();
  const results = areaResults(session);
  const p = progress(session);
  const top = gaps(session).slice(0, compact ? 3 : 5);
  const weak = weakestPractices(session, compact ? 3 : 6);
  const rec = recommendation(session);
  const unknown = unknownCount(session);

  return (
    <div className={cn('grid gap-4', !compact && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
      <div className="space-y-4">
        <div className={cn('card', compact ? 'px-4 pt-3 pb-2' : 'p-4')}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <div className="eyebrow">Maturity profile</div>
            <div className="text-[12px] text-ink-3 tabular-nums">
              {p.answered} of {p.total} answered
            </div>
          </div>
          <div className={cn(compact && 'mx-auto max-w-[250px]')}>
            <RadarChart session={session} size={compact ? 300 : 400} />
          </div>
        </div>
        {!compact && (
          <div className="card overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line-soft text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">
                  <th className="px-4 py-2 font-semibold">Area</th>
                  <th className="px-2 py-2 font-semibold">Score</th>
                  <th className="px-2 py-2 font-semibold">Target</th>
                  <th className="w-[34%] px-4 py-2 font-semibold">Now against target</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.dimension.id} className="border-b border-line-soft last:border-0">
                    <td className="px-4 py-1.5 text-ink">{r.dimension.name}</td>
                    <td className="px-2 py-1.5 font-semibold text-ink tabular-nums">{r.score != null ? r.score.toFixed(1) : '–'}</td>
                    <td className="px-2 py-1.5 text-ink-3 tabular-nums">{r.target}</td>
                    <td className="px-4 py-1.5">
                      <div className="relative h-2 rounded-full bg-mist" title={`Score ${r.score ?? '–'} of 5, target ${r.target}`}>
                        {r.score != null && <div className="absolute inset-y-0 left-0 rounded-full bg-magenta" style={{ width: `${(r.score / 5) * 100}%` }} />}
                        <div className="absolute -top-1 -bottom-1 w-[2px] bg-purple" style={{ left: `calc(${(r.target / 5) * 100}% - 1px)` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-4 border-t border-line-soft px-4 py-2 text-[11.5px] text-ink-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full bg-magenta" /> Score (average of answers)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-[2px] bg-purple" /> Target
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {rec && (
          <div className="control-gradient rounded-xl p-[1.5px]">
            <div className="rounded-[10px] bg-surface p-4">
              <div className="eyebrow mb-2 text-magenta">{rec.foundations ? 'Recommended starting point · foundations first' : 'Recommended starting point'}</div>
              <div className="mb-2">
                <ServiceTag id={rec.service.id} />
              </div>
              <div className="text-[15px] leading-snug font-semibold text-ink">{rec.service.entry}</div>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-3">
                {rec.reason} Play {rec.play.number}: {rec.play.name}.
              </p>
              {rec.foundations && !compact && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <ServiceTag id="s03" short />
                  <AcceleratorTag id="radius" />
                  <AcceleratorTag id="flight-academy" />
                </div>
              )}
              {!compact && !rec.foundations && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[...new Set(rec.dimensions.map((d) => d.dimension.accelerator).filter(Boolean))].map((a) => (
                    <AcceleratorTag key={a} id={a!} />
                  ))}
                </div>
              )}
              {!compact && session.play !== rec.play.id && (
                <button onClick={() => update({ play: rec.play.id })} className="mt-3 text-[12.5px] font-semibold text-magenta underline-offset-4 hover:underline">
                  Use Play {rec.play.number} as this client’s lead play
                </button>
              )}
            </div>
          </div>
        )}

        <div className="card p-4">
          <div className="eyebrow mb-2.5">Biggest gaps to target</div>
          {top.length ? (
            <ol className="space-y-2">
              {top.map((g) => (
                <li key={g.dimension.id} className="flex items-center justify-between gap-3">
                  <span className="text-[13.5px] font-medium text-ink">{g.dimension.name}</span>
                  <span className="shrink-0 text-[12.5px] text-ink-3 tabular-nums">
                    {g.score!.toFixed(1)} → {g.target} <strong className="ml-1 text-magenta">+{g.gap.toFixed(1)}</strong>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[13px] text-ink-3">Answer the questions; gaps to target appear here.</p>
          )}
        </div>

        {weak.length > 0 && !compact && (
          <div className="card p-4">
            <div className="eyebrow mb-2.5">Weakest practices (scored 1–2)</div>
            <ul className="space-y-2">
              {weak.map((w) => (
                <li key={w.question.id} className="text-[13px] leading-snug">
                  <span className="text-ink">{w.question.text}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-3">
                    {w.area.name} ·{' '}
                    <strong className="text-magenta">
                      {w.score} · {w.label}
                    </strong>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {unknown > 0 && !compact && (
          <p className="rounded-lg bg-mist px-3 py-2 text-[12.5px] text-ink-2">
            {unknown} {unknown === 1 ? 'answer was' : 'answers were'} “don’t know”. Worth confirming with the owners; unknowns are excluded from scores.
          </p>
        )}

        {!compact && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button onClick={() => update({ answers: {}, targets: {} })} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-3 hover:text-ink">
              <RotateCcw className="size-3.5" /> Reset answers
            </button>
            {onNext && (
              <button onClick={onNext} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-2">
                Prioritise use cases <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function MaturitySection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { session } = useClient();
  const [tab, setTab] = useState<'questions' | 'results'>('questions');
  const p = progress(session);
  return (
    <Section
      id="maturity"
      number="13"
      eyebrow={session.name ? `Client workshop · ${session.name}` : 'Client workshop'}
      title="AI maturity self-check"
      lead={`A structured self-assessment across ${maturityDimensions.length} areas: 5 for readiness and 8 for AI Control. Score each practice from 1 (not in place) to 5 (fully embedded). The questions adapt to where the organisation is with AI. Indicative only; not a formal Radius assessment.`}
    >
      <StagePicker />
      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Self-check views" className="inline-flex rounded-full border border-line bg-mist p-0.5">
          {(
            [
              ['questions', 'Step 2 · Questions'],
              ['results', 'Step 3 · Results'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn('rounded-full px-4 py-1.5 text-[13px] font-medium transition', tab === id ? 'bg-surface text-ink shadow-card' : 'text-ink-3 hover:text-ink')}
            >
              {label}
            </button>
          ))}
        </div>
        {session.aiStage && (
          <div className="flex min-w-[220px] items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone">
              <div className="h-full rounded-full bg-magenta transition-all" style={{ width: `${p.total ? (p.answered / p.total) * 100 : 0}%` }} />
            </div>
            <span className="text-[12.5px] text-ink-3 tabular-nums">
              {p.answered}/{p.total} answered
            </span>
          </div>
        )}
      </div>
      {tab === 'questions' ? (
        <>
          <Questionnaire />
          {session.aiStage && (
            <div className="mt-4 flex justify-end">
              <button onClick={() => setTab('results')} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-2">
                See results <ArrowRight className="size-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <MaturityResults onNext={() => onNavigate('prioritiser')} />
      )}
    </Section>
  );
}

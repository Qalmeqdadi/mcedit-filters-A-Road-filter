import { ArrowRight, Plus, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { sectorById } from '../data/sectors';
import { quadrants } from '../data/workshop';
import { AiAssessButton } from '../components/AiAssessDialog';
import { ImportUseCases } from '../components/ImportUseCases';
import { Tooltip } from '../components/Tooltip';
import { Section } from '../components/Section';
import { PriorityMatrix } from '../diagrams/PriorityMatrix';
import { useClient, type Risk, type UseCase } from '../hooks/useClient';
import { cn } from '../utils/cn';
import { rankedUseCases, roadmap } from '../utils/workshop';

const newId = () => Math.random().toString(36).slice(2, 9);
const scoreSelect = 'rounded-md border border-line bg-surface px-1.5 py-1 text-[13px] font-semibold text-ink tabular-nums';

/** Add, score and rank use cases. Reused in present mode. */
export function UseCaseEditor({ compact }: { compact?: boolean }) {
  const { session, update } = useClient();
  const [name, setName] = useState('');
  const ranked = rankedUseCases(session);
  const sector = session.sector ? sectorById[session.sector] : null;

  const patch = (id: string, p: Partial<UseCase>) =>
    update({
      useCases: session.useCases.map((u) =>
        u.id === id ? { ...u, ...p, needsScoring: 'value' in p || 'readiness' in p ? undefined : u.needsScoring } : u,
      ),
    });
  const remove = (id: string) => update({ useCases: session.useCases.filter((u) => u.id !== id) });
  const add = () => {
    const n = name.trim();
    if (!n) return;
    update({ useCases: [...session.useCases, { id: newId(), name: n, value: 3, readiness: 3, risk: 'Medium' }] });
    setName('');
  };
  const addExamples = () => {
    if (!sector) return;
    const existing = new Set(session.useCases.map((u) => u.name.toLowerCase()));
    const extra = sector.examples
      .filter((e) => !existing.has(e.name.toLowerCase()))
      .map<UseCase>((e) => ({ id: newId(), name: e.name, value: 3, readiness: 3, risk: 'Medium' }));
    update({ useCases: [...session.useCases, ...extra] });
  };

  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Describe a use case, e.g. Invoice exception handling"
          aria-label="New use case"
          className="min-w-[220px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-purple focus:shadow-[var(--shadow-focus)]"
        />
        <button type="submit" disabled={!name.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[13px] font-medium text-white hover:bg-ink-2 disabled:opacity-40">
          <Plus className="size-4" /> Add
        </button>
        {!compact && <ImportUseCases />}
        {!compact && <AiAssessButton />}
        {sector && (
          <button type="button" onClick={addExamples} className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal-soft px-3 py-2 text-[13px] font-medium text-ink hover:border-teal">
            Add {sector.name} examples
          </button>
        )}
      </form>

      {ranked.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13.5px] text-ink-3">
          No use cases yet. Type the client’s ideas, import them from Excel{sector ? `, or start from the ${sector.name} examples` : ''}, then score value and readiness together.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line-soft bg-surface">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line-soft text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">
                <th className="w-10 px-3 py-2 font-semibold">#</th>
                <th className="px-2 py-2 font-semibold">Use case</th>
                <th className="px-2 py-2 font-semibold">Value</th>
                <th className="px-2 py-2 font-semibold">Readiness</th>
                <th className="px-2 py-2 font-semibold">Risk</th>
                <th className="px-2 py-2 font-semibold">Placement</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {ranked.map((u) => (
                <tr key={u.id} className="border-b border-line-soft last:border-0">
                  <td className="px-3 py-1.5">
                    <span className="flex size-6 items-center justify-center rounded-full bg-magenta text-[11px] font-bold text-white">{u.rank}</span>
                  </td>
                  <td className={cn('px-2 text-ink', compact ? 'py-1' : 'py-1.5')}>
                    <span className="font-medium">{u.name}</span>
                    {u.needsScoring && <span className="ml-1.5 rounded bg-cond-soft px-1 text-[10.5px] font-semibold text-cond">needs scoring</span>}
                    {u.ai && (
                      <Tooltip
                        width={360}
                        content={
                          <span className="block space-y-1">
                            <span className="block"><strong>Value.</strong> {u.ai.value}</span>
                            <span className="block"><strong>Readiness.</strong> {u.ai.readiness}</span>
                            <span className="block"><strong>Risk.</strong> {u.ai.risk}</span>
                            {u.ai.keyRisks.length > 0 && <span className="block text-white/70">{u.ai.keyRisks.join(' · ')}</span>}
                            <span className="block text-white/60">AI-proposed ({u.ai.confidence} confidence), accepted by consultant.</span>
                          </span>
                        }
                      >
                        <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-purple-soft px-1 text-[10.5px] font-semibold text-purple" data-testid="ai-badge">
                          <Sparkles className="size-3" /> AI
                        </span>
                      </Tooltip>
                    )}
                    {!compact && (u.owner || u.domain) && (
                      <span className="block text-[11.5px] text-ink-3">{[u.domain, u.owner].filter(Boolean).join(' · ')}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <select aria-label={`${u.name} value`} value={u.value} onChange={(e) => patch(u.id, { value: Number(e.target.value) })} className={scoreSelect}>
                      {[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select aria-label={`${u.name} readiness`} value={u.readiness} onChange={(e) => patch(u.id, { readiness: Number(e.target.value) })} className={scoreSelect}>
                      {[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      aria-label={`${u.name} risk`}
                      value={u.risk}
                      onChange={(e) => patch(u.id, { risk: e.target.value as Risk })}
                      className={cn(scoreSelect, u.risk === 'High' && 'border-stop/40 text-stop')}
                    >
                      {(['Low', 'Medium', 'High'] as Risk[]).map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-[12.5px] font-semibold text-ink-2">{quadrants[u.quadrant].name}</td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => remove(u.id)} aria-label={`Remove ${u.name}`} className="rounded-md p-1.5 text-ink-4 hover:bg-mist hover:text-stop">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[12px] text-ink-3">Value and readiness are scored 1–5 by the client. Ranking is value × readiness.</p>
    </div>
  );
}

/** Now / Next / Later roadmap derived from quadrant placement. */
export function RoadmapColumns({ compact }: { compact?: boolean }) {
  const { session } = useClient();
  const cols = roadmap(session);
  if (!session.useCases.length) return null;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cols.map((c) => (
        <div key={c.horizon} className="rounded-xl border border-line-soft bg-surface p-3.5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[13px] font-bold tracking-[0.12em] text-ink uppercase">{c.horizon}</span>
            <span className="text-[11.5px] text-ink-3">{c.horizon === 'Now' ? 'Prove' : c.horizon === 'Next' ? 'Build & scale' : 'Revisit'}</span>
          </div>
          {c.items.length === 0 ? (
            <p className="text-[12.5px] text-ink-4">Nothing here yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {c.items.slice(0, compact ? 4 : 8).map((u) => (
                <li key={u.id} className="flex items-start gap-2 text-[13px] leading-snug text-ink">
                  <span className="mt-[1px] flex size-5 shrink-0 items-center justify-center rounded-full bg-magenta text-[10px] font-bold text-white">{u.rank}</span>
                  <span>
                    {u.name}
                    {u.risk === 'High' && (
                      <span className="mt-0.5 flex items-center gap-1 text-[11.5px] font-medium text-stop">
                        <ShieldAlert className="size-3.5" /> AI Control design gate before PoV
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export function PrioritiserSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { session } = useClient();
  const ranked = rankedUseCases(session);
  return (
    <Section
      id="prioritiser"
      number="14"
      eyebrow={session.name ? `Client workshop · ${session.name}` : 'Client workshop'}
      title="Use-case prioritiser"
      lead="Capture the client’s use cases by typing them or importing an Excel sheet, then score value and readiness together. Each one is placed on the 2×2 and the ranking becomes a Now / Next / Later roadmap."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <UseCaseEditor />
        <div className="space-y-3 xl:sticky xl:top-6 xl:self-start">
          <div className="card p-4">
            <div className="eyebrow mb-1">Value × readiness</div>
            <PriorityMatrix items={ranked} />
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-3">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-magenta" /> Use case (number = rank)</span>
              <span className="flex items-center gap-1.5"><span className="size-3 rounded-full border-2 border-stop" /> ! High risk</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px] leading-snug">
            {(['lighthouse', 'strategic', 'quick', 'park'] as const).map((q) => (
              <div key={q} className="rounded-lg bg-mist px-3 py-2">
                <div className="font-semibold text-ink">{quadrants[q].name}</div>
                <div className="text-ink-3">{quadrants[q].action}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[20px] font-semibold tracking-tight text-ink">Draft roadmap</h3>
          {ranked.length > 0 && (
            <button onClick={() => onNavigate('summary')} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-2">
              Build the client summary <ArrowRight className="size-4" />
            </button>
          )}
        </div>
        {ranked.length ? <RoadmapColumns /> : <p className="text-[13.5px] text-ink-3">The roadmap appears once use cases are added.</p>}
      </div>
    </Section>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, KeyRound, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sectorById } from '../data/sectors';
import { useClient, type ClientProfile, type UseCase } from '../hooks/useClient';
import { AI_MODEL, AssessorError, assessUseCases, type AiProposal, type AssessResult } from '../utils/aiAssessor';
import { cn } from '../utils/cn';
import { areaResults } from '../utils/workshop';

const KEY_STORE = 'insight-ai-anthropic-key';
const WS_STORE = 'insight-ai-anthropic-workspace';

function loadKey(): { key: string; workspace: string; remembered: boolean } {
  try {
    const remembered = window.localStorage.getItem(KEY_STORE);
    if (remembered) return { key: remembered, workspace: window.localStorage.getItem(WS_STORE) ?? '', remembered: true };
    return { key: window.sessionStorage.getItem(KEY_STORE) ?? '', workspace: window.sessionStorage.getItem(WS_STORE) ?? '', remembered: false };
  } catch {
    return { key: '', workspace: '', remembered: false };
  }
}

function saveKey(key: string, workspace: string, remember: boolean) {
  try {
    window.sessionStorage.setItem(KEY_STORE, key);
    window.sessionStorage.setItem(WS_STORE, workspace);
    if (remember) {
      window.localStorage.setItem(KEY_STORE, key);
      window.localStorage.setItem(WS_STORE, workspace);
    } else {
      window.localStorage.removeItem(KEY_STORE);
      window.localStorage.removeItem(WS_STORE);
    }
  } catch {
    /* storage blocked: key lives for this visit only */
  }
}

type Phase = 'setup' | 'running' | 'review' | 'error';

/** "Assess with AI agent": proposes Value, Readiness and Risk with rationale; a person approves each change. */
export function AiAssessButton() {
  const { session } = useClient();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!session.useCases.length}
        title={session.useCases.length ? 'Let an AI agent propose Value, Readiness and Risk for each use case' : 'Add or import use cases first'}
        className="control-gradient inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-40"
      >
        <Sparkles className="size-4" /> Assess with AI agent
      </button>
      <AiAssessDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AiAssessDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, update } = useClient();
  const stored = useRef(loadKey());
  const [phase, setPhase] = useState<Phase>('setup');
  const [apiKey, setApiKey] = useState(stored.current.key);
  const [workspace, setWorkspace] = useState(stored.current.workspace);
  const [needsWorkspace, setNeedsWorkspace] = useState(false);
  const [remember, setRemember] = useState(stored.current.remembered);
  const [research, setResearch] = useState(true);
  const [reuse, setReuse] = useState(true);
  const [scope, setScope] = useState<'all' | 'unscored'>('all');
  const [ack, setAck] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AssessResult | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const abort = useRef<AbortController | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const sector = session.sector ? sectorById[session.sector].name : null;
  const reusable = session.aiProfile && session.aiProfile.forClient === session.name ? session.aiProfile : null;
  const targets = scope === 'unscored' ? session.useCases.filter((u) => u.needsScoring || !u.ai) : session.useCases;

  useEffect(() => {
    if (!open) return;
    setPhase('setup');
    setProgress([]);
    setError('');
    setResult(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        abort.current?.abort();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // Reset only when the dialog opens; parent re-renders must not wipe a finished run.
  }, [open]);

  const maturity = () => {
    const scored = areaResults(session).filter((r) => r.score != null);
    return scored.length ? scored.map((r) => `- ${r.dimension.name}: ${r.score!.toFixed(1)} (target ${r.target})`).join('\n') : null;
  };

  const run = async () => {
    saveKey(apiKey.trim(), workspace.trim(), remember);
    setPhase('running');
    setProgress([]);
    abort.current = new AbortController();
    try {
      const res = await assessUseCases({
        apiKey: apiKey.trim(),
        workspaceId: workspace.trim() || undefined,
        clientName: session.name,
        sector,
        context: session.aiContext,
        maturity: maturity(),
        useCases: targets,
        research,
        reuseProfile: research && reuse ? reusable : null,
        signal: abort.current.signal,
        onProgress: (m) => setProgress((p) => [...p, m]),
      });
      if (res.profile && res.profile !== reusable) update({ aiProfile: res.profile });
      setResult(res);
      setAccepted(new Set(res.proposals.map((p) => p.id)));
      setPhase('review');
    } catch (e) {
      if (e instanceof AssessorError && e.code === 'workspace') setNeedsWorkspace(true);
      setError(e instanceof Error ? e.message : 'Unexpected error.');
      setPhase('error');
    }
  };

  const apply = () => {
    if (!result) return;
    const byId = new Map(result.proposals.filter((p) => accepted.has(p.id)).map((p) => [p.id, p]));
    const at = new Date().toISOString();
    update({
      useCases: session.useCases.map((u): UseCase => {
        const p = byId.get(u.id);
        if (!p) return u;
        return {
          ...u,
          value: p.value,
          readiness: p.readiness,
          risk: p.risk,
          needsScoring: undefined,
          ai: {
            value: p.value_rationale,
            readiness: p.readiness_rationale,
            risk: p.risk_rationale,
            keyRisks: p.key_risks,
            confidence: p.confidence,
            model: AI_MODEL,
            at,
          },
        };
      }),
    });
    onClose();
  };

  const canRun = apiKey.trim().length > 20 && ack && targets.length > 0;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/40 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && phase !== 'running' && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-title"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn('flex max-h-[90vh] w-full flex-col rounded-2xl bg-surface shadow-lift', phase === 'review' ? 'max-w-[1100px]' : 'max-w-[620px]')}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 pt-5 pb-4">
              <div>
                <div className="eyebrow mb-1 flex items-center gap-1.5 text-purple">
                  <Sparkles className="size-3.5" /> AI use-case agent
                </div>
                <h2 id="ai-title" className="text-[20px] font-semibold tracking-tight text-ink">
                  {phase === 'review'
                    ? `Review ${result?.proposals.length ?? 0} proposed assessments`
                    : `Assess ${targets.length} use case${targets.length === 1 ? '' : 's'}${session.name ? ` for ${session.name}` : ''}`}
                </h2>
              </div>
              <button
                onClick={() => {
                  abort.current?.abort();
                  onClose();
                }}
                className="-mt-1 -mr-2 rounded-lg p-2 text-ink-3 hover:bg-mist"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {phase === 'setup' && (
                <div className="space-y-4">
                  <p className="text-[13.5px] leading-relaxed text-ink-2">
                    The agent {research ? 'researches the client on the web, then ' : ''}scores each use case for value, readiness and risk with a short
                    rationale. You review every proposal before anything changes.
                  </p>
                  {!session.name && (
                    <p className="rounded-lg bg-cond-soft px-3 py-2 text-[12.5px] text-ink-2">
                      No client is set up. Set one up in the sidebar so the agent can research the right organisation.
                    </p>
                  )}
                  <label className="block text-[12.5px] font-semibold text-ink-2">
                    Context for the agent (optional)
                    <textarea
                      value={session.aiContext}
                      onChange={(e) => update({ aiContext: e.target.value })}
                      rows={3}
                      placeholder="e.g. Strategy priorities, known constraints, data platforms in place, regulatory concerns…"
                      className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] font-normal text-ink outline-none focus:border-purple"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex items-start gap-2 rounded-lg border border-line-soft px-3 py-2 text-[13px] text-ink">
                      <input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} className="mt-0.5 accent-[#6b2bd9]" />
                      <span>
                        <span className="font-semibold">Research the client on the web</span>
                        <span className="block text-[12px] text-ink-3">{session.name ? `Public information about ${session.name}` : 'Needs a client name'}</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 rounded-lg border border-line-soft px-3 py-2 text-[13px] text-ink">
                      <span className="pt-0.5 font-semibold">Scope</span>
                      <select value={scope} onChange={(e) => setScope(e.target.value as 'all' | 'unscored')} aria-label="Scope" className="ml-auto rounded-md border border-line px-2 py-1 text-[12.5px]">
                        <option value="all">All {session.useCases.length} use cases</option>
                        <option value="unscored">Only not yet AI-assessed ({session.useCases.filter((u) => u.needsScoring || !u.ai).length})</option>
                      </select>
                    </label>
                  </div>
                  {research && reusable && (
                    <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
                      <input type="checkbox" checked={reuse} onChange={(e) => setReuse(e.target.checked)} className="accent-[#6b2bd9]" />
                      Reuse the client research from {new Date(reusable.at).toLocaleDateString('en-GB')} (faster; untick to research again)
                    </label>
                  )}
                  <div className="rounded-xl border border-line-soft bg-mist/50 p-3">
                    <label className="block text-[12.5px] font-semibold text-ink-2">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="size-3.5" /> Anthropic API key
                      </span>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-ant-…"
                        autoComplete="off"
                        aria-label="Anthropic API key"
                        className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[13px] font-normal text-ink outline-none focus:border-purple"
                      />
                    </label>
                    <label className="mt-3 block text-[12.5px] font-semibold text-ink-2">
                      Workspace ID <span className="font-normal text-ink-3">(only for organisation-level keys)</span>
                      <input
                        value={workspace}
                        onChange={(e) => setWorkspace(e.target.value)}
                        placeholder="wrkspc_…"
                        autoComplete="off"
                        aria-label="Workspace ID"
                        className={cn(
                          'mt-1.5 w-full rounded-lg border bg-surface px-3 py-2 font-mono text-[13px] font-normal text-ink outline-none focus:border-purple',
                          needsWorkspace && !workspace.trim() ? 'border-stop ring-2 ring-stop/20' : 'border-line',
                        )}
                      />
                    </label>
                    {needsWorkspace && !workspace.trim() && (
                      <p className="mt-1 text-[11.5px] leading-snug text-stop">
                        This key needs a Workspace ID: Claude Console › Settings › Workspaces › open the workspace › copy its ID. Or use a key created inside a workspace.
                      </p>
                    )}
                    <label className="mt-2 flex items-center gap-2 text-[12.5px] text-ink-2">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[#6b2bd9]" />
                      Remember on this device (otherwise kept for this browser tab only)
                    </label>
                    <p className="mt-1.5 text-[11.5px] text-ink-3">Model: {AI_MODEL}. The key is used only from this browser and is never written into the file.</p>
                  </div>
                  <label className="flex items-start gap-2 rounded-lg border border-purple/25 bg-purple-soft/40 px-3 py-2.5 text-[12.5px] leading-snug text-ink-2">
                    <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 accent-[#6b2bd9]" aria-label="I confirm data may be sent" />
                    <span>
                      <ShieldCheck className="mr-1 inline size-3.5 text-purple" />
                      I confirm the client name, use-case details, context notes and self-check scores may be sent to the Anthropic API for this assessment, in line with
                      the client’s data policy.
                    </span>
                  </label>
                </div>
              )}

              {phase === 'running' && (
                <div className="py-4" aria-live="polite">
                  <div className="flex items-center gap-3 text-[15px] font-semibold text-ink">
                    <Loader2 className="size-5 animate-spin text-purple" /> Working…
                  </div>
                  <ul className="mt-4 space-y-1.5 text-[13px] text-ink-2">
                    {progress.map((p, i) => (
                      <li key={i} className={cn(i === progress.length - 1 ? 'font-medium text-ink' : 'text-ink-3')}>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[12px] text-ink-3">Research with web search can take a minute or two.</p>
                </div>
              )}

              {phase === 'error' && (
                <div className="space-y-3">
                  <p className="rounded-lg bg-stop-soft px-3 py-2.5 text-[14px] text-ink">{error}</p>
                  <p className="text-[12.5px] text-ink-3">Nothing was changed.</p>
                </div>
              )}

              {phase === 'review' && result && <Review result={result} useCases={session.useCases} accepted={accepted} setAccepted={setAccepted} />}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-6 py-4">
              <span className="text-[11.5px] text-ink-4">
                {result ? `${result.usage.searches} searches · ${(result.usage.input + result.usage.output).toLocaleString()} tokens` : ''}
              </span>
              <div className="flex gap-2">
                {phase === 'setup' && (
                  <button
                    onClick={run}
                    disabled={!canRun}
                    className="control-gradient inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
                  >
                    <Sparkles className="size-4" /> Run assessment
                  </button>
                )}
                {phase === 'running' && (
                  <button onClick={() => abort.current?.abort()} className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:text-ink">
                    Cancel
                  </button>
                )}
                {phase === 'error' && (
                  <button onClick={() => setPhase('setup')} className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-white">
                    Back
                  </button>
                )}
                {phase === 'review' && (
                  <>
                    <button onClick={onClose} className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:text-ink">
                      Discard
                    </button>
                    <button onClick={apply} disabled={!accepted.size} className="rounded-full bg-ink px-5 py-2 text-[13px] font-semibold text-white hover:bg-ink-2 disabled:opacity-40">
                      Apply {accepted.size} selected
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Delta({ from, to }: { from: number | string; to: number | string }) {
  const same = from === to;
  return (
    <span className="tabular-nums whitespace-nowrap">
      <span className="text-ink-4">{from}</span>
      <span className="mx-1 text-ink-4">→</span>
      <strong className={same ? 'text-ink-2' : 'text-magenta'}>{to}</strong>
    </span>
  );
}

function Review({
  result,
  useCases,
  accepted,
  setAccepted,
}: {
  result: AssessResult;
  useCases: UseCase[];
  accepted: Set<string>;
  setAccepted: (s: Set<string>) => void;
}) {
  const byId = new Map(useCases.map((u) => [u.id, u]));
  const toggle = (id: string) => {
    const next = new Set(accepted);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAccepted(next);
  };
  return (
    <div className="space-y-4">
      {result.profile && <ProfileCard profile={result.profile} />}
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-ink-3">Proposed scores are shown in magenta where they differ from the current score.</span>
        <button
          onClick={() => setAccepted(accepted.size === result.proposals.length ? new Set() : new Set(result.proposals.map((p) => p.id)))}
          className="text-[12.5px] font-semibold text-purple hover:underline"
        >
          {accepted.size === result.proposals.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line-soft">
        <table className="w-full min-w-[900px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-line-soft bg-mist/60 text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
              <th className="w-8 px-3 py-2" />
              <th className="px-2 py-2 font-semibold">Use case</th>
              <th className="px-2 py-2 font-semibold">Value</th>
              <th className="px-2 py-2 font-semibold">Readiness</th>
              <th className="px-2 py-2 font-semibold">Risk</th>
              <th className="px-2 py-2 font-semibold">Rationale</th>
              <th className="px-2 py-2 font-semibold">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {result.proposals.map((p: AiProposal) => {
              const u = byId.get(p.id);
              if (!u) return null;
              return (
                <tr key={p.id} className={cn('border-b border-line-soft align-top last:border-0', !accepted.has(p.id) && 'opacity-50')}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={accepted.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Accept ${u.name}`} className="accent-[#6b2bd9]" />
                  </td>
                  <td className="px-2 py-2.5 font-semibold text-ink">{u.name}</td>
                  <td className="px-2 py-2.5"><Delta from={u.value} to={p.value} /></td>
                  <td className="px-2 py-2.5"><Delta from={u.readiness} to={p.readiness} /></td>
                  <td className="px-2 py-2.5"><Delta from={u.risk} to={p.risk} /></td>
                  <td className="max-w-[420px] px-2 py-2.5 leading-snug text-ink-2">
                    <div><strong className="font-semibold text-ink">Value.</strong> {p.value_rationale}</div>
                    <div className="mt-1"><strong className="font-semibold text-ink">Readiness.</strong> {p.readiness_rationale}</div>
                    <div className="mt-1"><strong className="font-semibold text-ink">Risk.</strong> {p.risk_rationale}</div>
                    {p.key_risks.length > 0 && <div className="mt-1 text-[11.5px] text-stop">{p.key_risks.join(' · ')}</div>}
                  </td>
                  <td className="px-2 py-2.5">
                    <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold', p.confidence === 'High' ? 'bg-go-soft text-go' : p.confidence === 'Medium' ? 'bg-cond-soft text-cond' : 'bg-stop-soft text-stop')}>
                      {p.confidence}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {result.proposals.length < useCases.length && (
        <p className="text-[12px] text-ink-3">Use cases not listed were outside the selected scope or had no valid proposal; they are unchanged.</p>
      )}
    </div>
  );
}

function ProfileCard({ profile }: { profile: ClientProfile }) {
  return (
    <details className="rounded-xl border border-purple/20 bg-purple-soft/30 px-4 py-3" open={false}>
      <summary className="cursor-pointer text-[13px] font-semibold text-ink">
        Client research used: {profile.forClient} · {profile.sources.length} sources
      </summary>
      <div className="mt-2 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">{profile.summary}</div>
      {profile.sources.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {profile.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[12px] text-blue hover:underline">
                <ExternalLink className="size-3" /> {s.title || s.url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

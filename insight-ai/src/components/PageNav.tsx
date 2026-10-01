import { ArrowLeft, ArrowRight } from 'lucide-react';
import { sections, type SectionId } from '../data/navigation';

/** Previous / next page controls at the foot of each page. */
export function PageNav({ active, onGo }: { active: SectionId; onGo: (id: SectionId) => void }) {
  const i = sections.findIndex((s) => s.id === active);
  const prev = sections[i - 1];
  const next = sections[i + 1];
  return (
    <div className="mx-auto flex max-w-[1360px] items-stretch justify-between gap-4 px-4 pb-12 sm:px-6 lg:px-10">
      {prev ? (
        <button onClick={() => onGo(prev.id)} className="group flex min-w-0 items-center gap-3 rounded-xl border border-line-soft bg-surface px-4 py-3 text-left shadow-card transition hover:border-line">
          <ArrowLeft className="size-4 shrink-0 text-ink-3 transition group-hover:-translate-x-0.5 group-hover:text-magenta" />
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">Previous</span>
            <span className="block truncate text-[14px] font-semibold text-ink">{prev.title}</span>
          </span>
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button onClick={() => onGo(next.id)} className="group ml-auto flex min-w-0 items-center gap-3 rounded-xl border border-line-soft bg-surface px-4 py-3 text-right shadow-card transition hover:border-line">
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">Next · {next.number}</span>
            <span className="block truncate text-[14px] font-semibold text-ink">{next.title}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-magenta" />
        </button>
      )}
    </div>
  );
}

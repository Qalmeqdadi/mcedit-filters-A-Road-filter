import { ArrowRight } from 'lucide-react';
import { categoryById } from '../data/taxonomy';
import type { CategoryId } from '../data/types';
import { categoryStyle } from '../utils/categoryStyle';
import { cn } from '../utils/cn';

/** One client situation traced through all seven categories, so the distinctions are concrete. */
const steps: { category: CategoryId; value: string }[] = [
  { category: 'industry', value: 'Financial Services' },
  { category: 'play', value: 'Play 03 · AI Control' },
  { category: 'service', value: 'S03 · AI Control / Radius Assessment' },
  { category: 'capability', value: 'Agent governance' },
  { category: 'accelerator', value: 'Radius' },
  { category: 'technology', value: 'Security & identity' },
  { category: 'architecture', value: 'Human + AI Workforce' },
];

export function WorkedExample({ large }: { large?: boolean }) {
  return (
    <div className="rounded-xl border border-line-soft bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="eyebrow">Worked example</div>
        <p className={cn('text-ink-3', large ? 'text-[15px]' : 'text-[13px]')}>
          A bank whose agents are spreading faster than governance.
        </p>
      </div>
      <ol className="flex flex-wrap items-stretch gap-y-2">
        {steps.map((s, i) => {
          const c = categoryById[s.category];
          const st = categoryStyle[s.category];
          return (
            <li key={s.category} className="flex items-center">
              {i > 0 && <ArrowRight aria-hidden className="mx-1 size-3.5 shrink-0 text-ink-4" />}
              <span className={cn('rounded-lg border px-2.5 py-1.5', st.border, st.soft)}>
                <span className={cn('block font-semibold tracking-[0.1em] uppercase', st.text, large ? 'text-[11px]' : 'text-[10px]')}>
                  {c.label}
                </span>
                <span className={cn('block font-medium text-ink', large ? 'text-[14px]' : 'text-[13px]')}>{s.value}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

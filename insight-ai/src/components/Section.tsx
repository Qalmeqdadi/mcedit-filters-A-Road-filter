import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

/** Standard explore-mode section frame with numbered eyebrow, title and lead. */
export function Section({
  id,
  number,
  eyebrow,
  title,
  lead,
  aside,
  children,
  className,
}: {
  id: string;
  number: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        'pt-10 pb-14 md:pt-14 md:pb-16',
                className,
      )}
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10">
        <header className="mb-10 grid gap-6 md:mb-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="eyebrow mb-4 flex items-center gap-3">
              <span className="font-mono text-magenta">{number}</span>
              <span className="h-px w-8 bg-line" />
              <span>{eyebrow}</span>
            </div>
            <h2 id={`${id}-title`} className="text-[32px] leading-[1.08] font-semibold tracking-[-0.022em] text-ink md:text-[42px]">
              {title}
            </h2>
            {lead && <p className="mt-4 max-w-2xl text-[16.5px] leading-relaxed text-ink-3">{lead}</p>}
          </div>
          {aside && <div className="lg:pb-1">{aside}</div>}
        </header>
        {children}
      </div>
    </section>
  );
}

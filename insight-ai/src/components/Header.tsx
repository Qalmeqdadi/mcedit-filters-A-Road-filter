import { Presentation } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { brand } from '../data/brand';
import { sections } from '../data/navigation';
import { useAppState } from '../hooks/useAppState';
import { useScrollSpy } from '../hooks/useScrollSpy';
import { cn } from '../utils/cn';
import { BrandMark } from './BrandMark';
import { LevelToggle } from './LevelToggle';

const ids = sections.map((s) => s.id);

/** Sticky two-tier header: brand and controls, then section navigation with scroll-spy. */
export function Header() {
  const { setMode } = useAppState();
  const active = useScrollSpy(ids);
  const navRef = useRef<HTMLDivElement>(null);

  // Keep the active nav item visible on narrow screens.
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>(`[data-nav="${active}"]`);
    const nav = navRef.current;
    if (!el || !nav) return;
    const target = el.offsetLeft - nav.clientWidth / 2 + el.clientWidth / 2;
    nav.scrollTo({ left: target, behavior: 'smooth' });
  }, [active]);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line-soft bg-canvas/90 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/80">
      <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <button onClick={() => go('overview')} className="flex min-w-0 items-center gap-3" aria-label="Back to overview">
          <BrandMark />
          <span className="hidden h-4 w-px bg-line sm:block" />
          <span className="hidden truncate text-[12.5px] font-medium text-ink-3 sm:block">{brand.line}</span>
        </button>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LevelToggle />
          <button
            onClick={() => setMode('present')}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-ink-2"
          >
            <Presentation className="size-4" />
            <span className="hidden sm:inline">Present</span>
          </button>
        </div>
      </div>
      <nav aria-label="Sections" className="border-t border-line-soft/70">
        <div ref={navRef} className="no-scrollbar mx-auto flex max-w-[1360px] gap-1 overflow-x-auto px-3 sm:px-5 lg:px-9">
          {sections.map((s) => (
            <button
              key={s.id}
              data-nav={s.id}
              onClick={() => go(s.id)}
              aria-current={active === s.id ? 'true' : undefined}
              className={cn(
                'relative shrink-0 px-2.5 py-2.5 text-[12.5px] font-medium whitespace-nowrap transition',
                active === s.id ? 'text-ink' : 'text-ink-3 hover:text-ink',
              )}
            >
              <span className={cn('mr-1.5 font-mono text-[10.5px]', active === s.id ? 'text-magenta' : 'text-ink-4')}>
                {s.number}
              </span>
              {s.label}
              {active === s.id && <span className="absolute inset-x-2.5 -bottom-px h-[2px] rounded-full bg-magenta" />}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}

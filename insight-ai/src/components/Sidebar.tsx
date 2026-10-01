import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Pencil, Presentation, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { brand } from '../data/brand';
import { sectionGroups, sections, type SectionId } from '../data/navigation';
import { sectorById } from '../data/sectors';
import { useClient } from '../hooks/useClient';
import { ClientSetup } from './ClientSetup';
import { useAppState } from '../hooks/useAppState';
import { cn } from '../utils/cn';
import { BrandMark } from './BrandMark';
import { LevelToggle } from './LevelToggle';

function NavList({ active, onGo }: { active: SectionId; onGo: (id: SectionId) => void }) {
  return (
    <nav aria-label="Sections" className="flex-1 overflow-y-auto px-3 py-3">
      {sectionGroups.map((g) => (
        <div key={g.id} className="mb-2">
          <div className="px-3 pt-1 pb-1.5 text-[10.5px] font-semibold tracking-[0.16em] text-ink-4 uppercase">{g.label}</div>
          <ul className="space-y-0.5">
            {sections
              .filter((s) => s.group === g.id)
              .map((s) => {
                const on = s.id === active;
                return (
                  <li key={s.id}>
                    <button
                      data-nav={s.id}
                      onClick={() => onGo(s.id)}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'group relative flex w-full items-start gap-3 rounded-lg px-3 py-[5px] text-left text-[13px] font-medium transition',
                        on ? 'bg-surface text-ink shadow-card' : 'text-ink-3 hover:bg-surface/70 hover:text-ink',
                      )}
                    >
                      {on && <motion.span layoutId="nav-active" className="control-gradient absolute top-2 bottom-2 left-0 w-[3px] rounded-full" />}
                      <span className={cn('w-5 shrink-0 pt-[2px] font-mono text-[11px]', on ? 'text-magenta' : 'text-ink-4 group-hover:text-ink-3')}>{s.number}</span>
                      <span className="leading-snug">{s.title}</span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ClientPanel() {
  const { session, active } = useClient();
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line-soft px-4 py-2.5">
      <button
        onClick={() => setOpen(true)}
        data-testid="client-panel"
        className={cn(
          'group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition',
          active ? 'border-magenta/25 bg-magenta-soft/60 hover:border-magenta/40' : 'border-dashed border-line bg-surface/60 hover:border-ink-4',
        )}
      >
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-magenta text-white' : 'bg-mist text-ink-3')}>
          <UserRound className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          {active ? (
            <>
              <span className="block text-[10.5px] font-semibold tracking-[0.12em] text-magenta uppercase">Prepared for</span>
              <span className="block truncate text-[13.5px] font-semibold text-ink">{session.name || 'Unnamed client'}</span>
              {session.sector && <span className="block truncate text-[12px] text-ink-3">{sectorById[session.sector].name}</span>}
            </>
          ) : (
            <>
              <span className="block text-[13px] font-semibold text-ink">Set up a client</span>
              <span className="block text-[12px] text-ink-3">Tailor pages to one client</span>
            </>
          )}
        </span>
        <Pencil className="size-3.5 shrink-0 text-ink-4 group-hover:text-ink" />
      </button>
      <ClientSetup open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function SidebarBody({ active, onGo }: { active: SectionId; onGo: (id: SectionId) => void }) {
  const { setMode } = useAppState();
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line-soft px-6 pt-5 pb-3">
        <button onClick={() => onGo('overview')} aria-label="Insight AI overview" className="block">
          <BrandMark size="lg" />
        </button>
        <p className="mt-2 text-[12px] leading-snug font-medium text-ink-3">{brand.line}</p>
      </div>
      <ClientPanel />
      <NavList active={active} onGo={onGo} />
      <div className="flex items-center gap-2 border-t border-line-soft px-3 py-3">
        <LevelToggle className="flex-1 [&>button]:flex-1" />
        <button
          onClick={() => setMode('present')}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-[12.5px] font-medium text-white transition hover:bg-ink-2"
        >
          <Presentation className="size-4" /> Present
        </button>
      </div>
    </div>
  );
}

/** Fixed left navigation on desktop; a top bar with a slide-in menu on smaller screens. */
export function Sidebar({ active, onGo }: { active: SectionId; onGo: (id: SectionId) => void }) {
  const [open, setOpen] = useState(false);
  const current = sections.find((s) => s.id === active)!;

  useEffect(() => setOpen(false), [active]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-line-soft bg-mist/70 backdrop-blur lg:block">
        <SidebarBody active={active} onGo={onGo} />
      </aside>

      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line-soft bg-canvas/95 px-4 backdrop-blur lg:hidden">
        <BrandMark size="sm" />
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink"
          aria-label="Open section menu"
        >
          <span className="font-mono text-[11px] text-magenta">{current.number}</span>
          <span className="max-w-[150px] truncate">{current.label}</span>
          <Menu className="size-4" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-ink/30 lg:hidden"
            />
            <motion.aside
              key="menu"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 left-0 z-50 w-[284px] max-w-[85vw] bg-canvas shadow-lift lg:hidden"
              role="dialog"
              aria-label="Sections"
            >
              <button onClick={() => setOpen(false)} className="absolute top-5 right-4 rounded-lg p-2 text-ink-3 hover:bg-mist" aria-label="Close menu">
                <X className="size-5" />
              </button>
              <SidebarBody active={active} onGo={onGo} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

import { motion } from 'framer-motion';
import { ChevronRight, RefreshCcw } from 'lucide-react';
import { stages } from '../data/journey';
import type { StageId } from '../data/types';
import { cn } from '../utils/cn';

/**
 * The eight-stage transformation with AI CONTROL spanning the whole lifecycle.
 * Gate markers show where formal control decisions are taken.
 */
export function LifecycleBand({
  active,
  highlight,
  onSelect,
  showItems = false,
  size = 'md',
}: {
  active?: StageId | null;
  highlight?: StageId[];
  onSelect?: (id: StageId) => void;
  showItems?: boolean;
  size?: 'md' | 'lg';
}) {
  const interactive = !!onSelect;
  return (
    <div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8 lg:gap-0">
        {stages.map((s, i) => {
          const isActive = active === s.id;
          const isLit = highlight ? highlight.includes(s.id) : true;
          const Tag = interactive ? motion.button : motion.div;
          return (
            <li key={s.id} className="relative lg:pr-3">
              <Tag
                {...(interactive ? { onClick: () => onSelect!(s.id), 'aria-pressed': isActive } : {})}
                whileHover={interactive ? { y: -2 } : undefined}
                className={cn(
                  'relative flex h-full w-full flex-col rounded-xl border text-left transition-colors duration-200',
                  size === 'lg' ? 'px-4 py-4' : 'px-3.5 py-3',
                  isActive
                    ? 'border-transparent bg-ink text-white shadow-lift'
                    : isLit
                      ? 'border-line-soft bg-surface shadow-card'
                      : 'border-line-soft bg-surface/60',
                  interactive && !isActive && 'hover:border-line',
                )}
              >
                <span className={cn('font-mono text-[11px] font-semibold', isActive ? 'text-white/70' : 'text-magenta')}>
                  {s.number}
                </span>
                <span
                  className={cn(
                    'mt-1 font-semibold tracking-tight uppercase',
                    size === 'lg' ? 'text-[15px]' : 'text-[13px]',
                    isActive ? 'text-white' : isLit ? 'text-ink' : 'text-ink-4',
                  )}
                >
                  {s.name}
                </span>
                {showItems && (
                  <span className={cn('mt-2 space-y-0.5 text-[12px] leading-snug', isActive ? 'text-white/80' : 'text-ink-3')}>
                    {s.items.map((it) => (
                      <span key={it} className="block">
                        {it}
                      </span>
                    ))}
                  </span>
                )}
              </Tag>
              {i < stages.length - 1 && (
                <ChevronRight
                  aria-hidden
                  className="absolute top-1/2 right-[-3px] z-10 hidden size-4 -translate-y-1/2 text-ink-4 lg:block"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* AI Control spans the lifecycle */}
      <div className="relative mt-3">
        <div className="control-gradient flex items-center justify-between gap-4 rounded-xl px-4 py-2.5 text-white">
          <span className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase">AI Control</span>
            <span className="hidden text-[13px] text-white/85 sm:inline">spans the lifecycle: permitted to know, decide and do</span>
          </span>
          <span className="hidden items-center gap-1.5 text-[12px] text-white/85 md:flex">
            <RefreshCcw className="size-3.5" /> Value feeds back into prioritisation
          </span>
        </div>
        <div className="mt-1.5 hidden grid-cols-8 lg:grid">
          {stages.map((s) => (
            <div key={s.id} className="pr-3">
              {s.gate && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-purple">
                  <span className="size-2 rotate-45 border border-purple bg-purple-soft" />
                  {s.gate}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

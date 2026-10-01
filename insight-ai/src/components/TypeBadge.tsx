import { categoryById } from '../data/taxonomy';
import type { CategoryId } from '../data/types';
import { categoryStyle } from '../utils/categoryStyle';
import { cn } from '../utils/cn';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

/**
 * Labels an object with its information-architecture category.
 * Hover or focus explains what that category means.
 */
export function TypeBadge({
  category,
  className,
  compact,
  focusable = true,
}: {
  category: CategoryId;
  className?: string;
  compact?: boolean;
  focusable?: boolean;
}) {
  const c = categoryById[category];
  const s = categoryStyle[category];
  return (
    <Tooltip focusable={focusable} content={<><strong className="font-semibold">{c.label}</strong>: {c.short}. {c.definition}</>}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em]',
          s.text,
          s.border,
          'bg-surface/80',
          className,
        )}
      >
        <Icon name={c.icon} className="size-3" />
        {compact ? c.label.split(' ')[0] : c.label}
      </span>
    </Tooltip>
  );
}

export function ControlBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white control-gradient',
        className,
      )}
    >
      <Icon name="ShieldCheck" className="size-3" />
      AI Control
    </span>
  );
}

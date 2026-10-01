import { acceleratorById } from '../data/accelerators';
import { capabilityById } from '../data/capabilities';
import { serviceById } from '../data/services';
import type { AcceleratorId, ServiceId } from '../data/types';
import { cn } from '../utils/cn';

/** Compact references to other objects, always colour-coded by category. */
export function ServiceTag({ id, short, className }: { id: ServiceId; short?: boolean; className?: string }) {
  const s = serviceById[id];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border border-magenta/20 bg-magenta-soft/70 px-2 py-1 text-[12.5px] leading-none font-medium text-ink', className)}>
      <span className="font-mono text-[11px] font-semibold text-magenta">S{s.number}</span>
      {short ? s.shortName : s.name}
    </span>
  );
}

export function AcceleratorTag({ id, className }: { id: AcceleratorId; className?: string }) {
  const a = acceleratorById[id];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border border-purple/20 bg-purple-soft/70 px-2 py-1 text-[12.5px] leading-none font-medium text-ink', className)}>
      <span className="size-1.5 rotate-45 bg-purple" />
      {a.name}
    </span>
  );
}

export function CapabilityTag({ id, className }: { id: string; className?: string }) {
  const c = capabilityById[id];
  if (!c) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border border-navy/15 bg-navy-soft/70 px-2 py-1 text-[12.5px] leading-none font-medium text-ink', className)}>
      <span className="size-1.5 rounded-full bg-navy" />
      {c.name}
    </span>
  );
}

export function PlainList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn('space-y-1.5', className)}>
      {items.map((i) => (
        <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-ink-2">
          <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-4" />
          {i}
        </li>
      ))}
    </ul>
  );
}

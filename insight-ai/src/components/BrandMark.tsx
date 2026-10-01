import { brand } from '../data/brand';
import { cn } from '../utils/cn';

/**
 * Brand wordmark. Uses the official logo file when one is configured in data/brand.ts;
 * otherwise a plain typeset name (never a redrawn logo).
 */
export function BrandMark({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  if (brand.logoSrc) {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <img src={brand.logoSrc} alt={brand.logoAlt} className={size === 'lg' ? 'h-8' : 'h-6'} />
        <span className="font-semibold tracking-tight text-ink">AI</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1.5 font-semibold tracking-[-0.02em] text-ink',
        size === 'lg' ? 'text-[22px]' : 'text-[17px]',
        className,
      )}
    >
      Insight<span className="text-magenta">AI</span>
    </span>
  );
}

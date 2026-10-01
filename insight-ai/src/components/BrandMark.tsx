import { brand } from '../data/brand';
import { cn } from '../utils/cn';

/**
 * Brand mark: the official Insight logo file exactly as supplied, with the product
 * name set beside it. Falls back to plain text only if no logo is configured.
 */
export function BrandMark({ className, size = 'md', showProduct = true }: { className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero'; showProduct?: boolean }) {
  const h = size === 'hero' ? 'h-24' : size === 'xl' ? 'h-12' : size === 'lg' ? 'h-10' : size === 'sm' ? 'h-6' : 'h-8';
  if (brand.logoSrc) {
    return (
      <span className={cn('inline-flex items-end gap-2.5', className)}>
        <img src={brand.logoSrc} alt={brand.logoAlt} className={cn(h, 'w-auto select-none')} draggable={false} />
        {showProduct && (
          <span className={cn('pb-[3px] leading-none font-semibold tracking-[0.18em] text-magenta uppercase', size === 'hero' ? 'pb-2 text-[26px]' : size === 'lg' || size === 'xl' ? 'text-[15px]' : 'text-[12px]')}>
            AI
          </span>
        )}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 font-semibold tracking-[-0.02em] text-ink', size === 'lg' ? 'text-[22px]' : 'text-[17px]', className)}>
      Insight<span className="text-magenta">AI</span>
    </span>
  );
}

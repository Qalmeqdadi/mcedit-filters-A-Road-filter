import { brand } from '../data/brand';
import { BrandMark } from './BrandMark';

export function Footer() {
  return (
    <footer className="border-t border-line-soft bg-canvas">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-4 px-4 py-10 text-[12.5px] text-ink-3 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
        <div className="flex items-center gap-3">
          <BrandMark size="sm" />
          <span className="h-4 w-px bg-line" />
          <span>{brand.line}</span>
        </div>
        <p className="max-w-xl leading-relaxed md:text-right">
          Strategic GTM and services architecture for discussion with Insight leadership, sales teams and senior clients.
          Contains no client data and no performance claims.
        </p>
      </div>
    </footer>
  );
}

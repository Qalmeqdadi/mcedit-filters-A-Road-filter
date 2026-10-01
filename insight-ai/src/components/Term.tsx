import type { ReactNode } from 'react';
import { glossary } from '../data/glossary';
import { Tooltip } from './Tooltip';

/** Inline glossary term with a dotted underline and definition tooltip. */
export function Term({ id, children }: { id: keyof typeof glossary; children?: ReactNode }) {
  const g = glossary[id];
  return (
    <Tooltip content={<><strong className="font-semibold text-white">{g.term}.</strong> {g.definition}</>}>
      <span className="cursor-help underline decoration-ink-4/60 decoration-dotted underline-offset-[3px]">
        {children ?? g.term}
      </span>
    </Tooltip>
  );
}

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Lightweight accessible tooltip: opens on hover and keyboard focus,
 * rendered in a portal so it is never clipped by cards or scaled stages.
 */
export function Tooltip({
  content,
  children,
  width = 280,
  focusable = true,
}: {
  content: ReactNode;
  children: ReactNode;
  width?: number;
  /** Set false when the tooltip sits inside another interactive element. */
  focusable?: boolean;
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    const below = r.top < 140;
    const x = Math.min(Math.max(r.left + r.width / 2, width / 2 + 12), window.innerWidth - width / 2 - 12);
    setPos({ x, y: below ? r.bottom + 8 : r.top - 8, below });
  }, [open, width]);

  return (
    <>
      <span
        ref={anchor}
        className="inline-flex"
        tabIndex={focusable ? 0 : undefined}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {open && pos &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{ left: pos.x, top: pos.y, width, transform: `translate(-50%, ${pos.below ? '0' : '-100%'})` }}
            className="pointer-events-none fixed z-[200] rounded-lg bg-ink px-3 py-2 text-[12.5px] leading-snug font-normal normal-case tracking-normal text-white/90 shadow-lift"
          >
            {content}
          </span>,
          document.body,
        )}
    </>
  );
}

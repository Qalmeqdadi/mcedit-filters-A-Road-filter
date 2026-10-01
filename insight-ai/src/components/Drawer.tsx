import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Right-hand detail drawer. Escape or the close button dismisses it.
 * Escape is consumed here so it does not also leave present mode.
 */
export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  width = 460,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    const t = window.setTimeout(() => panel.current?.focus(), 30);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.clearTimeout(t);
      lastFocus.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.aside
          key="drawer"
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-label={typeof title === 'string' ? title : 'Details'}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          style={{ width: `min(${width}px, 100vw)` }}
          className="fixed top-0 right-0 bottom-0 z-[120] flex flex-col border-l border-line bg-surface shadow-lift outline-none"
        >
          <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 pt-6 pb-5">
            <div className="min-w-0">
              {eyebrow && <div className="mb-2">{eyebrow}</div>}
              <h3 className="text-[22px] leading-tight font-semibold tracking-tight text-ink">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="-mt-1 -mr-2 rounded-lg p-2 text-ink-3 transition hover:bg-mist hover:text-ink"
              aria-label="Close details"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Labelled block used inside drawers and detail panels. */
export function DetailBlock({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className ?? 'mb-6'}>
      <div className="eyebrow mb-2.5">{label}</div>
      {children}
    </div>
  );
}

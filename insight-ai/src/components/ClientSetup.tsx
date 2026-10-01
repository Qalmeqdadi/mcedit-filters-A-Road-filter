import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { plays } from '../data/plays';
import { sectorById, sectors } from '../data/sectors';
import type { PlayId, SectorId } from '../data/types';
import { useClient } from '../hooks/useClient';
import { cn } from '../utils/cn';

const today = () => new Date().toISOString().slice(0, 10);

/** Dialog to tailor the app to one client: name, sector, meeting date and lead play. */
export function ClientSetup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, update, reset } = useClient();
  const [name, setName] = useState(session.name);
  const [sector, setSector] = useState<SectorId | ''>(session.sector ?? '');
  const [date, setDate] = useState(session.date || today());
  const [play, setPlay] = useState<PlayId | ''>(session.play ?? '');
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(session.name);
    setSector(session.sector ?? '');
    setDate(session.date || today());
    setPlay(session.play ?? '');
    const t = window.setTimeout(() => first.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const suggested = sector ? sectorById[sector].leadPlays[0] : null;

  const save = () => {
    update({ name: name.trim(), sector: sector || null, date, play: (play || suggested || null) as PlayId | null });
    onClose();
  };

  const field = 'mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-purple focus:shadow-[var(--shadow-focus)]';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/35 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-setup-title"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="w-full max-w-[520px] rounded-2xl bg-surface p-6 shadow-lift"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow mb-1.5">Client mode</div>
                <h2 id="client-setup-title" className="text-[22px] font-semibold tracking-tight text-ink">
                  Tailor this session to a client
                </h2>
                <p className="mt-1.5 text-[13.5px] leading-snug text-ink-3">
                  Pages open on the client’s sector, lead play and services. Everything stays in this browser.
                </p>
              </div>
              <button onClick={onClose} className="-mt-1 -mr-2 rounded-lg p-2 text-ink-3 hover:bg-mist" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <label className="block text-[12.5px] font-semibold text-ink-2">
                Client name
                <input ref={first} aria-label="Client name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ministry of Finance" className={field} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[12.5px] font-semibold text-ink-2">
                  Sector
                  <select
                    aria-label="Sector"
                    value={sector}
                    onChange={(e) => {
                      setSector(e.target.value as SectorId | '');
                      setPlay('');
                    }}
                    className={field}
                  >
                    <option value="">Not sector-specific</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[12.5px] font-semibold text-ink-2">
                  Meeting date
                  <input type="date" aria-label="Meeting date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
                </label>
              </div>
              <label className="block text-[12.5px] font-semibold text-ink-2">
                Lead play
                <select aria-label="Lead play" value={play || suggested || ''} onChange={(e) => setPlay(e.target.value as PlayId)} className={field}>
                  <option value="">Decide in the meeting</option>
                  {plays.map((p) => (
                    <option key={p.id} value={p.id}>
                      Play {p.number}: {p.name}
                      {p.id === suggested ? ' (typical for this sector)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                  className="text-[13px] font-medium text-ink-3 underline-offset-4 hover:text-stop hover:underline"
                >
                  Clear session
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:text-ink">
                    Cancel
                  </button>
                  <button type="submit" className={cn('rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-white hover:bg-ink-2')}>
                    Apply
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

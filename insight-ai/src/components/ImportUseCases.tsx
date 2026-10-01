import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useClient } from '../hooks/useClient';
import { downloadBlob, readSpreadsheet } from '../utils/spreadsheet';
import { mapUseCases, useCaseTemplate, type ImportResult } from '../utils/useCaseImport';

/** Import use cases from an Excel (.xlsx) or CSV file, with a preview before anything changes. */
export function ImportUseCases() {
  const { session, update } = useClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = !!(result || error);

  const close = () => {
    setResult(null);
    setError(null);
    setFile(null);
    if (input.current) input.current.value = '';
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setFile(f.name);
    try {
      const grid = await readSpreadsheet(f);
      const r = mapUseCases(grid);
      if (!r.items.length) setError(`No use cases found in ${f.name}. ${r.warnings.join(' ')} Check that there is a “Use case” column with one use case per row.`);
      else setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The file could not be read.');
    }
  };

  const apply = (mode: 'append' | 'replace') => {
    if (!result) return;
    update({ useCases: mode === 'replace' ? result.items : [...session.useCases, ...result.items] });
    close();
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".xlsx,.xlsm,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        data-testid="usecase-file"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink hover:border-ink-4"
      >
        <Upload className="size-4" /> Import from Excel
      </button>
      <button
        type="button"
        onClick={() => downloadBlob(useCaseTemplate(), 'Insight-AI-use-case-template.xlsx')}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-[12.5px] font-medium text-ink-3 hover:text-ink"
      >
        <Download className="size-4" /> Template
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/35 p-4"
              onMouseDown={(e) => e.target === e.currentTarget && close()}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-title"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex max-h-[86vh] w-full max-w-[760px] flex-col rounded-2xl bg-surface shadow-lift"
              >
                <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 pt-5 pb-4">
                  <div>
                    <div className="eyebrow mb-1 flex items-center gap-1.5">
                      <FileSpreadsheet className="size-3.5" /> {file}
                    </div>
                    <h2 id="import-title" className="text-[20px] font-semibold tracking-tight text-ink">
                      {result ? `${result.items.length} use case${result.items.length === 1 ? '' : 's'} ready to import` : 'Could not import this file'}
                    </h2>
                  </div>
                  <button onClick={close} className="-mt-1 -mr-2 rounded-lg p-2 text-ink-3 hover:bg-mist" aria-label="Close">
                    <X className="size-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {error && <p className="text-[14px] leading-relaxed text-ink-2">{error}</p>}
                  {result && (
                    <>
                      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
                        {Object.entries(result.columns).map(([k, v]) => (
                          <span key={k}>
                            <strong className="font-semibold text-ink-2">{k}:</strong> {v}
                          </span>
                        ))}
                      </div>
                      {(result.warnings.length > 0 || result.skipped > 0) && (
                        <ul className="mb-3 space-y-1 rounded-lg bg-cond-soft px-3 py-2 text-[12.5px] text-ink-2">
                          {result.warnings.map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                          {result.skipped > 0 && <li>{result.skipped} empty or example row{result.skipped === 1 ? '' : 's'} skipped.</li>}
                        </ul>
                      )}
                      <div className="overflow-x-auto rounded-lg border border-line-soft">
                        <table className="w-full min-w-[560px] text-left text-[12.5px]">
                          <thead>
                            <tr className="border-b border-line-soft bg-mist/60 text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
                              <th className="px-3 py-1.5 font-semibold">Use case</th>
                              <th className="px-2 py-1.5 font-semibold">Owner / function</th>
                              <th className="px-2 py-1.5 font-semibold">Value</th>
                              <th className="px-2 py-1.5 font-semibold">Readiness</th>
                              <th className="px-2 py-1.5 font-semibold">Risk</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.items.slice(0, 12).map((u) => (
                              <tr key={u.id} className="border-b border-line-soft last:border-0">
                                <td className="px-3 py-1.5 font-medium text-ink">
                                  {u.name}
                                  {u.needsScoring && <span className="ml-1.5 rounded bg-cond-soft px-1 text-[10.5px] font-semibold text-cond">needs scoring</span>}
                                </td>
                                <td className="px-2 py-1.5 text-ink-3">{[u.owner, u.domain].filter(Boolean).join(' · ') || '–'}</td>
                                <td className="px-2 py-1.5 tabular-nums">{u.value}</td>
                                <td className="px-2 py-1.5 tabular-nums">{u.readiness}</td>
                                <td className="px-2 py-1.5">{u.risk}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {result.items.length > 12 && <p className="mt-2 text-[12px] text-ink-3">…and {result.items.length - 12} more.</p>}
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft px-6 py-4">
                  {result ? (
                    <>
                      <button onClick={close} className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 hover:text-ink">
                        Cancel
                      </button>
                      {session.useCases.length > 0 && (
                        <button onClick={() => apply('replace')} className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink hover:border-ink-4">
                          Replace current {session.useCases.length}
                        </button>
                      )}
                      <button onClick={() => apply('append')} className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-white hover:bg-ink-2">
                        {session.useCases.length ? `Add to current ${session.useCases.length}` : 'Import'}
                      </button>
                    </>
                  ) : (
                    <button onClick={close} className="rounded-full bg-ink px-5 py-2 text-[13px] font-medium text-white hover:bg-ink-2">
                      Close
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

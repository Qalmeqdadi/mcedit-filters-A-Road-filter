import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Level = 'executive' | 'detail';
export type Mode = 'explore' | 'present';

interface AppState {
  level: Level;
  setLevel: (l: Level) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
}

const Ctx = createContext<AppState | null>(null);

function initialMode(): Mode {
  if (typeof window === 'undefined') return 'explore';
  return window.location.hash.startsWith('#present') ? 'present' : 'explore';
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<Level>('executive');
  const [mode, setMode] = useState<Mode>(initialMode);
  const value = useMemo(() => ({ level, setLevel, mode, setMode }), [level, mode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}

/** True when the practitioner (detail) view is active. */
export function useDetail() {
  return useAppState().level === 'detail';
}

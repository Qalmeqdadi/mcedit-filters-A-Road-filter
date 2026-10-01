import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PlayId, SectorId } from '../data/types';

export type Risk = 'Low' | 'Medium' | 'High';

export interface UseCase {
  id: string;
  name: string;
  value: number;
  readiness: number;
  risk: Risk;
}

export interface ClientSession {
  name: string;
  sector: SectorId | null;
  date: string;
  play: PlayId | null;
  scores: Record<string, number | null>;
  targets: Record<string, number>;
  useCases: UseCase[];
  notes: string;
}

const KEY = 'insight-ai-client-session-v1';

const empty: ClientSession = { name: '', sector: null, date: '', play: null, scores: {}, targets: {}, useCases: [], notes: '' };

function load(): ClientSession {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...empty, ...JSON.parse(raw) };
  } catch {
    /* storage blocked: start empty */
  }
  return empty;
}

interface Ctx {
  session: ClientSession;
  active: boolean;
  update: (patch: Partial<ClientSession>) => void;
  reset: () => void;
}

const ClientCtx = createContext<Ctx | null>(null);

/**
 * The client workshop session (client, sector, scores, use cases, notes).
 * Kept in this browser only, so a prepared session survives a reload. Nothing leaves the device.
 */
export function ClientProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ClientSession>(load);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      /* storage blocked: session lasts for this visit only */
    }
  }, [session]);

  const update = useCallback((patch: Partial<ClientSession>) => setSession((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setSession(empty), []);
  const value = useMemo(() => ({ session, active: !!(session.name || session.sector), update, reset }), [session, update, reset]);
  return <ClientCtx.Provider value={value}>{children}</ClientCtx.Provider>;
}

export function useClient() {
  const ctx = useContext(ClientCtx);
  if (!ctx) throw new Error('useClient must be used inside ClientProvider');
  return ctx;
}

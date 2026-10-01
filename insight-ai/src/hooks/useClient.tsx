import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AiStageId } from '../data/assessment';
import type { PlayId, SectorId } from '../data/types';

export type Risk = 'Low' | 'Medium' | 'High';

export interface UseCase {
  id: string;
  name: string;
  value: number;
  readiness: number;
  risk: Risk;
  description?: string;
  owner?: string;
  domain?: string;
  /** Imported without a score; defaulted to 3 until someone scores it. */
  needsScoring?: boolean;
  /** Other columns from an imported sheet (e.g. stage, impact type), kept as context for the AI agent. */
  extra?: Record<string, string>;
  /** Set when scores were proposed by the AI agent and accepted by a person. */
  ai?: AiScoreNote;
}

export interface AiScoreNote {
  value: string;
  readiness: string;
  risk: string;
  keyRisks: string[];
  confidence: 'Low' | 'Medium' | 'High';
  model: string;
  at: string;
}

export interface ClientProfile {
  summary: string;
  sources: { title: string; url: string }[];
  forClient: string;
  at: string;
}

/** An answer is a 1–5 score or "don't know". */
export type Answer = number | 'dk';

export interface ClientSession {
  name: string;
  sector: SectorId | null;
  date: string;
  play: PlayId | null;
  aiStage: AiStageId | null;
  answers: Record<string, Answer>;
  targets: Record<string, number>;
  useCases: UseCase[];
  notes: string;
  /** Consultant's context for the AI agent, e.g. strategy, constraints. */
  aiContext: string;
  /** Last client research produced by the AI agent. */
  aiProfile: ClientProfile | null;
}

const KEY = 'insight-ai-client-session-v2';
const LEGACY_KEY = 'insight-ai-client-session-v1';

const empty: ClientSession = { name: '', sector: null, date: '', play: null, aiStage: null, answers: {}, targets: {}, useCases: [], notes: '', aiContext: '', aiProfile: null };

function load(): ClientSession {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...empty, ...JSON.parse(raw) };
    // Carry over client details and use cases from the earlier session format.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const { name, sector, date, play, useCases, notes } = JSON.parse(legacy);
      return { ...empty, name: name ?? '', sector: sector ?? null, date: date ?? '', play: play ?? null, useCases: useCases ?? [], notes: notes ?? '' };
    }
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

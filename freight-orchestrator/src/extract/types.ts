// One extracted value with its own confidence and the exact source text it came from (4.3.2, 4.3.3).
// Shared by request intake (1.1.3) and carrier-reply extraction (4.3.1), rule-based or model-based.

export interface SourceSpan {
  text: string;
  start: number;
  end: number;
}

export interface ExtractedField<T = unknown> {
  field: string;
  /** null when the source does not state it. */
  value: T | null;
  /** 0 to 1. A missing value has confidence 0. */
  confidence: number;
  source?: SourceSpan;
  /** Extractor id and version, e.g. "rules@1" or "claude-opus-5-5@reply-v1". Written to the audit record. */
  by: string;
  /** Why the extractor is unsure, shown to the reviewer. */
  note?: string;
}

export type Fields = Record<string, ExtractedField>;

/** The source text between two offsets, trimmed of surrounding whitespace so the highlight sits on the words. */
export function span(src: string, start: number, end: number): SourceSpan {
  while (start < end && /\s/.test(src[start]!)) start++;
  while (end > start && /\s/.test(src[end - 1]!)) end--;
  return { text: src.slice(start, end), start, end };
}

/** Finds a quoted snippet in the source, case-insensitively, for extractors that return quotes instead of offsets. */
export function locate(src: string, quote: string | undefined | null): SourceSpan | undefined {
  if (!quote) return undefined;
  const i = src.indexOf(quote);
  if (i >= 0) return span(src, i, i + quote.length);
  const j = src.toLowerCase().indexOf(quote.toLowerCase());
  return j >= 0 ? span(src, j, j + quote.length) : undefined;
}

export const valueOf = <T>(f: Fields, k: string): T | null => (f[k]?.value ?? null) as T | null;

import type { Risk, UseCase } from '../hooks/useClient';
import { buildXlsx } from './spreadsheet';

/**
 * Maps rows from a client's spreadsheet to use cases. Headers are matched flexibly
 * ("Use case", "Initiative", "Value", "Business value", "Feasibility"...). Scores may
 * be 1–5 numbers or High / Medium / Low. Missing scores default to 3 and are flagged.
 */
export interface ImportResult {
  items: UseCase[];
  warnings: string[];
  skipped: number;
  columns: Record<string, string>;
}

const FIELDS: { key: keyof UseCase; label: string; match: RegExp }[] = [
  { key: 'name', label: 'Use case', match: /^(use[\s_-]*case|use[\s_-]*case name|name|title|initiative|opportunity|idea)\b/i },
  { key: 'description', label: 'Description', match: /desc|detail|summary|problem/i },
  { key: 'owner', label: 'Business owner', match: /owner|sponsor|lead|accountable/i },
  { key: 'domain', label: 'Function / domain', match: /function|domain|department|business unit|area|team/i },
  { key: 'value', label: 'Value', match: /value|benefit|impact/i },
  { key: 'readiness', label: 'Readiness', match: /readiness|feasib|ease|ready/i },
  { key: 'risk', label: 'Risk', match: /risk/i },
];

const newId = () => Math.random().toString(36).slice(2, 9);

function score(raw: string | undefined): number | null {
  if (raw == null) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/^(very high|vh)$/.test(s)) return 5;
  if (/^(high|h)$/.test(s)) return 4;
  if (/^(medium|med|m|moderate)$/.test(s)) return 3;
  if (/^(low|l)$/.test(s)) return 2;
  if (/^(very low|vl)$/.test(s)) return 1;
  const n = parseFloat(s.replace(',', '.'));
  if (Number.isNaN(n)) return null;
  // Accept 1–5, or 1–10 scales scaled down.
  const v = n > 5 && n <= 10 ? n / 2 : n;
  return Math.min(5, Math.max(1, Math.round(v)));
}

function risk(raw: string | undefined): Risk | null {
  if (raw == null) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/^(h|high|very high|vh|critical)/.test(s)) return 'High';
  if (/^(m|med|medium|moderate)/.test(s)) return 'Medium';
  if (/^(l|low|very low|vl|minimal)/.test(s)) return 'Low';
  const n = parseFloat(s);
  if (!Number.isNaN(n)) return n >= 4 ? 'High' : n >= 3 ? 'Medium' : 'Low';
  return null;
}

export function mapUseCases(grid: string[][]): ImportResult {
  const rows = grid.filter((r) => r && r.some((c) => (c ?? '').toString().trim() !== ''));
  const warnings: string[] = [];
  if (!rows.length) return { items: [], warnings: ['The sheet is empty.'], skipped: 0, columns: {} };

  // Find the header row: the first row (of the first five) that names a use-case column.
  let headerIdx = rows.slice(0, 5).findIndex((r) => r.some((c) => FIELDS[0].match.test((c ?? '').trim())));
  const map: Partial<Record<keyof UseCase, number>> = {};
  if (headerIdx >= 0) {
    rows[headerIdx].forEach((c, i) => {
      const h = (c ?? '').trim();
      for (const f of FIELDS) if (map[f.key] == null && f.match.test(h)) {
        map[f.key] = i;
        break;
      }
    });
  } else {
    headerIdx = -1;
    Object.assign(map, { name: 0, value: 1, readiness: 2, risk: 3 });
    warnings.push('No header row found; read columns as Use case, Value, Readiness, Risk.');
  }

  const columns: Record<string, string> = {};
  for (const f of FIELDS) {
    const i = map[f.key];
    columns[f.label] = i == null ? 'not found' : headerIdx >= 0 ? `“${rows[headerIdx][i]}”` : `column ${String.fromCharCode(65 + i)}`;
  }

  let skipped = 0;
  let defaulted = 0;
  const items: UseCase[] = [];
  for (const r of rows.slice(headerIdx + 1)) {
    const name = (r[map.name ?? 0] ?? '').toString().trim();
    if (!name || /^example\b/i.test(name)) {
      skipped++;
      continue;
    }
    const v = map.value != null ? score(r[map.value]) : null;
    const rd = map.readiness != null ? score(r[map.readiness]) : null;
    const rk = map.risk != null ? risk(r[map.risk]) : null;
    const needsScoring = v == null || rd == null;
    if (needsScoring) defaulted++;
    const get = (k: keyof UseCase) => (map[k] != null ? (r[map[k]!] ?? '').toString().trim() || undefined : undefined);
    items.push({
      id: newId(),
      name: name.slice(0, 140),
      value: v ?? 3,
      readiness: rd ?? 3,
      risk: rk ?? 'Medium',
      description: get('description'),
      owner: get('owner'),
      domain: get('domain'),
      needsScoring: needsScoring || undefined,
    });
  }
  if (map.value == null) warnings.push('No value column found; value set to 3 for every use case.');
  if (map.readiness == null) warnings.push('No readiness column found; readiness set to 3 for every use case.');
  if (defaulted && map.value != null && map.readiness != null) warnings.push(`${defaulted} use case${defaulted === 1 ? '' : 's'} had a missing score, set to 3 and flagged for scoring.`);
  return { items, warnings, skipped, columns };
}

/** Template the client can fill in. Rows starting with "Example" are ignored on import. */
export function useCaseTemplate() {
  return buildXlsx(
    [
      ['Use case', 'Description', 'Business owner', 'Function / domain', 'Value (1-5)', 'Readiness (1-5)', 'Risk (Low/Medium/High)'],
      ['Example – Invoice exception handling', 'Agents resolve invoice mismatches and route exceptions', 'Head of Accounts Payable', 'Finance', 4, 3, 'Medium'],
      ['Example – Contract obligation extraction', 'Extract obligations and renewal dates from contracts', 'General Counsel', 'Legal', 3, 4, 'Low'],
    ],
    'Use cases',
    [42, 52, 26, 20, 12, 15, 22],
  );
}

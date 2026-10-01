import { useState } from 'react';
import { maturityDimensions, maturityLevels } from '../data/workshop';
import type { ClientSession } from '../hooks/useClient';
import { targetFor } from '../utils/workshop';

const NOW = '#d4006f';
const TARGET = '#6b2bd9';

/**
 * Maturity radar: the client's current score (solid magenta) against their target
 * (dashed purple). Both series are labelled in a legend; hover any axis for values.
 */
export function RadarChart({ session, size = 380, showLegend = true }: { session: ClientSession; size?: number; showLegend?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const dims = maturityDimensions;
  const pad = 74;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - pad;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / dims.length;
  const pt = (i: number, v: number) => [cx + Math.cos(angle(i)) * (r * v) / 5, cy + Math.sin(angle(i)) * (r * v) / 5];
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(',')).join(' ');
  const now = dims.map((d) => session.scores[d.id] ?? 0);
  const target = dims.map((d) => targetFor(session, d.id));
  const anyScored = now.some((v) => v > 0);
  const h = hover != null ? dims[hover] : null;

  return (
    <figure className="relative m-0">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full" role="img" aria-label="Maturity radar: current score against target for each dimension">
        {[1, 2, 3, 4, 5].map((ring) => (
          <polygon key={ring} points={poly(dims.map(() => ring))} fill="none" stroke="#e5e1da" strokeWidth={ring === 5 ? 1.2 : 0.8} />
        ))}
        {dims.map((_, i) => {
          const [x, y] = pt(i, 5);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e1da" strokeWidth={0.8} />;
        })}
        {[1, 3, 5].map((ring) => {
          const [, y] = pt(0, ring);
          return (
            <text key={ring} x={cx + 4} y={y + 3} fontSize={9} fill="#6b7289">
              {ring}
            </text>
          );
        })}
        <polygon points={poly(target)} fill="none" stroke={TARGET} strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" />
        {anyScored && <polygon points={poly(now)} fill={NOW} fillOpacity={0.12} stroke={NOW} strokeWidth={2} strokeLinejoin="round" />}
        {anyScored &&
          now.map((v, i) => {
            if (!v) return null;
            const [x, y] = pt(i, v);
            return <circle key={i} cx={x} cy={y} r={hover === i ? 6 : 4.5} fill={NOW} stroke="#fff" strokeWidth={2} />;
          })}
        {dims.map((d, i) => {
          const [x, y] = pt(i, 5.75);
          const a = Math.cos(angle(i));
          const anchor = Math.abs(a) < 0.2 ? 'middle' : a > 0 ? 'start' : 'end';
          return (
            <text key={d.id} x={x} y={y + 3.5} fontSize={10} fontWeight={hover === i ? 700 : 500} fill={hover === i ? '#0b1a3a' : '#2e3a57'} textAnchor={anchor}>
              {d.short}
            </text>
          );
        })}
        {/* Hover targets: generous wedges per axis */}
        {dims.map((d, i) => {
          const a1 = angle(i - 0.5);
          const a2 = angle(i + 0.5);
          const R = r * 1.25;
          const p = `M ${cx} ${cy} L ${cx + Math.cos(a1) * R} ${cy + Math.sin(a1) * R} L ${cx + Math.cos(a2) * R} ${cy + Math.sin(a2) * R} Z`;
          return <path key={d.id} d={p} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />;
        })}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-2 left-2 rounded-lg bg-ink px-3 py-2 text-[12px] leading-snug text-white shadow-lift">
          <div className="font-semibold">{h.name}</div>
          <div className="text-white/80">
            Now: {session.scores[h.id] ? `${session.scores[h.id]} · ${maturityLevels[session.scores[h.id]! - 1].name}` : 'not scored'}
          </div>
          <div className="text-white/80">Target: {targetFor(session, h.id)}</div>
        </div>
      )}
      {showLegend && (
        <figcaption className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[12px] text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="h-[3px] w-5 rounded-full" style={{ background: NOW }} /> Now (client’s score)
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="20" height="4" aria-hidden>
              <line x1="0" y1="2" x2="20" y2="2" stroke={TARGET} strokeWidth="2" strokeDasharray="5 4" />
            </svg>
            Target
          </span>
        </figcaption>
      )}
    </figure>
  );
}

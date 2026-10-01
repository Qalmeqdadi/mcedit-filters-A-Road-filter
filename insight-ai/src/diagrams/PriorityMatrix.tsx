import { useState } from 'react';
import { quadrants, type Quadrant } from '../data/workshop';
import type { RankedUseCase } from '../utils/workshop';

/**
 * Value × readiness 2×2. Each use case is a numbered dot (number = rank) with a hover
 * tooltip; high-risk use cases carry a red ring and a "!" so risk is never colour-alone.
 */
export function PriorityMatrix({ items, size = 420 }: { items: RankedUseCase[]; size?: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const m = { l: 44, r: 12, t: 12, b: 40 };
  const w = size - m.l - m.r;
  const hgt = size - m.t - m.b;
  const x = (v: number) => m.l + ((v - 0.5) / 5) * w;
  const y = (v: number) => m.t + hgt - ((v - 0.5) / 5) * hgt;
  const split = { x: x(2.5), y: y(2.5) };

  // Offset dots that share a cell so none hide another.
  const seen = new Map<string, number>();
  const placed = items.map((u) => {
    const k = `${u.value}-${u.readiness}`;
    const n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    const ang = (n * 2 * Math.PI) / 6;
    const off = n === 0 ? 0 : 23;
    return { u, cx: x(u.readiness) + Math.cos(ang) * off, cy: y(u.value) + Math.sin(ang) * off };
  });

  const label = (q: Quadrant, tx: number, ty: number, anchor: 'start' | 'end') => (
    <text x={tx} y={ty} fontSize={10.5} fontWeight={600} letterSpacing="0.08em" fill="#6b7289" textAnchor={anchor}>
      {quadrants[q].name.toUpperCase()}
    </text>
  );
  const hv = placed.find((p) => p.u.id === hover);

  return (
    <figure className="relative m-0">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full" role="img" aria-label="Use cases plotted by value and readiness">
        <rect x={split.x} y={m.t} width={m.l + w - split.x} height={split.y - m.t} fill="#fce8f2" opacity={0.6} />
        <rect x={m.l} y={m.t} width={w} height={hgt} fill="none" stroke="#dcd7ce" />
        <line x1={split.x} y1={m.t} x2={split.x} y2={m.t + hgt} stroke="#dcd7ce" strokeDasharray="4 4" />
        <line x1={m.l} y1={split.y} x2={m.l + w} y2={split.y} stroke="#dcd7ce" strokeDasharray="4 4" />
        {label('lighthouse', m.l + w - 8, m.t + 18, 'end')}
        {label('strategic', m.l + 8, m.t + 18, 'start')}
        {label('quick', m.l + w - 8, m.t + hgt - 10, 'end')}
        {label('park', m.l + 8, m.t + hgt - 10, 'start')}
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <text x={x(v)} y={m.t + hgt + 16} fontSize={10} fill="#6b7289" textAnchor="middle">{v}</text>
            <text x={m.l - 10} y={y(v) + 3.5} fontSize={10} fill="#6b7289" textAnchor="end">{v}</text>
          </g>
        ))}
        <text x={m.l + w / 2} y={size - 6} fontSize={11} fontWeight={600} fill="#2e3a57" textAnchor="middle">Readiness →</text>
        <text x={12} y={m.t + hgt / 2} fontSize={11} fontWeight={600} fill="#2e3a57" textAnchor="middle" transform={`rotate(-90 12 ${m.t + hgt / 2})`}>
          Value →
        </text>
        {placed.map(({ u, cx, cy }) => (
          <g key={u.id} onMouseEnter={() => setHover(u.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
            <circle cx={cx} cy={cy} r={18} fill="transparent" />
            {u.risk === 'High' && <circle cx={cx} cy={cy} r={14} fill="none" stroke="#b42318" strokeWidth={2} />}
            <circle cx={cx} cy={cy} r={hover === u.id ? 11.5 : 10} fill="#d4006f" stroke="#fff" strokeWidth={2} />
            <text x={cx} y={cy + 3.8} fontSize={10.5} fontWeight={700} fill="#fff" textAnchor="middle">{u.rank}</text>
            {u.risk === 'High' && (
              <text x={cx + 13} y={cy - 9} fontSize={11} fontWeight={800} fill="#b42318">!</text>
            )}
          </g>
        ))}
      </svg>
      {hv && (
        <div className="pointer-events-none absolute top-2 left-14 max-w-[240px] rounded-lg bg-ink px-3 py-2 text-[12px] leading-snug text-white shadow-lift">
          <div className="font-semibold">{hv.u.rank}. {hv.u.name}</div>
          <div className="text-white/80">Value {hv.u.value} · Readiness {hv.u.readiness} · {hv.u.risk} risk</div>
          <div className="text-white/80">{quadrants[hv.u.quadrant].name}: {quadrants[hv.u.quadrant].action}</div>
        </div>
      )}
    </figure>
  );
}

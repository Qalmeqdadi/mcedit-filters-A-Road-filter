import { DEMAND, RATE_BAND, RATE_FUT, RATE_PAST, WEEKS, type Scored } from "../data";

/** Hours from request to quote, pilot desk, last 8 weeks. */
export function HoursChart() {
  const cw = 440, ch = 170, bw = 30, gap = (cw - 30 - WEEKS.length * bw) / WEEKS.length;
  const lx = 30 + gap / 2 + 4 * (bw + gap) - gap / 2;
  return (
    <svg viewBox={`0 0 ${cw} ${ch}`} width="100%" role="img" aria-label="Hours to quote fell from about 55 to under 2 after launch in week 5">
      {[0, 30, 60].map((v) => {
        const y = ch - 18 - (v / 60) * (ch - 30);
        return (
          <g key={v}>
            <line x1="30" x2={cw} y1={y} y2={y} stroke="var(--line)" />
            <text x="22" y={y + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{v}</text>
          </g>
        );
      })}
      {WEEKS.map((v, i) => {
        const x = 30 + gap / 2 + i * (bw + gap), h = (v / 60) * (ch - 30), y = ch - 18 - h, on = i >= 4;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} rx="4" fill={on ? "var(--teal)" : "var(--line-2)"} />
            <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)">{v}</text>
            <text x={x + bw / 2} y={ch - 3} textAnchor="middle" fontSize="10.5" fill="var(--muted)">W{i + 1}</text>
          </g>
        );
      })}
      <line x1={lx} x2={lx} y1="8" y2={ch - 18} stroke="var(--signal)" strokeWidth="2" strokeDasharray="4 3" />
      <text x={lx + 6} y="18" fontSize="11" fontWeight="700" fill="var(--ink)">Platform live</text>
    </svg>
  );
}

/** Price against transit for the eligible carriers; bubble size is the on-time record. */
export function Scatter({ ranked, selected, onPick }: { ranked: Scored[]; selected: string; onPick: (id: string) => void }) {
  const W = 460, H = 220, pl = 50, pr = 16, pt = 16, pb = 36;
  const x = (p: number) => pl + ((p - 1850) / (2550 - 1850)) * (W - pl - pr);
  const y = (d: number) => pt + ((d - 14) / (26 - 14)) * (H - pt - pb);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Price versus transit time for eligible carriers">
      <rect x={pl} y={pt} width={(W - pl - pr) / 2} height={(H - pt - pb) / 2} fill="var(--teal-soft)" opacity=".6" />
      <text x={pl + 8} y={pt + 15} fontSize="11" fontWeight="700" fill="var(--teal)">Cheaper and faster</text>
      {[1900, 2100, 2300, 2500].map((p) => (
        <g key={p}>
          <line x1={x(p)} x2={x(p)} y1={pt} y2={H - pb} stroke="var(--line)" />
          <text x={x(p)} y={H - pb + 15} textAnchor="middle" fontSize="10.5" fill="var(--muted)">${p.toLocaleString()}</text>
        </g>
      ))}
      {[16, 20, 24].map((d) => (
        <g key={d}>
          <line x1={pl} x2={W - pr} y1={y(d)} y2={y(d)} stroke="var(--line)" />
          <text x={pl - 7} y={y(d) + 4} textAnchor="end" fontSize="10.5" fill="var(--muted)">{d} d</text>
        </g>
      ))}
      {ranked.map((c) => {
        const r = 9 + (c.rel - 75) * 0.55, sel = c.id === selected, cx = x(Math.min(2550, Math.max(1850, c.price))), right = cx > W - 110;
        return (
          <g key={c.id} style={{ cursor: "pointer" }} onClick={() => onPick(c.id)}>
            {sel && <circle cx={cx} cy={y(c.days)} r={r + 5} fill="none" stroke="var(--signal)" strokeWidth="3" />}
            <circle cx={cx} cy={y(c.days)} r={r} fill={c.color} opacity=".92" />
            <text x={cx} y={y(c.days) + 4} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff">{c.id}</text>
            <text x={right ? cx - r - 5 : cx + r + 5} y={y(c.days) + 4} textAnchor={right ? "end" : "start"} fontSize="11" fontWeight="600" fill="var(--ink-2)">{c.name.split(" ")[0]}</text>
          </g>
        );
      })}
      <text x={W - pr} y={H - 3} textAnchor="end" fontSize="10.5" fill="var(--muted)">All-in price</text>
    </svg>
  );
}

/** Rate history and an 8-week forecast with its uncertainty band. */
export function RateChart() {
  const W = 640, H = 240, pl = 50, pr = 16, pt = 16, pb = 30;
  const n = RATE_PAST.length + RATE_FUT.length;
  const x = (i: number) => pl + (i / (n - 1)) * (W - pl - pr);
  const y = (v: number) => pt + ((2900 - v) / (2900 - 1900)) * (H - pt - pb);
  const fl = [RATE_PAST.length - 1, ...RATE_FUT.map((_, i) => RATE_PAST.length + i)];
  const fv = [RATE_PAST[RATE_PAST.length - 1], ...RATE_FUT];
  const fb = [0, ...RATE_BAND];
  const band = [...fl.map((i, k) => `${x(i)},${y(fv[k] + fb[k])}`), ...fl.slice().reverse().map((i, k) => {
    const kk = fl.length - 1 - k;
    return `${x(i)},${y(fv[kk] - fb[kk])}`;
  })].join(" ");
  const tx = x(RATE_PAST.length - 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Rate history and 8 week forecast, peaking mid October">
      {[2000, 2250, 2500, 2750].map((v) => (
        <g key={v}>
          <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={pl - 8} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="var(--muted)">{(v / 1000).toFixed(2)}k</text>
        </g>
      ))}
      <polygon points={band} fill="var(--signal)" opacity=".18" />
      <polyline points={RATE_PAST.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke="var(--ink)" strokeWidth="2.5" />
      <polyline points={fl.map((i, k) => `${x(i)},${y(fv[k])}`).join(" ")} fill="none" stroke="var(--signal)" strokeWidth="2.5" strokeDasharray="6 4" />
      <line x1={tx} x2={tx} y1={pt} y2={H - pb} stroke="var(--ink-2)" strokeDasharray="3 3" />
      <text x={tx + 6} y={pt + 10} fontSize="11" fontWeight="700" fill="var(--ink)">Today</text>
      <circle cx={x(15)} cy={y(2640)} r="4" fill="var(--signal)" />
      <text x={x(15)} y={y(2640) - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)">Peak ~USD 2,640</text>
      <text x={pl} y={H - 8} fontSize="10.5" fill="var(--muted)">12 weeks ago</text>
      <text x={W - pr} y={H - 8} textAnchor="end" fontSize="10.5" fill="var(--muted)">+8 weeks</text>
    </svg>
  );
}

/** Quote requests on the carrier's main lane, past 4 and next 4 weeks. */
export function DemandChart() {
  const W = 420, H = 150;
  const lbl = ["−3w", "−2w", "−1w", "Now", "+1w", "+2w", "+3w", "+4w"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Rising quote requests expected over the next four weeks">
      {DEMAND.map((v, i) => {
        const bw = 34, x = 20 + i * 50, h = (v / 50) * (H - 30), yy = H - 18 - h;
        return (
          <g key={i}>
            <rect x={x} y={yy} width={bw} height={h} rx="4" fill={i >= 4 ? "var(--signal)" : "var(--line-2)"} />
            <text x={x + bw / 2} y={yy - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)">{v}</text>
            <text x={x + bw / 2} y={H - 3} textAnchor="middle" fontSize="10.5" fill="var(--muted)">{lbl[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

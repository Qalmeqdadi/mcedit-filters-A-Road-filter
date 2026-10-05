import type { ReactNode } from "react";
import type { Tone } from "../data";

export function Pill({ tone = "idle", children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`pill ${tone}`}>
      {dot && <span className="dotc" />}
      {children}
    </span>
  );
}

export function Stat({ label, value, delta, tone }: { label: string; value: ReactNode; delta?: ReactNode; tone?: "bad" }) {
  return (
    <div className="stat">
      <span className="muted sm">{label}</span>
      <b>{value}</b>
      {delta && <span className={`d${tone ? " " + tone : ""}`}>{delta}</span>}
    </div>
  );
}

export function Meter({ v, tone }: { v: number; tone?: "over" | "warn" | "ink" }) {
  return (
    <div className={`meter${tone ? " " + tone : ""}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
    </div>
  );
}

export function Card({ title, sub, right, children, className = "", pad = false }: { title?: ReactNode; sub?: ReactNode; right?: ReactNode; children?: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="card-h">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <p className="muted sm">{sub}</p>}
          </div>
          {right}
        </header>
      )}
      {pad ? <div className="pad">{children}</div> : children}
    </section>
  );
}

export function Mono({ id, color, size = 32 }: { id: string; color: string; size?: number }) {
  return (
    <span className="mono" style={{ background: color, width: size, height: size, fontSize: size * 0.38 }}>
      {id}
    </span>
  );
}

export function Ring({ v, color }: { v: number; color: string }) {
  const r = 17, c = 2 * Math.PI * r;
  return (
    <span className="ring">
      <svg viewBox="0 0 42 42" width="42" height="42" aria-hidden>
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--sunk)" strokeWidth="4.5" />
        <circle cx="21" cy="21" r={r} fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} transform="rotate(-90 21 21)" />
      </svg>
      <b>{v}</b>
    </span>
  );
}

export function Head({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="sec-h">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Banner({ tone, children, who }: { tone: "live" | "road"; children: ReactNode; who?: string }) {
  return (
    <div className="banner">
      <Pill tone={tone === "live" ? "ok" : "warn"}>{tone === "live" ? "Live MVP" : "Roadmap preview"}</Pill>
      <span className="muted sm">{children}</span>
      {who && <span className="muted sm banner-who">Signed in as {who}</span>}
    </div>
  );
}

export function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <button type="button" className="toggle" role="switch" aria-checked={on} aria-label={label} onClick={onClick} />;
}

export function HBar({ label, v, max, right, color }: { label: ReactNode; v: number; max: number; right: ReactNode; color?: string }) {
  return (
    <div className="hbar">
      <span className="sm">{label}</span>
      <div className="t">
        <i style={{ width: `${(v / max) * 100}%`, background: color }} />
      </div>
      <b className="num sm">{right}</b>
    </div>
  );
}

export const Check = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#fff" strokeWidth="3" aria-hidden>
    <path d="m5 12 5 5 9-10" />
  </svg>
);

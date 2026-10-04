import type { ReactNode } from "react";
import { bookedPallets, heldPallets, liveHolds } from "../sim/engine";
import type { Departure } from "../sim/types";

export function Chip({ tone = "neutral", children, title }: { tone?: "neutral" | "accent" | "held" | "ok" | "bad" | "cold"; children: ReactNode; title?: string }) {
  return <span className={`chip chip-${tone}`} title={title}>{children}</span>;
}

/** Process address from the architecture map, e.g. 4.4.3. */
export function Addr({ a }: { a: string }) {
  return <span className="addr" title={`Process ${a}`}>{a}</span>;
}

export function CapBar({ d, preview = 0, compact = false }: { d: Departure; preview?: number; compact?: boolean }) {
  const b = bookedPallets(d);
  const h = heldPallets(d);
  const p = Math.min(preview, Math.max(0, d.slots - b - h));
  const f = Math.max(0, d.slots - b - h - p);
  const pct = (n: number) => `${(n / d.slots) * 100}%`;
  return (
    <div className={`capbar${compact ? " is-compact" : ""}`} role="img" aria-label={`${b} booked, ${h} held, ${f} free of ${d.slots} pallet slots`}>
      <span className="seg seg-booked" style={{ width: pct(b) }} />
      <span className="seg seg-held" style={{ width: pct(h) }} />
      <span className="seg seg-preview" style={{ width: pct(p) }} />
      <span className="seg seg-free" style={{ width: pct(f) }} />
    </div>
  );
}

/** Top-down 3 x 11 map of the trailer floor, front of the trailer on the left. */
export function SlotGrid({ d, preview = 0 }: { d: Departure; preview?: number }) {
  const cells: string[] = [];
  for (const b of d.bookings) for (let k = 0; k < b.pallets; k++) cells.push(b.dgClass ? "dg" : "booked");
  for (const h of liveHolds(d)) for (let k = 0; k < h.pallets; k++) cells.push("held");
  for (let k = 0; k < preview; k++) cells.push("preview");
  while (cells.length < d.slots) cells.push("free");
  return (
    <div className="slotgrid" aria-hidden>
      <span className="slotgrid-cab" />
      <div className="slotgrid-floor">
        {cells.slice(0, d.slots).map((c, i) => <span key={i} className={`slot slot-${c}`} />)}
      </div>
    </div>
  );
}

export function Meter({ value, tone = "accent" }: { value: number; tone?: "accent" | "held" | "ok" | "bad" }) {
  return (
    <div className={`meter meter-${tone}`}>
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function KV({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="kv">
      <dt>{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}

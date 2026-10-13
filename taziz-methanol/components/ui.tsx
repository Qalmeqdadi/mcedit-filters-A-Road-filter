"use client";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { Health, TagPoint } from "@/lib/types";
import type { ReactNode } from "react";

export const cn = (...a: Parameters<typeof clsx>) => twMerge(clsx(...a));

export const toneColor: Record<Health | "ok" | "info" | "warn", string> = {
  normal: "#3DD9A4",
  ok: "#3DD9A4",
  watch: "#F4B740",
  warn: "#F4B740",
  alert: "#FF8A5B",
  critical: "#FF6B6B",
  info: "#2FD6F5",
};

export function Panel({ className, children, title, eyebrow, right }: { className?: string; children: ReactNode; title?: ReactNode; eyebrow?: string; right?: ReactNode }) {
  return (
    <section className={cn("panel p-4", className)}>
      {(title || eyebrow || right) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h3 className="mt-0.5 text-[15px] font-semibold text-fg">{title}</h3>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ children, tone = "info", className }: { children: ReactNode; tone?: keyof typeof toneColor; className?: string }) {
  const c = toneColor[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider", className)} style={{ color: c, borderColor: `${c}55`, background: `${c}14` }}>
      {children}
    </span>
  );
}

export function Dot({ tone = "normal", pulse }: { tone?: keyof typeof toneColor; pulse?: boolean }) {
  const c = toneColor[tone];
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && <span className="absolute inset-0 animate-pulse-ring rounded-full" style={{ background: c }} />}
      <span className="relative h-2 w-2 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
    </span>
  );
}

export function Btn({ children, onClick, variant = "primary", className, disabled, id }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "outline" | "human" | "danger"; className?: string; disabled?: boolean; id?: string }) {
  const v = {
    primary: "bg-gradient-to-r from-electric-600 to-cyan-500 text-white shadow-glow-sm hover:brightness-110",
    ghost: "text-fg-muted hover:bg-white/5 hover:text-fg",
    outline: "border border-line-strong text-fg hover:border-cyan-400/60 hover:bg-cyan-400/5",
    human: "bg-gradient-to-r from-[#0E9F6E] to-ok text-[#02130c] shadow-[0_0_20px_-6px_#3DD9A4] hover:brightness-110",
    danger: "border border-alarm/40 text-alarm hover:bg-alarm/10",
  }[variant];
  return (
    <button id={id} disabled={disabled} onClick={onClick} className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40", v, className)}>
      {children}
    </button>
  );
}

export function Sparkline({ data, color = "#2FD6F5", height = 36, window = 60 }: { data: TagPoint[]; color?: string; height?: number; window?: number }) {
  const pts = data.filter((_, i) => i % 2 === 0 || i > data.length - 20).slice(-window);
  const id = `g${color.replace("#", "")}`;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} fill={`url(#${id})`} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimTag({ children = "Simulated" }: { children?: ReactNode }) {
  return <span className="sim-tag">{children}</span>;
}

export function Headline({ lead, accent, sub }: { lead: string; accent: string; sub?: string }) {
  return (
    <div>
      <h1 className="text-[26px] font-bold leading-tight tracking-tight text-fg md:text-[30px]">
        {lead} <span className="bg-gradient-to-r from-cyan-400 to-electric-400 bg-clip-text text-transparent">{accent}</span>
      </h1>
      {sub && <p className="mt-1 max-w-3xl text-[13px] text-fg-muted">{sub}</p>}
    </div>
  );
}

export function Meter({ value, color = "#2FD6F5" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color, boxShadow: `0 0 10px ${color}` }} />
    </div>
  );
}

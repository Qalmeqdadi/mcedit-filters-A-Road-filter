"use client";

import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children, className, error }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; error?: ReactNode }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-[12px] font-medium text-ink-700">{label}</span>
      {children}
      {error ? <span className="text-[11.5px] font-medium text-crit">{error}</span> : hint ? <span className="text-[11px] text-ink-500">{hint}</span> : null}
    </label>
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn("h-8 min-w-0 rounded-md border border-line-strong bg-card px-2 text-[13px] text-ink-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20", className)}>
      {children}
    </select>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("h-8 min-w-0 rounded-md border border-line-strong bg-card px-2.5 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20", className)} />;
}

export function Slider({ label, value, min, max, step, onChange, format, hint }: { label: ReactNode; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string; hint?: ReactNode }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-ink-700">{label}</span>
        <span className="font-mono text-[12px] font-semibold text-navy-700 tabular">{format ? format(value) : value}</span>
      </div>
      <input type="range" className="slider" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ ["--fill" as string]: `${fill}%` }} aria-label={typeof label === "string" ? label : undefined} />
      {hint ? <span className="text-[11px] text-ink-500">{hint}</span> : null}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, size = "sm", dark }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: "xs" | "sm"; dark?: boolean }) {
  return (
    <div className={cn("inline-flex max-w-full overflow-x-auto rounded-md p-0.5 [scrollbar-width:none]", dark ? "bg-white/10" : "border border-line bg-sand-50")}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[5px] font-medium transition-colors cursor-pointer whitespace-nowrap",
            size === "xs" ? "px-2 py-0.5 text-[11.5px]" : "px-2.5 py-1 text-[12.5px]",
            o.value === value ? (dark ? "bg-white text-navy-900" : "bg-card text-ink-900 shadow-sm") : dark ? "text-navy-100 hover:text-white" : "text-ink-500 hover:text-ink-900",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: { value: T; label: ReactNode; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.value} type="button" onClick={() => onChange(t.value)} className={cn("-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium cursor-pointer", t.value === value ? "border-navy-700 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-900")}>
          {t.label}
          {t.count !== undefined ? <span className="rounded-full bg-sand-100 px-1.5 text-[11px] text-ink-700 tabular">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

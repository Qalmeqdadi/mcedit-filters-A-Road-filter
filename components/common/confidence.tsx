import { cn } from "@/lib/utils";

export function ConfidenceMeter({ value, className, label = true }: { value: number; className?: string; label?: boolean }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 85 ? "bg-ok-500" : pct >= 70 ? "bg-sky-500" : pct >= 50 ? "bg-warn-500" : "bg-risk-500";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={cn("h-3 w-1.5 rounded-sm", i < Math.round(pct / 10) ? tone : "bg-navy-100")} />
        ))}
      </div>
      {label && <span className="tabular text-xs font-semibold text-navy-800">{pct}%</span>}
    </div>
  );
}

import { UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function HumanDecisionBanner({ title = "HUMAN DECISION REQUIRED", children, className, decided }: { title?: string; children?: React.ReactNode; className?: string; decided?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3",
        decided ? "border-ok-100 bg-ok-50" : "border-magenta-200 bg-magenta-50",
        className,
      )}
    >
      <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", decided ? "bg-ok-500 text-white" : "bg-magenta-500 text-white")}>
        <UserCheck className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn("text-xs font-bold tracking-[0.14em]", decided ? "text-ok-600" : "text-magenta-600")}>{title}</div>
        {children && <div className="mt-0.5 text-[13px] leading-relaxed text-navy-700">{children}</div>}
      </div>
    </div>
  );
}

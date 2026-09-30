import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, children, className }: { icon: React.ElementType; title: string; description?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-navy-100 bg-white/60 px-6 py-10 text-center", className)}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-navy-50 text-navy-500">
        <Icon className="h-5 w-5" />
      </span>
      <div className="text-sm font-semibold text-navy-900">{title}</div>
      {description && <p className="mt-1 max-w-md text-[13px] leading-relaxed text-navy-500">{description}</p>}
      {children && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,#EEF1F6_0%,#F7F8FB_50%,#EEF1F6_100%)] bg-[length:800px_100%]",
        className,
      )}
    />
  );
}

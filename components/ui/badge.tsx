import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-navy-100 bg-navy-50 text-navy-700",
        gold: "border-gold-200 bg-gold-50 text-gold-700",
        magenta: "border-magenta-100 bg-magenta-50 text-magenta-600",
        sky: "border-sky-100 bg-sky-50 text-sky-700",
        ok: "border-ok-100 bg-ok-50 text-ok-600",
        warn: "border-warn-100 bg-warn-50 text-warn-600",
        risk: "border-risk-100 bg-risk-50 text-risk-600",
        outline: "border-border bg-white text-navy-600",
        solid: "border-navy-800 bg-navy-800 text-white",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

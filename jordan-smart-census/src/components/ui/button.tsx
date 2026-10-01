import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/50 disabled:pointer-events-none disabled:opacity-45 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "bg-navy-800 text-white hover:bg-navy-700 shadow-sm",
        accent: "bg-navy-600 text-white hover:bg-navy-500 shadow-sm",
        outline: "border border-line-strong bg-card text-ink-900 hover:bg-sand-50",
        ghost: "text-ink-700 hover:bg-sand-100",
        danger: "bg-crit text-white hover:bg-crit/90",
        success: "bg-ok text-white hover:bg-ok/90",
        dark: "bg-white/10 text-white hover:bg-white/20 border border-white/15",
        darkGhost: "text-navy-100 hover:bg-white/10",
      },
      size: { xs: "h-7 px-2 text-[12px]", sm: "h-8 px-2.5", md: "h-9 px-3.5", icon: "h-8 w-8 p-0" },
    },
    defaultVariants: { variant: "outline", size: "sm" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";

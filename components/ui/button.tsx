import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-navy-800 text-white shadow-sm hover:bg-navy-700",
        magenta: "bg-magenta-500 text-white shadow-sm hover:bg-magenta-600",
        gold: "bg-gold-500 text-white shadow-sm hover:bg-gold-600",
        outline: "border border-border bg-white text-navy-800 hover:bg-navy-50 hover:border-navy-200",
        secondary: "bg-navy-50 text-navy-800 hover:bg-navy-100",
        ghost: "text-navy-700 hover:bg-navy-50",
        success: "bg-ok-500 text-white shadow-sm hover:bg-ok-600",
        destructive: "bg-risk-500 text-white shadow-sm hover:bg-risk-600",
        "outline-destructive": "border border-risk-100 bg-white text-risk-600 hover:bg-risk-50",
        link: "text-sky-600 underline-offset-4 hover:underline px-0",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-[13px]",
        xs: "h-7 px-2.5 text-xs rounded-md",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };

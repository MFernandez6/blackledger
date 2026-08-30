import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-sans text-[10px] font-bold uppercase tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-green/50 disabled:pointer-events-none disabled:opacity-40 border",
  {
    variants: {
      variant: {
        default:
          "border-brand-green/30 bg-brand-navy text-brand-green-soft hover:bg-brand-green/10 hover:border-brand-green/50",
        solid:
          "border-brand-green bg-brand-green text-brand-navy hover:bg-brand-green-soft",
        outline:
          "border-brand-white/15 bg-transparent text-brand-white/80 hover:border-brand-green/40 hover:text-brand-green-soft",
        ghost:
          "border-transparent bg-transparent text-brand-slate hover:text-brand-green-soft",
        destructive:
          "border-denied/50 bg-denied-muted text-denied-soft hover:bg-denied/20",
        secondary:
          "border-brand-white/15 bg-brand-navy-deep/60 text-brand-white hover:border-brand-green/30",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-[9px]",
        lg: "h-12 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

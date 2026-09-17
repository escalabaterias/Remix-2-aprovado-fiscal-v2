import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive:
          "bg-destructive font-semibold text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background font-medium shadow-2xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary font-medium text-secondary-foreground shadow-2xs hover:bg-secondary/80",
        ghost: "font-medium hover:bg-accent hover:text-accent-foreground",
        link: "font-medium text-primary underline-offset-4 hover:underline",
        intelligence:
          "bg-intelligence font-semibold text-intelligence-foreground shadow-sm hover:bg-intelligence/90",
        success: "bg-success font-semibold text-success-foreground shadow-sm hover:bg-success/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

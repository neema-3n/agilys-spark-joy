import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium leading-4 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/12 text-primary hover:bg-primary/20",
        secondary: "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
        destructive: "border-transparent bg-destructive/12 text-destructive hover:bg-destructive/20",
        success: "border-transparent bg-emerald-500/12 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400",
        warning: "border-transparent bg-amber-500/12 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400",
        outline: "border-border bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

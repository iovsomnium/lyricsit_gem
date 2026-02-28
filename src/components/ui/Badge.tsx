import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "default" | "rhyme" | "success" | "warning" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-hover text-foreground border-border",
  rhyme: "bg-rhyme-blue-light text-rhyme-blue border-rhyme-blue/20",
  success: "bg-confirm-green-light text-confirm-green border-confirm-green/20",
  warning: "bg-warning-red-light text-warning-red border-warning-red/20",
  muted: "bg-surface-hover text-muted border-border",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
          variantStyles[variant],
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";

"use client";

import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-muted">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground",
            "placeholder:text-muted-light resize-none",
            "focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus",
            "disabled:opacity-50",
            error && "border-warning-red focus:border-warning-red focus:ring-warning-red",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-warning-red">{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

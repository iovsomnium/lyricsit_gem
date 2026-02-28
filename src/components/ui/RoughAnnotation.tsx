"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type {
  RoughAnnotationType,
  RoughPadding,
  BracketType,
} from "rough-notation/lib/model";

interface RoughAnnotationProps {
  children: ReactNode;
  type: RoughAnnotationType;
  show?: boolean;
  color?: string;
  strokeWidth?: number;
  padding?: RoughPadding;
  animationDuration?: number;
  animate?: boolean;
  multiline?: boolean;
  iterations?: number;
  brackets?: BracketType | BracketType[];
  as?: "span" | "div";
  className?: string;
  style?: CSSProperties;
}

// Rough-notation overlay has been removed.
// Keep this wrapper as a no-op so existing call sites keep rendering content.
export function RoughAnnotationWrapper({
  children,
  type,
  color,
  strokeWidth,
  as: Tag = "span",
  className,
  style,
}: RoughAnnotationProps) {
  const fallbackBorderColor =
    color === "rhyme"
      ? "var(--rhyme-blue)"
      : color === "confirm"
        ? "var(--confirm-green)"
        : color === "warning"
          ? "var(--warning-red)"
          : color === "highlight"
            ? "var(--highlight-yellow)"
            : color === "ink"
              ? "var(--ink-black)"
              : typeof color === "string"
                ? color
                : "var(--border)";

  const mergedStyle: CSSProperties | undefined =
    type === "box"
      ? {
          borderColor: fallbackBorderColor,
          borderWidth: strokeWidth ? Math.max(1, Math.round(strokeWidth)) : 1,
          ...style,
        }
      : style;

  return (
    <Tag
      className={cn(type === "box" && "rounded-lg border", className)}
      style={mergedStyle}
    >
      {children}
    </Tag>
  );
}

"use client";

import {
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from "react";
import { annotate } from "rough-notation";
import type {
  RoughAnnotationType,
  RoughAnnotation as RoughAnnotationInstance,
  RoughPadding,
  BracketType,
} from "rough-notation/lib/model";

// ============================================================
// 로드맵 색상 프리셋
// ============================================================

const COLOR_PRESETS = {
  rhyme: "#3b6cb4",
  confirm: "#3a8a5c",
  warning: "#c44545",
  highlight: "#fef3c7",
  ink: "#1a1a1a",
} as const;

type ColorPreset = keyof typeof COLOR_PRESETS;

// ============================================================
// Props
// ============================================================

interface RoughAnnotationProps {
  children: ReactNode;
  /** Annotation type */
  type: RoughAnnotationType;
  /** Show the annotation (controls show/hide) */
  show?: boolean;
  /** Color — preset name or arbitrary CSS color */
  color?: ColorPreset | (string & {});
  /** Stroke width (default: 2) */
  strokeWidth?: number;
  /** Padding around the element */
  padding?: RoughPadding;
  /** Animation duration in ms (default: 600) */
  animationDuration?: number;
  /** Disable animation */
  animate?: boolean;
  /** Multiline support */
  multiline?: boolean;
  /** Number of roughness iterations (default: 2) */
  iterations?: number;
  /** Bracket type(s) — only for type="bracket" */
  brackets?: BracketType | BracketType[];
  /** Wrapper element tag */
  as?: "span" | "div";
  /** Additional class name on wrapper */
  className?: string;
  /** Additional inline style on wrapper */
  style?: CSSProperties;
}

// ============================================================
// Component
// ============================================================

export function RoughAnnotationWrapper({
  children,
  type,
  show = true,
  color = "rhyme",
  strokeWidth = 2,
  padding,
  animationDuration = 600,
  animate = true,
  multiline = false,
  iterations = 2,
  brackets,
  as: Tag = "span",
  className,
  style,
}: RoughAnnotationProps) {
  const ref = useRef<HTMLElement>(null);
  const annotationRef = useRef<RoughAnnotationInstance | null>(null);

  const resolvedColor =
    color in COLOR_PRESETS
      ? COLOR_PRESETS[color as ColorPreset]
      : color;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const annotation = annotate(el, {
      type,
      color: resolvedColor,
      strokeWidth,
      padding,
      animationDuration,
      animate,
      multiline,
      iterations,
      ...(type === "bracket" && brackets ? { brackets } : {}),
    });

    annotationRef.current = annotation;

    if (show) {
      annotation.show();
    }

    return () => {
      annotation.remove();
      annotationRef.current = null;
    };
    // Re-create annotation when config changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, resolvedColor, strokeWidth, padding, animationDuration, animate, multiline, iterations, brackets]);

  // Handle show/hide toggle without re-creating
  useEffect(() => {
    const annotation = annotationRef.current;
    if (!annotation) return;

    if (show) {
      annotation.show();
    } else {
      annotation.hide();
    }
  }, [show]);

  const refCallback = (el: HTMLSpanElement | HTMLDivElement | null) => {
    (ref as React.RefObject<HTMLElement | null>).current = el;
  };

  return (
    <Tag ref={refCallback} className={className} style={style}>
      {children}
    </Tag>
  );
}

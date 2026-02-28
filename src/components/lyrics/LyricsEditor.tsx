"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/hooks/useAppStore";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { RoughAnnotationWrapper } from "@/components/ui/RoughAnnotation";
import type { LyricsLine } from "@/types";

function splitDraftLines(text: string): string[] {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function LyricsEditor() {
  const generatedLyrics = useAppStore((s) => s.generatedLyrics);
  const setLyricsDraftText = useAppStore((s) => s.setLyricsDraftText);

  const [draftText, setDraftText] = useState<string>(() =>
    generatedLyrics.map((line) => line.text).join("\n"),
  );
  const [copied, setCopied] = useState(false);
  const [confirmedLineIndexes, setConfirmedLineIndexes] = useState<Set<number>>(
    () => new Set(),
  );
  const [animatePreview, setAnimatePreview] = useState(true);

  const draftLines = useMemo(() => splitDraftLines(draftText), [draftText]);

  useEffect(() => {
    setLyricsDraftText(draftText);
  }, [draftText, setLyricsDraftText]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setAnimatePreview(false),
      Math.max(900, generatedLyrics.length * 260),
    );
    return () => window.clearTimeout(timer);
  }, [generatedLyrics.length]);

  if (generatedLyrics.length === 0) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleConfirmLine = (lineIndex: number) => {
    setConfirmedLineIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(lineIndex)) {
        next.delete(lineIndex);
      } else {
        next.add(lineIndex);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>가사</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4 text-confirm-green" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "복사됨" : "복사"}
        </Button>
      </CardHeader>

      <div className="flex flex-col gap-4">
        <Textarea
          label="가사 편집"
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          rows={Math.max(6, draftLines.length + 1)}
          className="text-sm leading-relaxed"
          placeholder="생성된 가사가 여기에 표시됩니다."
        />

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted">라인 미리보기</p>
          <Badge variant="muted">{draftLines.length}줄</Badge>
        </div>

        <motion.ul
          className="flex flex-col gap-2"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {draftLines.map((text, index) => {
            const original = generatedLyrics[index];
            const isConfirmed = confirmedLineIndexes.has(index);
            return (
              <PreviewLineItem
                key={`${index}-${text}`}
                lineIndex={index}
                text={text}
                original={original}
                isConfirmed={isConfirmed}
                animate={animatePreview}
                onToggleConfirm={() => toggleConfirmLine(index)}
              />
            );
          })}
        </motion.ul>
      </div>
    </Card>
  );
}

function PreviewLineItem({
  lineIndex,
  text,
  original,
  isConfirmed,
  animate,
  onToggleConfirm,
}: {
  lineIndex: number;
  text: string;
  original: LyricsLine | undefined;
  isConfirmed: boolean;
  animate: boolean;
  onToggleConfirm: () => void;
}) {
  const isModified = original ? original.text !== text : false;
  const isEnglish = original?.language === "en";
  const hasRhyme = original?.hasRhyme ?? false;
  const lineClassName = `text-base leading-relaxed ${
    isEnglish ? "text-ink-blue" : "text-foreground"
  }`;

  const lineNode = (
    <TypingText
      text={text}
      animate={animate}
      delayMs={lineIndex * 120}
      className={lineClassName}
    />
  );

  const rhymedNode = hasRhyme ? (
    <RoughAnnotationWrapper
      type="underline"
      show
      color={isEnglish ? "rhyme" : "confirm"}
      strokeWidth={2}
      animationDuration={380}
    >
      {lineNode}
    </RoughAnnotationWrapper>
  ) : (
    lineNode
  );

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-lg border border-border bg-surface px-3 py-2"
    >
      {isModified && (
        <div className="mb-1">
          <RoughAnnotationWrapper
            type="strike-through"
            show
            color="warning"
            strokeWidth={1.5}
            animationDuration={280}
          >
            <span className="text-sm text-muted line-through">{original?.text ?? ""}</span>
          </RoughAnnotationWrapper>
        </div>
      )}

      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onToggleConfirm}
          className={`mt-0.5 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
            isConfirmed
              ? "border-confirm-green bg-confirm-green-light text-confirm-green"
              : "border-border bg-surface-hover text-muted hover:bg-border/40"
          }`}
        >
          {isConfirmed ? "확정" : "미확정"}
        </button>

        <div className="min-w-0 flex-1">
          {isConfirmed ? (
            <RoughAnnotationWrapper
              type="box"
              show
              color="confirm"
              strokeWidth={1.8}
              padding={[3, 4]}
              animationDuration={280}
            >
              {rhymedNode}
            </RoughAnnotationWrapper>
          ) : (
            rhymedNode
          )}
        </div>
      </div>
    </motion.li>
  );
}

function TypingText({
  text,
  animate,
  delayMs,
  className,
}: {
  text: string;
  animate: boolean;
  delayMs: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(() => (animate ? "" : text));

  useEffect(() => {
    if (!animate) return;

    let cursor = 0;
    let intervalId: number | null = null;
    const startTimer = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        cursor += 1;
        setDisplayed(text.slice(0, cursor));
        if (cursor >= text.length) {
          if (intervalId) window.clearInterval(intervalId);
        }
      }, 16);
    }, delayMs);

    return () => {
      window.clearTimeout(startTimer);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [animate, delayMs, text]);

  return <span className={className}>{animate ? displayed : text}</span>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Save } from "lucide-react";
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
  const saveMemo = useAppStore((s) => s.saveMemo);
  const genre = useAppStore((s) => s.genre);
  const mood = useAppStore((s) => s.mood);
  const rhymePair = useAppStore((s) => s.selectedRhymes[0]);

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

  const handleSave = () => {
    const content = draftText || generatedLyrics.map((line) => line.text).join("\n");

    if (!content.trim()) {
      return;
    }

    const lines = draftText
      ? splitDraftLines(draftText).map((text, index) => ({
          text,
          language: generatedLyrics[index]?.language || ("ko" as const),
          hasRhyme: generatedLyrics[index]?.hasRhyme || false,
        }))
      : generatedLyrics;

    const firstLine = content.split("\n")[0] || "Untitled";
    const title = firstLine.slice(0, 30) + (firstLine.length > 30 ? "..." : "");

    saveMemo({
      title,
      content,
      lines,
      metadata: {
        rhymePair,
        genre,
        mood,
        lineCount: content.split("\n").filter(Boolean).length,
        hasBeenChecked: false,
      },
    });
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
        <CardTitle>Lyrics Draft</CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-confirm-green" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardHeader>

      <div className="flex flex-col gap-4">
        <Textarea
          label="Edit Lyrics"
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          rows={Math.max(6, draftLines.length + 1)}
          className="text-sm leading-relaxed"
          placeholder="Generated lyrics appear here."
        />

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted">Line Preview</p>
          <Badge variant="muted">{draftLines.length} lines</Badge>
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
  const rhymeWord = original?.rhymeWord;
  const rhymePair = original?.rhymePair;

  const lineClassName = `text-base leading-relaxed ${
    isEnglish ? "text-ink-blue" : "text-foreground"
  }`;

  // 라임 단어를 포함한 텍스트 렌더링
  const renderLineWithRhyme = () => {
    if (!hasRhyme || !rhymeWord) {
      return (
        <TypingText
          text={text}
          animate={animate}
          delayMs={lineIndex * 120}
          className={lineClassName}
        />
      );
    }

    // 라임 단어의 위치 찾기 (대소문자 무시)
    const lowerText = text.toLowerCase();
    const lowerRhymeWord = rhymeWord.toLowerCase();
    const rhymeIndex = lowerText.indexOf(lowerRhymeWord);

    if (rhymeIndex === -1) {
      // 라임 단어를 찾지 못한 경우 전체에 언더라인
      return (
        <RoughAnnotationWrapper
          type="underline"
          show
          color={isEnglish ? "rhyme" : "confirm"}
          strokeWidth={2}
          animationDuration={380}
        >
          <TypingText
            text={text}
            animate={animate}
            delayMs={lineIndex * 120}
            className={lineClassName}
          />
        </RoughAnnotationWrapper>
      );
    }

    // 텍스트를 3부분으로 나누기: 앞 + 라임 단어 + 뒤
    const before = text.slice(0, rhymeIndex);
    const rhyme = text.slice(rhymeIndex, rhymeIndex + rhymeWord.length);
    const after = text.slice(rhymeIndex + rhymeWord.length);

    return (
      <span className={lineClassName}>
        {before && (
          <TypingText
            text={before}
            animate={animate}
            delayMs={lineIndex * 120}
            className=""
          />
        )}
        <RoughAnnotationWrapper
          type="underline"
          show
          color={isEnglish ? "rhyme" : "confirm"}
          strokeWidth={2.5}
          animationDuration={380}
        >
          <span className="font-semibold">
            <TypingText
              text={rhyme}
              animate={animate}
              delayMs={lineIndex * 120 + (before?.length || 0) * 16}
              className=""
            />
          </span>
        </RoughAnnotationWrapper>
        {after && (
          <TypingText
            text={after}
            animate={animate}
            delayMs={lineIndex * 120 + (before?.length || 0) * 16 + rhyme.length * 16}
            className=""
          />
        )}
      </span>
    );
  };

  const rhymedNode = renderLineWithRhyme();

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
          {isConfirmed ? "Locked" : "Unlocked"}
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

          {/* 라임 페어 정보 표시 */}
          {hasRhyme && rhymePair && rhymeWord && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <span className="rounded bg-surface-hover px-1.5 py-0.5 font-medium">
                Rhyme
              </span>
              <span>
                {isEnglish ? (
                  <>
                    <span className="font-medium text-ink-blue">{rhymeWord}</span>
                    {" ↔ "}
                    <span className="font-medium text-foreground">{rhymePair.ko}</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-foreground">{rhymeWord}</span>
                    {" ↔ "}
                    <span className="font-medium text-ink-blue">{rhymePair.en}</span>
                  </>
                )}
              </span>
            </div>
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

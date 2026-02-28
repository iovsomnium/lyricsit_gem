"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/hooks/useAppStore";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RoughAnnotationWrapper } from "@/components/ui/RoughAnnotation";
import { Loading } from "@/components/ui/Loading";
import type { RhymeCandidate } from "@/types";

const HIGH_SIMILARITY_THRESHOLD = 0.78;

function splitPronunciationTail(pronunciation: string): { head: string; tail: string } {
  const trimmed = pronunciation.trim();
  if (!trimmed) return { head: "", tail: "" };

  const chunks = trimmed.split(/[-\s]+/u).filter(Boolean);
  if (chunks.length === 1) {
    return { head: "", tail: chunks[0] };
  }

  return {
    head: chunks.slice(0, -1).join(" "),
    tail: chunks[chunks.length - 1] ?? "",
  };
}

export function RhymeResults() {
  const isSearching = useAppStore((s) => s.isSearching);
  const inputPhonetics = useAppStore((s) => s.inputPhonetics);
  const rhymeResults = useAppStore((s) => s.rhymeResults);
  const selectedRhymes = useAppStore((s) => s.selectedRhymes);
  const inputText = useAppStore((s) => s.inputText);
  const inputLanguage = useAppStore((s) => s.inputLanguage);
  const selectRhyme = useAppStore((s) => s.selectRhyme);
  const deselectRhyme = useAppStore((s) => s.deselectRhyme);
  const [removingWords, setRemovingWords] = useState<Set<string>>(() => new Set());
  const removalTimers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timers = removalTimers.current;
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  if (isSearching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rhyme Candidates</CardTitle>
          <Badge variant="muted">Searching</Badge>
        </CardHeader>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-4 text-sm text-muted">
          <Loading size="sm" />
          <span>Calculating phonetic similarity and ranking candidates...</span>
        </div>
      </Card>
    );
  }

  if (rhymeResults.length === 0) return null;

  const isSelected = (candidate: RhymeCandidate) =>
    selectedRhymes.some(
      (r) =>
        (inputLanguage === "ko" ? r.ko : r.en) === inputText.trim() &&
        (inputLanguage === "ko" ? r.en : r.ko) === candidate.word,
    );

  const toggleSelect = (candidate: RhymeCandidate) => {
    const pair =
      inputLanguage === "ko"
        ? { ko: inputText.trim(), en: candidate.word }
        : { ko: candidate.word, en: inputText.trim() };

    if (isSelected(candidate)) {
      if (removalTimers.current.has(candidate.word)) return;

      setRemovingWords((prev) => {
        const next = new Set(prev);
        next.add(candidate.word);
        return next;
      });

      const timer = window.setTimeout(() => {
        deselectRhyme(pair);
        setRemovingWords((prev) => {
          const next = new Set(prev);
          next.delete(candidate.word);
          return next;
        });
        removalTimers.current.delete(candidate.word);
      }, 260);

      removalTimers.current.set(candidate.word, timer);
    } else {
      const pending = removalTimers.current.get(candidate.word);
      if (pending) {
        window.clearTimeout(pending);
        removalTimers.current.delete(candidate.word);
        setRemovingWords((prev) => {
          const next = new Set(prev);
          next.delete(candidate.word);
          return next;
        });
      }
      selectRhyme(pair);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rhyme Candidates</CardTitle>
        <Badge variant="muted">{rhymeResults.length} found</Badge>
      </CardHeader>

      <motion.ul
        className="flex flex-col gap-2"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
      >
        {rhymeResults.map((candidate) => (
          <CandidateItem
            key={candidate.word}
            candidate={candidate}
            inputRomanized={inputPhonetics?.romanized ?? ""}
            selected={isSelected(candidate)}
            isRemoving={removingWords.has(candidate.word)}
            onToggle={() => toggleSelect(candidate)}
          />
        ))}
      </motion.ul>
    </Card>
  );
}

function CandidateItem({
  candidate,
  inputRomanized,
  selected,
  isRemoving,
  onToggle,
}: {
  candidate: RhymeCandidate;
  inputRomanized: string;
  selected: boolean;
  isRemoving: boolean;
  onToggle: () => void;
}) {
  const scorePercent = Math.round(candidate.similarityScore * 100);
  const isHighSimilarity = candidate.similarityScore >= HIGH_SIMILARITY_THRESHOLD;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: isRemoving ? 0.45 : 1,
        y: isRemoving ? -2 : 0,
        scale: isRemoving ? 0.985 : 1,
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
          isRemoving
            ? "border-warning-red/35 bg-warning-red-light"
            : selected
            ? "border-rhyme-blue bg-rhyme-blue-light"
            : isHighSimilarity
              ? "border-rhyme-blue/35 bg-highlight-yellow/45 hover:bg-highlight-yellow/60"
            : "border-border bg-surface hover:bg-surface-hover"
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <RoughAnnotationWrapper
              type="circle"
              show={selected}
              color="rhyme"
                strokeWidth={2}
                padding={4}
                animationDuration={400}
              >
                {isRemoving ? (
                  <RoughAnnotationWrapper
                    type="strike-through"
                    show
                    color="warning"
                    strokeWidth={1.5}
                    animationDuration={220}
                  >
                    <span className="truncate text-base font-medium text-warning-red line-through decoration-warning-red/80">
                      {candidate.word}
                    </span>
                  </RoughAnnotationWrapper>
                ) : (
                  <span className="truncate text-base font-medium text-foreground">
                    {candidate.word}
                  </span>
                )}
              </RoughAnnotationWrapper>
            {isHighSimilarity && (
              <RoughAnnotationWrapper
                type="highlight"
                show
                color="highlight"
                strokeWidth={1}
                animationDuration={350}
              >
                <Badge variant="muted">High match</Badge>
              </RoughAnnotationWrapper>
            )}
            {candidate.syllableMatch && (
              <Badge variant="success">Syllable match</Badge>
            )}
            {isRemoving && <Badge variant="warning">Removing</Badge>}
          </div>
          <ScoreBar score={scorePercent} />
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="break-all">
            Pronunciation: {candidate.phonetics.romanized || candidate.word}
          </span>
          <span>{candidate.phonetics.syllableCount} syllables</span>
        </div>

        {inputRomanized && (
          <PronunciationComparison
            inputRomanized={inputRomanized}
            candidateRomanized={candidate.phonetics.romanized}
          />
        )}
      </button>
    </motion.li>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-rhyme-blue transition-all"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted">{score}%</span>
    </div>
  );
}

function PronunciationComparison({
  inputRomanized,
  candidateRomanized,
}: {
  inputRomanized: string;
  candidateRomanized: string;
}) {
  const source = splitPronunciationTail(inputRomanized);
  const target = splitPronunciationTail(candidateRomanized);

  return (
    <div className="mt-2 rounded-md border border-border/80 bg-background/40 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        Pronunciation Comparison
      </p>
      <div className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
        <PronunciationLine label="Input" head={source.head} tail={source.tail} />
        <PronunciationLine label="Candidate" head={target.head} tail={target.tail} />
      </div>
    </div>
  );
}

function PronunciationLine({
  label,
  head,
  tail,
}: {
  label: string;
  head: string;
  tail: string;
}) {
  return (
    <div className="rounded bg-surface px-2 py-1">
      <span className="mr-1 text-muted">{label}</span>
      <span className="break-all font-mono text-muted-light">{head}</span>
      {head && " "}
      <RoughAnnotationWrapper
        type="underline"
        show
        color="rhyme"
        strokeWidth={1.5}
        animationDuration={250}
      >
        <span className="break-all font-mono text-foreground">{tail || "-"}</span>
      </RoughAnnotationWrapper>
    </div>
  );
}

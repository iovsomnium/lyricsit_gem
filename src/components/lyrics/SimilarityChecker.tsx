"use client";

import { motion } from "framer-motion";
import { Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/hooks/useAppStore";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { RoughAnnotationWrapper } from "@/components/ui/RoughAnnotation";
import type { SimilarityResult, SimilarityType } from "@/types";

const SIMILARITY_THRESHOLD = 0.7;

const TYPE_LABELS: Record<SimilarityType, string> = {
  exact: "Exact",
  semantic: "Semantic",
  structural: "Structural",
};

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/u)
    .filter((token) => token.length > 1);
}

function overlapRatio(sourceLine: string, matchedLine: string): number {
  const sourceTokens = new Set(normalizeTokens(sourceLine));
  const matchTokens = new Set(normalizeTokens(matchedLine));
  if (sourceTokens.size === 0 || matchTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of sourceTokens) {
    if (matchTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(sourceTokens.size, matchTokens.size);
}

function getOverlapTokens(sourceLine: string, matchedLine: string): Set<string> {
  const sourceTokens = new Set(normalizeTokens(sourceLine));
  const matchedTokens = new Set(normalizeTokens(matchedLine));
  const overlap = new Set<string>();

  for (const token of sourceTokens) {
    if (matchedTokens.has(token)) overlap.add(token);
  }
  return overlap;
}

function highlightOverlaps(
  text: string,
  overlapTokens: Set<string>,
  tone: "source" | "matched",
) {
  const chunks = text.split(/(\s+)/u);

  return chunks.map((chunk, index) => {
    const normalized = chunk
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, "");

    if (!normalized || !overlapTokens.has(normalized)) {
      return <span key={`plain-${index}`}>{chunk}</span>;
    }

    return (
      <mark
        key={`mark-${index}`}
        className={`rounded px-0.5 ${
          tone === "matched" ? "bg-warning-red/25" : "bg-rhyme-blue-light"
        }`}
      >
        {chunk}
      </mark>
    );
  });
}

function findBestSourceLine(lines: string[], matchedLine: string): string {
  if (lines.length === 0) return "";

  let bestLine = lines[0] ?? "";
  let bestScore = -1;

  for (const line of lines) {
    const score = overlapRatio(line, matchedLine);
    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
    }
  }

  return bestLine;
}

export function SimilarityChecker() {
  const lyricsDraftText = useAppStore((s) => s.lyricsDraftText);
  const generatedLyrics = useAppStore((s) => s.generatedLyrics);
  const similarityResults = useAppStore((s) => s.similarityResults);
  const isChecking = useAppStore((s) => s.isCheckingSimilarity);
  const checkSimilarity = useAppStore((s) => s.checkSimilarity);

  const hasLyrics = generatedLyrics.length > 0;
  const hasResults = similarityResults.length > 0;
  const hasWarnings = similarityResults.some(
    (r) => r.similarityScore >= SIMILARITY_THRESHOLD,
  );
  const allClear = hasResults && !hasWarnings;
  const sourceLines = lyricsDraftText.trim()
    ? splitLines(lyricsDraftText)
    : generatedLyrics.map((line) => line.text.trim()).filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Similarity Check</CardTitle>
      </CardHeader>

      <div className="flex flex-col gap-4">
        <Button
          variant="secondary"
          onClick={() => checkSimilarity()}
          disabled={!hasLyrics || isChecking}
          className="w-full"
        >
          {isChecking ? (
            <Loading size="sm" />
          ) : (
            <Shield className="h-4 w-4" />
          )}
          {isChecking ? "Checking..." : "Run Similarity Check"}
        </Button>

        {!hasResults && !isChecking && (
          <p className="text-sm text-muted">
            Compare your draft against known song patterns and references.
          </p>
        )}

        {isChecking && (
          <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
            Analyzing phrase structure and semantic overlap...
          </div>
        )}

        {allClear && (
          <div className="flex items-center gap-2 rounded-lg bg-confirm-green-light px-4 py-3">
            <CheckCircle className="h-5 w-5 text-confirm-green" />
            <span className="text-sm font-medium text-confirm-green">
              No high-similarity references were found.
            </span>
          </div>
        )}

        {hasResults && (
          <motion.ul
            className="flex flex-col gap-2"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.07 } },
            }}
          >
            {similarityResults.map((result, i) => (
              <SimilarityItem
                key={i}
                result={result}
                sourceLine={findBestSourceLine(sourceLines, result.matchedLine)}
              />
            ))}
          </motion.ul>
        )}
      </div>
    </Card>
  );
}

function SimilarityItem({
  result,
  sourceLine,
}: {
  result: SimilarityResult;
  sourceLine: string;
}) {
  const isWarning = result.similarityScore >= SIMILARITY_THRESHOLD;
  const scorePercent = Math.round(result.similarityScore * 100);
  const badgeVariant = isWarning ? "warning" : "muted";
  const overlapTokens = getOverlapTokens(sourceLine, result.matchedLine);
  const overlapPercent = Math.round(overlapRatio(sourceLine, result.matchedLine) * 100);

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`rounded-lg border px-4 py-3 ${
        isWarning
          ? "border-warning-red/30 bg-warning-red-light"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isWarning && (
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning-red" />
            )}
            <span className="text-sm font-medium text-foreground">
              {result.matchedSong.title}
            </span>
            <span className="text-xs text-muted">
              {result.matchedSong.artist}
            </span>
          </div>

          <div className="mt-2 rounded-md border border-border/70 bg-background/35 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Line comparison
            </p>
            <p className="mt-1 text-xs text-muted">
              Your lyric:{" "}
              <span className="text-foreground">
                {sourceLine
                  ? highlightOverlaps(sourceLine, overlapTokens, "source")
                  : "-"}
              </span>
            </p>
            <div className="mt-1">
              <span className="text-xs text-muted">Reference song:</span>{" "}
              <RoughAnnotationWrapper
                type={isWarning ? "highlight" : "underline"}
                show
                color={isWarning ? "warning" : "rhyme"}
                strokeWidth={1.5}
                animationDuration={400}
              >
                <span className="text-sm text-muted">
                  &ldquo;
                  {highlightOverlaps(result.matchedLine, overlapTokens, "matched")}
                  &rdquo;
                </span>
              </RoughAnnotationWrapper>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-border">
              <motion.div
                className={`h-full rounded-full ${
                  isWarning ? "bg-warning-red" : "bg-rhyme-blue"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${scorePercent}%` }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted">{scorePercent}%</span>
          </div>

          {sourceLine && (
            <p className="mt-1 text-xs text-muted">
              Estimated token overlap: <span className="tabular-nums">{overlapPercent}%</span>
            </p>
          )}

          {isWarning && (
            <p className="mt-1 text-xs text-warning-red line-through decoration-warning-red/80">
              Consider rewriting this expression further.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`text-sm font-medium tabular-nums ${
              isWarning ? "text-warning-red" : "text-muted"
            }`}
          >
            {scorePercent}%
          </span>
          <Badge variant={badgeVariant}>
            {TYPE_LABELS[result.similarityType]}
          </Badge>
        </div>
      </div>
    </motion.li>
  );
}

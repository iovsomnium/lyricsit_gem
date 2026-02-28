"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/hooks/useAppStore";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import type { SavedLyricsMemo, SimilarityType } from "@/types";
import { MemoCard } from "./MemoCard";

const TYPE_LABELS: Record<SimilarityType, string> = {
  exact: "Exact",
  semantic: "Semantic",
  structural: "Structural",
};

export function SavedMemosPanel() {
  const savedMemos = useAppStore((s) => s.savedMemos);
  const deleteMemo = useAppStore((s) => s.deleteMemo);
  const clearAllMemos = useAppStore((s) => s.clearAllMemos);
  const checkMemoSimilarity = useAppStore((s) => s.checkMemoSimilarity);
  const isCheckingSimilarity = useAppStore((s) => s.isCheckingSimilarity);
  const [activeMemoId, setActiveMemoId] = useState<string | null>(null);
  const [checkingMemoId, setCheckingMemoId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const activeMemo = useMemo(
    () => savedMemos.find((memo) => memo.id === activeMemoId) ?? null,
    [savedMemos, activeMemoId],
  );

  const handleClearAll = () => {
    if (savedMemos.length === 0) return;
    if (window.confirm("Delete all saved lyrics?")) {
      clearAllMemos();
    }
  };

  const runSimilarityCheck = async (memoId: string) => {
    setActiveMemoId(memoId);
    setCheckingMemoId(memoId);
    setModalError(null);
    await checkMemoSimilarity(memoId);
    const latestError = useAppStore.getState().error;
    if (latestError) {
      setModalError(latestError.message);
    }
    setCheckingMemoId(null);
  };

  const closeModal = () => {
    if (checkingMemoId) return;
    setActiveMemoId(null);
    setModalError(null);
  };

  return (
    <>
      <Card className="flex h-full flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Saved Lyrics ({savedMemos.length})</CardTitle>
            {savedMemos.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-warning-red hover:bg-warning-red-light"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
          <p className="text-xs text-muted">
            Similarity checks are available only for saved lyrics.
          </p>
        </CardHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {savedMemos.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12">
              <div className="text-center">
                <p className="text-sm text-muted">No saved lyrics yet.</p>
                <p className="mt-1 text-xs text-muted/70">
                  Generate lyrics and save your draft to see it here.
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              className="flex flex-col gap-3"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.05 } },
              }}
            >
              <AnimatePresence>
                {savedMemos.map((memo) => (
                  <MemoCard
                    key={memo.id}
                    memo={memo}
                    onDelete={deleteMemo}
                    onCheckSimilarity={runSimilarityCheck}
                    isCheckingNow={isCheckingSimilarity}
                    isCheckingCurrent={checkingMemoId === memo.id}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </Card>

      <SimilarityCheckModal
        memo={activeMemo}
        isOpen={Boolean(activeMemo)}
        isChecking={Boolean(checkingMemoId)}
        errorMessage={modalError}
        onClose={closeModal}
        onRerun={() => {
          if (!activeMemoId) return;
          void runSimilarityCheck(activeMemoId);
        }}
      />
    </>
  );
}

function SimilarityCheckModal({
  memo,
  isOpen,
  isChecking,
  errorMessage,
  onClose,
  onRerun,
}: {
  memo: SavedLyricsMemo | null;
  isOpen: boolean;
  isChecking: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onRerun: () => void;
}) {
  if (!isOpen || !memo) return null;

  const results = memo.metadata.lastCheckResults ?? [];
  const hasWarnings = results.some((result) => result.similarityScore >= 0.7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Similarity Check
            </h3>
            <p className="text-xs text-muted">{memo.title}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isChecking}
          >
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4 py-4">
          {isChecking && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-3 text-sm text-muted">
              <Loading size="sm" />
              Running similarity analysis...
            </div>
          )}

          {!isChecking && errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-warning-red/30 bg-warning-red-light px-3 py-3 text-sm text-warning-red">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!isChecking && !errorMessage && memo.metadata.hasBeenChecked && results.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-confirm-green/30 bg-confirm-green-light px-3 py-3 text-sm text-confirm-green">
              <CheckCircle2 className="h-4 w-4" />
              <span>No high-similarity references were found.</span>
            </div>
          )}

          {!isChecking && !errorMessage && results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {results.length} match{results.length > 1 ? "es" : ""}
                </p>
                <Badge variant={hasWarnings ? "warning" : "muted"}>
                  {hasWarnings ? "Review Needed" : "Low Risk"}
                </Badge>
              </div>

              {results.map((result, index) => {
                const scorePercent = Math.round(result.similarityScore * 100);
                const isWarning = result.similarityScore >= 0.7;
                return (
                  <div
                    key={`${memo.id}-${index}`}
                    className={`rounded-lg border px-3 py-3 ${
                      isWarning
                        ? "border-warning-red/35 bg-warning-red-light"
                        : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {result.matchedSong.title}
                        <span className="ml-1 text-xs font-normal text-muted">
                          · {result.matchedSong.artist}
                        </span>
                      </p>
                      <Badge variant={isWarning ? "warning" : "muted"}>
                        {TYPE_LABELS[result.similarityType]} {scorePercent}%
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      &ldquo;{result.matchedLine}&rdquo;
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button
            variant="secondary"
            onClick={onRerun}
            disabled={isChecking}
          >
            {isChecking ? "Checking..." : "Run Again"}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isChecking}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

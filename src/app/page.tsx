"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/hooks/useAppStore";
import { RhymeInput } from "@/components/rhyme/RhymeInput";
import { RhymeResults } from "@/components/rhyme/RhymeResults";
import { LyricsGenerator } from "@/components/lyrics/LyricsGenerator";
import { LyricsEditor } from "@/components/lyrics/LyricsEditor";
import { SimilarityChecker } from "@/components/lyrics/SimilarityChecker";
import { SavedMemosPanel } from "@/components/lyrics/SavedMemosPanel";
import { Button } from "@/components/ui/Button";

type FlowStep = "rhyme" | "generate" | "review";

const STEP_META: { id: FlowStep; title: string; summary: string }[] = [
  {
    id: "rhyme",
    title: "Find Rhymes",
    summary: "Pick a Korean-English rhyme pair first.",
  },
  {
    id: "generate",
    title: "Generate Lyrics",
    summary: "Create lyrics using your selected rhyme pair.",
  },
  {
    id: "review",
    title: "Review & Save",
    summary: "Edit, run similarity check, and save.",
  },
];

export default function Home() {
  const [activeStep, setActiveStep] = useState<FlowStep>("rhyme");

  const error = useAppStore((s) => s.error);
  const clearError = useAppStore((s) => s.clearError);
  const selectedRhymes = useAppStore((s) => s.selectedRhymes);
  const generatedLyrics = useAppStore((s) => s.generatedLyrics);
  const clearSelectedRhymes = useAppStore((s) => s.clearSelectedRhymes);
  const clearGeneratedLyrics = useAppStore((s) => s.clearGeneratedLyrics);
  const clearSimilarityResults = useAppStore((s) => s.clearSimilarityResults);

  const lyricsEditorKey = generatedLyrics
    .map((line, index) => `${index}:${line.text}`)
    .join("|");
  const canEnterGenerate = selectedRhymes.length > 0;
  const canEnterReview = generatedLyrics.length > 0;
  const currentStep = useMemo<FlowStep>(() => {
    if (activeStep === "generate" && canEnterReview) return "review";
    if (activeStep === "review" && !canEnterReview) {
      return canEnterGenerate ? "generate" : "rhyme";
    }
    if (activeStep === "generate" && !canEnterGenerate) return "rhyme";
    return activeStep;
  }, [activeStep, canEnterGenerate, canEnterReview]);

  const isStepEnabled = useMemo(
    () => ({
      rhyme: true,
      generate:
        canEnterGenerate || currentStep === "generate" || currentStep === "review",
      review: canEnterReview || currentStep === "review",
    }),
    [canEnterGenerate, canEnterReview, currentStep],
  );

  const handleFindNewRhymes = () => {
    clearGeneratedLyrics();
    clearSimilarityResults();
    clearSelectedRhymes();
    setActiveStep("rhyme");
  };

  const handleGenerateAgain = () => {
    clearGeneratedLyrics();
    clearSimilarityResults();
    setActiveStep(canEnterGenerate ? "generate" : "rhyme");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          CrossRhyme
        </h1>
        <p className="mt-2 text-sm text-muted">
          Guided workflow for Korean-English rhyme search and lyric writing.
        </p>
      </header>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-warning-red/30 bg-warning-red-light px-4 py-3">
          <span className="text-sm text-warning-red">{error.message}</span>
          <button
            type="button"
            onClick={clearError}
            className="text-sm font-medium text-warning-red hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <nav className="mb-8 grid gap-3 sm:grid-cols-3">
        {STEP_META.map((step, index) => {
          const isActive = currentStep === step.id;
          const enabled = isStepEnabled[step.id];
          return (
            <button
              key={step.id}
              type="button"
              disabled={!enabled}
              onClick={() => setActiveStep(step.id)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                isActive
                  ? "border-rhyme-blue bg-rhyme-blue-light"
                  : enabled
                    ? "border-border bg-surface hover:bg-surface-hover"
                    : "cursor-not-allowed border-border/60 bg-surface/50 opacity-60"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Step {index + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 text-xs text-muted">{step.summary}</p>
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        {currentStep === "rhyme" && (
          <motion.section
            key="step-rhyme"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <RhymeInput />
              <RhymeResults />
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Select at least one rhyme candidate to continue.
              </p>
              <Button
                onClick={() => setActiveStep("generate")}
                disabled={!canEnterGenerate}
              >
                Continue to Generate
              </Button>
            </div>
          </motion.section>
        )}

        {currentStep === "generate" && (
          <motion.section
            key="step-generate"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mx-auto flex max-w-3xl flex-col gap-6"
          >
            <LyricsGenerator />

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Generate lyrics to move into review and saving.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setActiveStep("rhyme")}>
                  Back to Rhymes
                </Button>
                <Button
                  onClick={() => setActiveStep("review")}
                  disabled={!canEnterReview}
                >
                  Continue to Review
                </Button>
              </div>
            </div>
          </motion.section>
        )}

        {currentStep === "review" && (
          <motion.section
            key="step-review"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="flex flex-col gap-6">
                <LyricsEditor key={lyricsEditorKey} />
                <SimilarityChecker />
              </div>
              <SavedMemosPanel />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleGenerateAgain}>
                Generate Again
              </Button>
              <Button variant="secondary" onClick={handleFindNewRhymes}>
                Find New Rhymes
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

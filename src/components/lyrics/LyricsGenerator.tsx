"use client";

import { Sparkles } from "lucide-react";
import { useAppStore } from "@/hooks/useAppStore";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Loading } from "@/components/ui/Loading";
import { RoughAnnotationWrapper } from "@/components/ui/RoughAnnotation";
import type { Genre, Mood } from "@/types";

const GENRE_OPTIONS: { value: Genre; label: string }[] = [
  { value: "kpop", label: "K-Pop" },
  { value: "hiphop", label: "Hip-Hop" },
  { value: "rnb", label: "R&B" },
  { value: "ballad", label: "Ballad" },
  { value: "rock", label: "Rock" },
  { value: "pop", label: "Pop" },
  { value: "indie", label: "Indie" },
  { value: "edm", label: "EDM" },
];

const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: "happy", label: "Happy" },
  { value: "sad", label: "Sad" },
  { value: "energetic", label: "Energetic" },
  { value: "chill", label: "Chill" },
  { value: "romantic", label: "Romantic" },
  { value: "angry", label: "Angry" },
  { value: "nostalgic", label: "Nostalgic" },
  { value: "hopeful", label: "Hopeful" },
];

export function LyricsGenerator() {
  const selectedRhymes = useAppStore((s) => s.selectedRhymes);
  const genre = useAppStore((s) => s.genre);
  const mood = useAppStore((s) => s.mood);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const setGenre = useAppStore((s) => s.setGenre);
  const setMood = useAppStore((s) => s.setMood);
  const generateLyrics = useAppStore((s) => s.generateLyrics);

  const hasRhymes = selectedRhymes.length > 0;

  const handleGenerate = () => {
    if (!hasRhymes || isGenerating) return;
    generateLyrics();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Lyrics</CardTitle>
      </CardHeader>

      <div className="flex flex-col gap-4">
        {hasRhymes ? (
          <div className="flex flex-wrap gap-2">
            {selectedRhymes.map((pair) => (
              <RoughAnnotationWrapper
                key={`${pair.ko}-${pair.en}`}
                type="bracket"
                show
                color="rhyme"
                brackets="left"
                strokeWidth={2}
                padding={[2, 4]}
              >
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span className="text-foreground">{pair.ko}</span>
                  <span className="text-muted-light">/</span>
                  <span className="text-ink-blue font-medium">{pair.en}</span>
                </span>
              </RoughAnnotationWrapper>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Selected rhyme pairs will appear here.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value as Genre)}
            options={GENRE_OPTIONS}
          />
          <Select
            label="Mood"
            value={mood}
            onChange={(e) => setMood(e.target.value as Mood)}
            options={MOOD_OPTIONS}
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!hasRhymes || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <Loading size="sm" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isGenerating ? "Generating..." : "Generate Lyrics"}
        </Button>

        {!hasRhymes && (
          <Badge variant="muted" className="self-center">
            Select at least one rhyme pair first
          </Badge>
        )}
      </div>
    </Card>
  );
}

"use client";

import { useAppStore } from "@/hooks/useAppStore";
import { RhymeInput } from "@/components/rhyme/RhymeInput";
import { RhymeResults } from "@/components/rhyme/RhymeResults";
import { LyricsGenerator } from "@/components/lyrics/LyricsGenerator";
import { LyricsEditor } from "@/components/lyrics/LyricsEditor";
import { SimilarityChecker } from "@/components/lyrics/SimilarityChecker";

export default function Home() {
  const error = useAppStore((s) => s.error);
  const clearError = useAppStore((s) => s.clearError);
  const generatedLyrics = useAppStore((s) => s.generatedLyrics);
  const lyricsEditorKey = generatedLyrics
    .map((line, index) => `${index}:${line.text}`)
    .join("|");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* 헤더 */}
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          CrossRhyme
        </h1>
        <p className="mt-2 text-sm text-muted">
          한국어-영어 크로스링구얼 라임 검색 &amp; 가사 생성
        </p>
      </header>

      {/* 에러 배너 */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-warning-red/30 bg-warning-red-light px-4 py-3">
          <span className="text-sm text-warning-red">{error.message}</span>
          <button
            type="button"
            onClick={clearError}
            className="text-sm font-medium text-warning-red hover:underline"
          >
            닫기
          </button>
        </div>
      )}

      {/* 2-column 레이아웃 (모바일에서는 단일 컬럼) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 좌측: 라임 검색 */}
        <div className="flex flex-col gap-6">
          <RhymeInput />
          <RhymeResults />
        </div>

        {/* 우측: 가사 생성 + 에디터 */}
        <div className="flex flex-col gap-6">
          <LyricsGenerator />
          <LyricsEditor key={lyricsEditorKey} />
          <SimilarityChecker />
        </div>
      </div>
    </div>
  );
}

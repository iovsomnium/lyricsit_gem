"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import { useAppStore } from "@/hooks/useAppStore";
import { countKoreanSyllables } from "@/lib/phonetics/korean-ipa";
import { countEnglishSyllables } from "@/lib/phonetics/english-ipa";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Loading } from "@/components/ui/Loading";
import { RoughAnnotationWrapper } from "@/components/ui/RoughAnnotation";
import type { Language, Theme } from "@/types";

// ============================================================
// Options
// ============================================================

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "love", label: "Love" },
  { value: "farewell", label: "Farewell" },
  { value: "freedom", label: "Freedom" },
  { value: "dream", label: "Dream" },
  { value: "night", label: "Night" },
  { value: "youth", label: "Youth" },
  { value: "pain", label: "Pain" },
  { value: "party", label: "Party" },
];

// ============================================================
// Component
// ============================================================

export function RhymeInput() {
  const inputText = useAppStore((s) => s.inputText);
  const inputLanguage = useAppStore((s) => s.inputLanguage);
  const theme = useAppStore((s) => s.theme);
  const isSearching = useAppStore((s) => s.isSearching);

  const setInputText = useAppStore((s) => s.setInputText);
  const setInputLanguage = useAppStore((s) => s.setInputLanguage);
  const setTheme = useAppStore((s) => s.setTheme);
  const searchRhymes = useAppStore((s) => s.searchRhymes);

  const syllableCount = useMemo(() => {
    const text = inputText.trim();
    if (!text) return 0;
    return inputLanguage === "ko"
      ? countKoreanSyllables(text)
      : countEnglishSyllables(text);
  }, [inputText, inputLanguage]);

  const toggleLanguage = () => {
    setInputLanguage(inputLanguage === "ko" ? "en" : "ko");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputText.trim() || isSearching) return;
    searchRhymes();
  };

  return (
    <Card className="border-transparent bg-transparent p-0 shadow-none">
      <RoughAnnotationWrapper
        type="box"
        as="div"
        show
        animate={false}
        color="ink"
        strokeWidth={1.65}
        iterations={3}
        padding={10}
        animationDuration={430}
      >
        <div className="rounded-xl bg-surface px-5 py-5">
          <CardHeader>
            <CardTitle>Find Rhymes</CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* 언어 토글 */}
            <div className="flex items-center gap-2">
              <LanguageToggle
                value={inputLanguage}
                onChange={toggleLanguage}
              />
            </div>

            {/* 텍스트 입력 + 음절 수 */}
            <RoughAnnotationWrapper
              type="box"
              as="div"
              show
              animate={false}
              color="ink"
              strokeWidth={1.2}
              iterations={2}
              padding={7}
              animationDuration={360}
            >
              <div className="relative rounded-lg bg-surface focus-within:ring-1 focus-within:ring-border-focus">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    inputLanguage === "ko"
                      ? "Enter a Korean word or phrase"
                      : "Enter an English word or phrase"
                  }
                  disabled={isSearching}
                  className="w-full rounded-lg border-transparent bg-transparent px-3 py-3 text-base text-foreground placeholder:text-muted-light focus:outline-none disabled:opacity-50"
                />
                {inputText.trim() && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted tabular-nums">
                    {syllableCount} syllables
                  </span>
                )}
              </div>
            </RoughAnnotationWrapper>

            <RoughAnnotationWrapper
              type="box"
              as="div"
              show
              animate={false}
              color="ink"
              strokeWidth={1.1}
              iterations={2}
              padding={6}
              animationDuration={340}
            >
              <div className="rounded-lg bg-surface px-1.5 py-1">
                <Select
                  label="Theme (optional)"
                  value={theme ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTheme(val ? (val as Theme) : null);
                  }}
                  className="border-transparent bg-transparent focus:ring-0"
                  placeholder="Select a theme"
                  options={THEME_OPTIONS}
                />
              </div>
            </RoughAnnotationWrapper>

            <Button
              type="submit"
              disabled={!inputText.trim() || isSearching}
              className="w-full"
            >
              {isSearching ? (
                <Loading size="sm" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isSearching ? "Searching..." : "Search Rhymes"}
            </Button>
          </form>
        </div>
      </RoughAnnotationWrapper>
    </Card>
  );
}

// ============================================================
// LanguageToggle (internal)
// ============================================================

function LanguageToggle({
  value,
  onChange,
}: {
  value: Language;
  onChange: () => void;
}) {
  return (
    <RoughAnnotationWrapper
      type="box"
      as="div"
      show
      animate={false}
      color="ink"
      strokeWidth={1.2}
      iterations={2}
      padding={[4, 7]}
      animationDuration={320}
    >
      <button
        type="button"
        onClick={onChange}
        className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-hover"
      >
        <span className={value === "ko" ? "text-foreground" : "text-muted-light"}>Korean</span>
        <span className="text-muted-light">↔</span>
        <span className={value === "en" ? "text-ink-blue font-semibold" : "text-muted-light"}>
          English
        </span>
      </button>
    </RoughAnnotationWrapper>
  );
}

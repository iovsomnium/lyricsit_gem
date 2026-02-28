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
    <Card>
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
        <div className="relative">
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
            className="w-full rounded-lg border border-border bg-surface px-3 py-3 text-base text-foreground placeholder:text-muted-light focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus disabled:opacity-50"
          />
          {inputText.trim() && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted tabular-nums">
              {syllableCount} syllables
            </span>
          )}
        </div>

        <Select
          label="Theme (optional)"
          value={theme ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setTheme(val ? (val as Theme) : null);
          }}
          placeholder="Select a theme"
          options={THEME_OPTIONS}
        />

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
    <button
      type="button"
      onClick={onChange}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-hover"
    >
      <span className={value === "ko" ? "text-foreground" : "text-muted-light"}>Korean</span>
      <span className="text-muted-light">↔</span>
      <span className={value === "en" ? "text-ink-blue font-semibold" : "text-muted-light"}>
        English
      </span>
    </button>
  );
}

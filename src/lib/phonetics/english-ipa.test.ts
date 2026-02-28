import { afterEach, describe, expect, it } from "vitest";
import {
  analyzeEnglishPhonetics,
  clearEnglishPronunciationDictionary,
  countEnglishSyllables,
  countEnglishSyllablesInWord,
  englishToIPA,
  setEnglishPronunciationDictionary,
  splitEnglishSyllables,
} from "./english-ipa";

afterEach(() => {
  clearEnglishPronunciationDictionary();
});

describe("countEnglishSyllablesInWord", () => {
  it("estimates common single-word syllable counts", () => {
    expect(countEnglishSyllablesInWord("love")).toBe(1);
    expect(countEnglishSyllablesInWord("freedom")).toBe(2);
    expect(countEnglishSyllablesInWord("beautiful")).toBe(3);
    expect(countEnglishSyllablesInWord("table")).toBe(2);
  });
});

describe("countEnglishSyllables", () => {
  it("counts syllables across multi-word text", () => {
    expect(countEnglishSyllables("Party tonight!")).toBe(4);
  });
});

describe("splitEnglishSyllables", () => {
  it("splits words into rough syllable chunks", () => {
    expect(splitEnglishSyllables("freedom")).toEqual(["free", "dom"]);
    expect(splitEnglishSyllables("party tonight")).toEqual([
      "par",
      "ty",
      "to",
      "night",
    ]);
  });
});

describe("englishToIPA", () => {
  it("transcribes with heuristic rules and exceptions", () => {
    expect(englishToIPA("love me free song")).toBe("lʌv mi fɹi sɔŋ");
  });

  it("uses CMU dictionary entries when provided", () => {
    setEnglishPronunciationDictionary({
      read: ["R EH1 D"],
    });
    expect(englishToIPA("read")).toBe("ɹɛd");
  });
});

describe("analyzeEnglishPhonetics", () => {
  it("builds a Phonetics payload for English input", () => {
    expect(analyzeEnglishPhonetics("Love me free")).toEqual({
      original: "Love me free",
      romanized: "love me free",
      ipa: "lʌv mi fɹi",
      syllables: ["love", "me", "free"],
      syllableCount: 3,
    });
  });
});


import { describe, expect, it } from "vitest";
import {
  getEnglishIPARhymeTail,
  normalizeIPAForRhyme,
  normalizeIPASyllableParts,
  parseEnglishIPASyllable,
} from "./ipa-syllable";

describe("parseEnglishIPASyllable", () => {
  it("splits onset, nucleus, coda for simple syllables", () => {
    expect(parseEnglishIPASyllable("fɹi")).toEqual({
      syllable: "fɹi",
      onset: "fɹ",
      nucleus: "i",
      coda: "",
      tail: "i",
    });

    expect(parseEnglishIPASyllable("sɔŋ")).toEqual({
      syllable: "sɔŋ",
      onset: "s",
      nucleus: "ɔ",
      coda: "ŋ",
      tail: "ɔŋ",
    });
  });

  it("returns null when no nucleus exists", () => {
    expect(parseEnglishIPASyllable("tʃ")).toBeNull();
  });
});

describe("getEnglishIPARhymeTail", () => {
  it("extracts tail from the last English syllable", () => {
    expect(getEnglishIPARhymeTail("hold me free")).toEqual({
      syllable: "fɹi",
      onset: "fɹ",
      nucleus: "i",
      coda: "",
      tail: "i",
    });

    expect(getEnglishIPARhymeTail("sing a song")).toEqual({
      syllable: "sɔŋ",
      onset: "s",
      nucleus: "ɔ",
      coda: "ŋ",
      tail: "ɔŋ",
    });
  });

  it("returns null when no English syllable exists", () => {
    expect(getEnglishIPARhymeTail("1234 !!!")).toBeNull();
  });
});

describe("IPA normalization", () => {
  it("normalizes cross-lingual IPA symbols before comparison", () => {
    expect(normalizeIPAForRhyme("k̚ ɾaŋ tɕʰi ɦe")).toBe("k ɹaŋ tʃi he");
  });

  it("normalizes syllable parts object", () => {
    expect(
      normalizeIPASyllableParts({
        syllable: "tɕʰi",
        onset: "tɕʰ",
        nucleus: "i",
        coda: "",
        tail: "tɕʰi",
      }),
    ).toEqual({
      syllable: "tʃi",
      onset: "tʃ",
      nucleus: "i",
      coda: "",
      tail: "i",
    });
  });
});


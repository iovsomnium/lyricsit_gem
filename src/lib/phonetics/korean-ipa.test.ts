import { describe, expect, it } from "vitest";
import {
  analyzeKoreanPhonetics,
  countKoreanSyllables,
  decomposeHangul,
  getKoreanIPARhymeTail,
  koreanToIPA,
  koreanToIPASyllables,
  koreanToRoman,
  koreanToRomanSyllables,
  parseKoreanIPASyllable,
} from "./korean-ipa";

describe("decomposeHangul", () => {
  it("decomposes a Hangul syllable into jamo + phonetic forms", () => {
    expect(decomposeHangul("강")).toEqual({
      initial: "ㄱ",
      medial: "ㅏ",
      final: "ㅇ",
      ipa: "kaŋ",
      roman: "gang",
    });
  });

  it("returns null for non-Hangul characters", () => {
    expect(decomposeHangul("A")).toBeNull();
  });
});

describe("koreanToRoman", () => {
  it("converts Korean text with pronunciation-oriented romanization", () => {
    expect(koreanToRoman("사랑해")).toBe("sa-rang-hae");
  });

  it("applies major phonological rules", () => {
    expect(koreanToRoman("같이")).toBe("ga-chi");
    expect(koreanToRoman("국물")).toBe("gung-mul");
    expect(koreanToRoman("신라")).toBe("sil-la");
  });

  it("keeps English words and removes symbols/numbers", () => {
    expect(koreanToRoman("사랑해!!! 2026 love")).toBe("sa-rang-hae love");
  });
});

describe("koreanToIPA", () => {
  it("converts Korean text to IPA-like sequence with syllable spacing", () => {
    expect(koreanToIPA("사랑해")).toBe("sa ɾaŋ ɦe");
  });

  it("applies major phonological rules", () => {
    expect(koreanToIPA("같이")).toBe("ka tɕʰi");
    expect(koreanToIPA("국물")).toBe("kuŋ mul");
    expect(koreanToIPA("신라")).toBe("ɕil la");
  });

  it("keeps English words and removes symbols/numbers", () => {
    expect(koreanToIPA("사랑해!!! 2026 love")).toBe("sa ɾaŋ ɦe love");
  });
});

describe("syllable-level conversions", () => {
  it("returns IPA syllable array for Korean-only parsing", () => {
    expect(koreanToIPASyllables("사랑해 love")).toEqual(["sa", "ɾaŋ", "ɦe"]);
  });

  it("returns roman syllable array for Korean-only parsing", () => {
    expect(koreanToRomanSyllables("사랑해 love")).toEqual(["sa", "rang", "hae"]);
  });
});

describe("countKoreanSyllables", () => {
  it("counts Hangul syllable blocks", () => {
    expect(countKoreanSyllables("사랑해")).toBe(3);
  });

  it("counts decomposed vowel jamo as syllable nuclei", () => {
    expect(countKoreanSyllables("ㄱㅏㄴㅏ")).toBe(2);
  });

  it("ignores non-Korean characters", () => {
    expect(countKoreanSyllables("love 2026 !!!")).toBe(0);
  });
});

describe("analyzeKoreanPhonetics", () => {
  it("builds a Phonetics payload including syllables and count", () => {
    expect(analyzeKoreanPhonetics("사랑해")).toEqual({
      original: "사랑해",
      romanized: "sa-rang-hae",
      ipa: "sa ɾaŋ ɦe",
      syllables: ["sa", "rang", "hae"],
      syllableCount: 3,
    });
  });
});

describe("IPA rhyme tail extraction", () => {
  it("parses IPA syllable into onset/nucleus/coda/tail", () => {
    expect(parseKoreanIPASyllable("ɦe")).toEqual({
      syllable: "ɦe",
      onset: "ɦ",
      nucleus: "e",
      coda: "",
      tail: "e",
    });

    expect(parseKoreanIPASyllable("ɾaŋ")).toEqual({
      syllable: "ɾaŋ",
      onset: "ɾ",
      nucleus: "a",
      coda: "ŋ",
      tail: "aŋ",
    });
  });

  it("extracts the last Korean IPA syllable tail for rhyme matching", () => {
    expect(getKoreanIPARhymeTail("사랑해")).toEqual({
      syllable: "ɦe",
      onset: "ɦ",
      nucleus: "e",
      coda: "",
      tail: "e",
    });

    expect(getKoreanIPARhymeTail("사랑")).toEqual({
      syllable: "ɾaŋ",
      onset: "ɾ",
      nucleus: "a",
      coda: "ŋ",
      tail: "aŋ",
    });
  });

  it("returns null when no Korean syllable exists", () => {
    expect(getKoreanIPARhymeTail("love only")).toBeNull();
  });
});

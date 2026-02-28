import type { Phonetics } from "@/types";
import type { IPASyllableParts } from "./ipa-syllable";

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const MEDIAL_COUNT = 21;
const FINAL_COUNT = 28;

const INITIAL_JAMO = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

const MEDIAL_JAMO = [
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅘ",
  "ㅙ",
  "ㅚ",
  "ㅛ",
  "ㅜ",
  "ㅝ",
  "ㅞ",
  "ㅟ",
  "ㅠ",
  "ㅡ",
  "ㅢ",
  "ㅣ",
] as const;

const FINAL_JAMO = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

type InitialJamo = (typeof INITIAL_JAMO)[number];
type MedialJamo = (typeof MEDIAL_JAMO)[number];
type FinalJamo = (typeof FINAL_JAMO)[number];
type NonEmptyFinalJamo = Exclude<FinalJamo, "">;

type HangulSyllable = {
  initial: InitialJamo;
  medial: MedialJamo;
  final: FinalJamo;
};

export type DecomposedHangul = {
  initial: InitialJamo;
  medial: MedialJamo;
  final: NonEmptyFinalJamo | null;
  ipa: string;
  roman: string;
};

export type KoreanIPASyllableParts = IPASyllableParts;

const INITIAL_TO_IPA: Record<InitialJamo, string> = {
  ㄱ: "k",
  ㄲ: "k͈",
  ㄴ: "n",
  ㄷ: "t",
  ㄸ: "t͈",
  ㄹ: "ɾ",
  ㅁ: "m",
  ㅂ: "p",
  ㅃ: "p͈",
  ㅅ: "s",
  ㅆ: "s͈",
  ㅇ: "",
  ㅈ: "tɕ",
  ㅉ: "tɕ͈",
  ㅊ: "tɕʰ",
  ㅋ: "kʰ",
  ㅌ: "tʰ",
  ㅍ: "pʰ",
  ㅎ: "ɦ",
};

const MEDIAL_TO_IPA: Record<MedialJamo, string> = {
  ㅏ: "a",
  ㅐ: "e",
  ㅑ: "ja",
  ㅒ: "je",
  ㅓ: "ʌ",
  ㅔ: "e",
  ㅕ: "jʌ",
  ㅖ: "je",
  ㅗ: "o",
  ㅘ: "wa",
  ㅙ: "wɛ",
  ㅚ: "we",
  ㅛ: "jo",
  ㅜ: "u",
  ㅝ: "wʌ",
  ㅞ: "we",
  ㅟ: "wi",
  ㅠ: "ju",
  ㅡ: "ɯ",
  ㅢ: "ɯi",
  ㅣ: "i",
};

const FINAL_TO_IPA: Record<FinalJamo, string> = {
  "": "",
  ㄱ: "k̚",
  ㄲ: "k̚",
  ㄳ: "k̚",
  ㄴ: "n",
  ㄵ: "n",
  ㄶ: "n",
  ㄷ: "t̚",
  ㄹ: "l",
  ㄺ: "k̚",
  ㄻ: "m",
  ㄼ: "l",
  ㄽ: "l",
  ㄾ: "l",
  ㄿ: "p̚",
  ㅀ: "l",
  ㅁ: "m",
  ㅂ: "p̚",
  ㅄ: "p̚",
  ㅅ: "t̚",
  ㅆ: "t̚",
  ㅇ: "ŋ",
  ㅈ: "t̚",
  ㅊ: "t̚",
  ㅋ: "k̚",
  ㅌ: "t̚",
  ㅍ: "p̚",
  ㅎ: "t̚",
};

const INITIAL_TO_ROMAN: Record<InitialJamo, string> = {
  ㄱ: "g",
  ㄲ: "kk",
  ㄴ: "n",
  ㄷ: "d",
  ㄸ: "tt",
  ㄹ: "r",
  ㅁ: "m",
  ㅂ: "b",
  ㅃ: "pp",
  ㅅ: "s",
  ㅆ: "ss",
  ㅇ: "",
  ㅈ: "j",
  ㅉ: "jj",
  ㅊ: "ch",
  ㅋ: "k",
  ㅌ: "t",
  ㅍ: "p",
  ㅎ: "h",
};

const MEDIAL_TO_ROMAN: Record<MedialJamo, string> = {
  ㅏ: "a",
  ㅐ: "ae",
  ㅑ: "ya",
  ㅒ: "yae",
  ㅓ: "eo",
  ㅔ: "e",
  ㅕ: "yeo",
  ㅖ: "ye",
  ㅗ: "o",
  ㅘ: "wa",
  ㅙ: "wae",
  ㅚ: "oe",
  ㅛ: "yo",
  ㅜ: "u",
  ㅝ: "wo",
  ㅞ: "we",
  ㅟ: "wi",
  ㅠ: "yu",
  ㅡ: "eu",
  ㅢ: "ui",
  ㅣ: "i",
};

const FINAL_TO_ROMAN: Record<FinalJamo, string> = {
  "": "",
  ㄱ: "k",
  ㄲ: "k",
  ㄳ: "k",
  ㄴ: "n",
  ㄵ: "n",
  ㄶ: "n",
  ㄷ: "t",
  ㄹ: "l",
  ㄺ: "k",
  ㄻ: "m",
  ㄼ: "l",
  ㄽ: "l",
  ㄾ: "l",
  ㄿ: "p",
  ㅀ: "l",
  ㅁ: "m",
  ㅂ: "p",
  ㅄ: "p",
  ㅅ: "t",
  ㅆ: "t",
  ㅇ: "ng",
  ㅈ: "t",
  ㅊ: "t",
  ㅋ: "k",
  ㅌ: "t",
  ㅍ: "p",
  ㅎ: "t",
};

const IOTIZED_MEDIALS = new Set<MedialJamo>(["ㅣ", "ㅑ", "ㅕ", "ㅛ", "ㅠ", "ㅒ", "ㅖ"]);

const FINAL_LIAISON_SPLIT_MAP: Partial<
  Record<NonEmptyFinalJamo, { remain: FinalJamo; move: InitialJamo | "" }>
> = {
  ㄳ: { remain: "ㄱ", move: "ㅅ" },
  ㄵ: { remain: "ㄴ", move: "ㅈ" },
  ㄶ: { remain: "ㄴ", move: "" },
  ㄺ: { remain: "ㄹ", move: "ㄱ" },
  ㄻ: { remain: "ㄹ", move: "ㅁ" },
  ㄼ: { remain: "ㄹ", move: "ㅂ" },
  ㄽ: { remain: "ㄹ", move: "ㅅ" },
  ㄾ: { remain: "ㄹ", move: "ㅌ" },
  ㄿ: { remain: "ㄹ", move: "ㅍ" },
  ㅀ: { remain: "ㄹ", move: "" },
  ㅄ: { remain: "ㅂ", move: "ㅅ" },
};

const FINAL_TO_ONSET_MAP: Partial<Record<NonEmptyFinalJamo, InitialJamo | "">> = {
  ㄱ: "ㄱ",
  ㄲ: "ㄲ",
  ㄴ: "ㄴ",
  ㄷ: "ㄷ",
  ㄹ: "ㄹ",
  ㅁ: "ㅁ",
  ㅂ: "ㅂ",
  ㅅ: "ㅅ",
  ㅆ: "ㅆ",
  ㅈ: "ㅈ",
  ㅊ: "ㅊ",
  ㅋ: "ㅋ",
  ㅌ: "ㅌ",
  ㅍ: "ㅍ",
  ㅎ: "",
};

const NASALIZATION_MAP: Partial<Record<NonEmptyFinalJamo, FinalJamo>> = {
  ㄱ: "ㅇ",
  ㄲ: "ㅇ",
  ㄳ: "ㅇ",
  ㄺ: "ㅇ",
  ㅋ: "ㅇ",
  ㄷ: "ㄴ",
  ㅅ: "ㄴ",
  ㅆ: "ㄴ",
  ㅈ: "ㄴ",
  ㅊ: "ㄴ",
  ㅌ: "ㄴ",
  ㅎ: "ㄴ",
  ㅂ: "ㅁ",
  ㅄ: "ㅁ",
  ㄼ: "ㅁ",
  ㄿ: "ㅁ",
  ㅍ: "ㅁ",
};

const ASPIRATED_INITIAL_MAP: Partial<Record<InitialJamo, InitialJamo>> = {
  ㄱ: "ㅋ",
  ㄷ: "ㅌ",
  ㅂ: "ㅍ",
  ㅈ: "ㅊ",
};

const KOREAN_INPUT_SANITIZE_REGEX =
  /[^A-Za-z\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\ud7b0-\ud7ff\s]/g;

const IPA_ONSET_VALUES = new Set<string>([
  ...new Set(Object.values(INITIAL_TO_IPA)),
  "ɕ",
  "ɕ͈",
  "l",
]);
const IPA_NUCLEUS_VALUES = [...new Set(Object.values(MEDIAL_TO_IPA))].sort(
  (left, right) => right.length - left.length,
);
const IPA_CODA_VALUES = new Set<string>(Object.values(FINAL_TO_IPA));

function isHangulSyllable(char: string): boolean {
  if (char.length !== 1) return false;
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) return false;
  return codePoint >= HANGUL_BASE && codePoint <= HANGUL_END;
}

function decomposeSyllable(char: string): HangulSyllable | null {
  if (!isHangulSyllable(char)) return null;

  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) return null;

  const offset = codePoint - HANGUL_BASE;
  const initialIndex = Math.floor(offset / (MEDIAL_COUNT * FINAL_COUNT));
  const medialIndex = Math.floor((offset % (MEDIAL_COUNT * FINAL_COUNT)) / FINAL_COUNT);
  const finalIndex = offset % FINAL_COUNT;

  return {
    initial: INITIAL_JAMO[initialIndex],
    medial: MEDIAL_JAMO[medialIndex],
    final: FINAL_JAMO[finalIndex],
  };
}

function sanitizeInput(text: string): string {
  return text.replace(KOREAN_INPUT_SANITIZE_REGEX, "").replace(/\s+/g, " ").trim();
}

function isHangulSegment(segment: string): boolean {
  return /^[가-힣]+$/.test(segment);
}

function getHangulSegments(word: string): string[] {
  return word.match(/[A-Za-z]+|[가-힣]+/g) ?? [];
}

function cloneSyllables(syllables: HangulSyllable[]): HangulSyllable[] {
  return syllables.map((syllable) => ({ ...syllable }));
}

function applyPalatalization(syllables: HangulSyllable[]): void {
  for (let index = 0; index < syllables.length - 1; index += 1) {
    const current = syllables[index];
    const next = syllables[index + 1];

    if (next.initial !== "ㅇ" || !IOTIZED_MEDIALS.has(next.medial)) continue;
    if (current.final === "ㄷ") {
      current.final = "";
      next.initial = "ㅈ";
      continue;
    }
    if (current.final === "ㅌ") {
      current.final = "";
      next.initial = "ㅊ";
    }
  }
}

function applyAspirationWithH(syllables: HangulSyllable[]): void {
  for (let index = 0; index < syllables.length - 1; index += 1) {
    const current = syllables[index];
    const next = syllables[index + 1];

    const aspirated = ASPIRATED_INITIAL_MAP[next.initial];
    if (!aspirated) continue;

    if (current.final === "ㅎ") {
      current.final = "";
      next.initial = aspirated;
      continue;
    }
    if (current.final === "ㄶ") {
      current.final = "ㄴ";
      next.initial = aspirated;
      continue;
    }
    if (current.final === "ㅀ") {
      current.final = "ㄹ";
      next.initial = aspirated;
    }
  }
}

function applyLiaison(syllables: HangulSyllable[]): void {
  for (let index = 0; index < syllables.length - 1; index += 1) {
    const current = syllables[index];
    const next = syllables[index + 1];

    if (current.final === "" || next.initial !== "ㅇ") continue;

    const split = FINAL_LIAISON_SPLIT_MAP[current.final as NonEmptyFinalJamo];
    if (split) {
      current.final = split.remain;
      if (split.move !== "") next.initial = split.move;
      continue;
    }

    const onset = FINAL_TO_ONSET_MAP[current.final as NonEmptyFinalJamo];
    if (onset === undefined) continue;

    current.final = "";
    if (onset !== "") next.initial = onset;
  }
}

function applyNasalLiquidRules(syllables: HangulSyllable[]): void {
  for (let index = 0; index < syllables.length - 1; index += 1) {
    const current = syllables[index];
    const next = syllables[index + 1];

    if (current.final === "") continue;

    if (next.initial === "ㄴ" || next.initial === "ㅁ") {
      const nasalized = NASALIZATION_MAP[current.final as NonEmptyFinalJamo];
      if (nasalized) current.final = nasalized;
      continue;
    }

    if (next.initial !== "ㄹ") continue;

    if (current.final === "ㄴ") {
      current.final = "ㄹ";
      next.initial = "ㄹ";
      continue;
    }

    if (current.final === "ㄹ") {
      next.initial = "ㄹ";
      continue;
    }

    const nasalized = NASALIZATION_MAP[current.final as NonEmptyFinalJamo];
    if (nasalized) {
      current.final = nasalized;
      next.initial = "ㄴ";
      continue;
    }

    if (current.final === "ㅁ" || current.final === "ㅇ") {
      next.initial = "ㄴ";
    }
  }
}

function applyPhonologicalRules(syllables: HangulSyllable[]): HangulSyllable[] {
  const result = cloneSyllables(syllables);
  applyPalatalization(result);
  applyAspirationWithH(result);
  applyLiaison(result);
  applyNasalLiquidRules(result);
  return result;
}

function getContextualInitialIPA(
  syllable: HangulSyllable,
  index: number,
  syllables: HangulSyllable[],
): string {
  if (syllable.initial === "ㄹ" && index > 0 && syllables[index - 1].final === "ㄹ") {
    return "l";
  }

  return syllable.initial === "ㅅ" && IOTIZED_MEDIALS.has(syllable.medial)
      ? "ɕ"
      : syllable.initial === "ㅆ" && IOTIZED_MEDIALS.has(syllable.medial)
        ? "ɕ͈"
        : INITIAL_TO_IPA[syllable.initial];
}

function getContextualInitialRoman(
  syllable: HangulSyllable,
  index: number,
  syllables: HangulSyllable[],
): string {
  if (syllable.initial === "ㄹ" && index > 0 && syllables[index - 1].final === "ㄹ") {
    return "l";
  }
  return INITIAL_TO_ROMAN[syllable.initial];
}

function convertHangulWord(text: string, mode: "ipa" | "roman"): string {
  const rendered = convertHangulWordToSyllables(text, mode);
  return rendered.join(mode === "ipa" ? " " : "-");
}

function convertHangulWordToSyllables(text: string, mode: "ipa" | "roman"): string[] {
  const syllables: HangulSyllable[] = [];
  for (const char of text) {
    const decomposed = decomposeSyllable(char);
    if (decomposed) syllables.push(decomposed);
  }

  const pronounced = applyPhonologicalRules(syllables);
  return pronounced.map((syllable, index) => {
    if (mode === "ipa") {
      return `${getContextualInitialIPA(syllable, index, pronounced)}${MEDIAL_TO_IPA[syllable.medial]}${FINAL_TO_IPA[syllable.final]}`;
    }
    return `${getContextualInitialRoman(syllable, index, pronounced)}${MEDIAL_TO_ROMAN[syllable.medial]}${FINAL_TO_ROMAN[syllable.final]}`;
  });
}

function convertWord(word: string, mode: "ipa" | "roman"): string {
  const segments = getHangulSegments(word);
  if (segments.length === 0) return word;

  const converted = segments.map((segment) => {
    if (!isHangulSegment(segment)) return segment;
    return convertHangulWord(segment, mode);
  });

  const separator = mode === "ipa" ? " " : "";
  return converted.join(separator).replace(/\s+/g, " ").trim();
}

function isKoreanMedialJamo(char: string): boolean {
  if (char.length !== 1) return false;
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) return false;

  return (
    (codePoint >= 0x314f && codePoint <= 0x3163) ||
    (codePoint >= 0x1161 && codePoint <= 0x1175) ||
    (codePoint >= 0xd7b0 && codePoint <= 0xd7c6)
  );
}

function getKoreanSyllablesByMode(text: string, mode: "ipa" | "roman"): string[] {
  const sanitized = sanitizeInput(text);
  if (!sanitized) return [];

  const words = sanitized.split(/\s+/);
  const syllables: string[] = [];

  for (const word of words) {
    const segments = getHangulSegments(word);
    for (const segment of segments) {
      if (!isHangulSegment(segment)) continue;
      syllables.push(...convertHangulWordToSyllables(segment, mode));
    }
  }

  return syllables;
}

/**
 * Hangul syllable decomposition from a single character.
 */
export function decomposeHangul(char: string): DecomposedHangul | null {
  const syllable = decomposeSyllable(char);
  if (!syllable) return null;

  return {
    initial: syllable.initial,
    medial: syllable.medial,
    final: syllable.final === "" ? null : (syllable.final as NonEmptyFinalJamo),
    ipa: `${INITIAL_TO_IPA[syllable.initial]}${MEDIAL_TO_IPA[syllable.medial]}${FINAL_TO_IPA[syllable.final]}`,
    roman: `${INITIAL_TO_ROMAN[syllable.initial]}${MEDIAL_TO_ROMAN[syllable.medial]}${FINAL_TO_ROMAN[syllable.final]}`,
  };
}

/**
 * Convert Korean text to IPA-like phonetic string.
 * - Keeps English letters
 * - Removes numbers and symbols
 * - Applies lightweight Korean phonological rules
 */
export function koreanToIPA(text: string): string {
  const sanitized = sanitizeInput(text);
  if (!sanitized) return "";

  const words = sanitized.split(/\s+/);
  return words.map((word) => convertWord(word, "ipa")).join(" ").trim();
}

/**
 * Convert Korean text to IPA syllable array.
 * Returns only Korean syllables (English tokens are excluded).
 */
export function koreanToIPASyllables(text: string): string[] {
  return getKoreanSyllablesByMode(text, "ipa");
}

/**
 * Convert Korean text to pronunciation-driven romanization.
 * - Keeps English letters
 * - Removes numbers and symbols
 * - Joins Korean syllables with hyphen
 */
export function koreanToRoman(text: string): string {
  const sanitized = sanitizeInput(text);
  if (!sanitized) return "";

  const words = sanitized.split(/\s+/);
  return words.map((word) => convertWord(word, "roman")).join(" ").trim();
}

/**
 * Convert Korean text to pronunciation-driven roman syllable array.
 * Returns only Korean syllables (English tokens are excluded).
 */
export function koreanToRomanSyllables(text: string): string[] {
  return getKoreanSyllablesByMode(text, "roman");
}

/**
 * Count Korean syllables.
 * - Counts precomposed Hangul syllables (가-힣)
 * - Also counts standalone/decomposed Korean vowel jamo as syllable nuclei
 */
export function countKoreanSyllables(text: string): number {
  const normalized = text.normalize("NFC");
  let count = 0;

  for (const char of normalized) {
    if (isHangulSyllable(char) || isKoreanMedialJamo(char)) {
      count += 1;
    }
  }

  return count;
}

/**
 * Parse a Korean IPA syllable into onset/nucleus/coda.
 * Returns null when the syllable is outside this module's mapping space.
 */
export function parseKoreanIPASyllable(ipaSyllable: string): KoreanIPASyllableParts | null {
  for (const nucleus of IPA_NUCLEUS_VALUES) {
    let searchIndex = 0;

    while (searchIndex < ipaSyllable.length) {
      const nucleusIndex = ipaSyllable.indexOf(nucleus, searchIndex);
      if (nucleusIndex === -1) break;

      const onset = ipaSyllable.slice(0, nucleusIndex);
      const coda = ipaSyllable.slice(nucleusIndex + nucleus.length);

      if (IPA_ONSET_VALUES.has(onset) && IPA_CODA_VALUES.has(coda)) {
        return {
          syllable: ipaSyllable,
          onset,
          nucleus,
          coda,
          tail: `${nucleus}${coda}`,
        };
      }

      searchIndex = nucleusIndex + 1;
    }
  }

  return null;
}

/**
 * Extract rhyme-tail data from the last Korean IPA syllable in input text.
 * Returns null when no Korean syllable exists.
 */
export function getKoreanIPARhymeTail(text: string): KoreanIPASyllableParts | null {
  const ipaSyllables = koreanToIPASyllables(text);
  if (ipaSyllables.length === 0) return null;

  return parseKoreanIPASyllable(ipaSyllables[ipaSyllables.length - 1]);
}

/**
 * Build Phonetics object for Korean input.
 * `syllables` uses pronunciation-based roman syllables for UI/debugging,
 * while rhyme engine can consume `koreanToIPASyllables` for matching.
 */
export function analyzeKoreanPhonetics(text: string): Phonetics {
  const syllables = koreanToRomanSyllables(text);

  return {
    original: text,
    romanized: koreanToRoman(text),
    ipa: koreanToIPA(text),
    syllables,
    syllableCount: syllables.length,
  };
}

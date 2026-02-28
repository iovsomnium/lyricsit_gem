import type { Phonetics } from "@/types";

type CmuPronunciationDictionary = Record<string, string[]>;

const ENGLISH_WORD_REGEX = /[A-Za-z]+(?:'[A-Za-z]+)*/g;
const NON_ENGLISH_CHAR_REGEX = /[^A-Za-z'\s]/g;
const NON_LETTER_REGEX = /[^a-z]/g;

const ARPABET_TO_IPA: Record<string, string> = {
  AA: "ɑ",
  AE: "æ",
  AH: "ʌ",
  AO: "ɔ",
  AW: "aʊ",
  AY: "aɪ",
  B: "b",
  CH: "tʃ",
  D: "d",
  DH: "ð",
  EH: "ɛ",
  ER: "ɝ",
  EY: "eɪ",
  F: "f",
  G: "g",
  HH: "h",
  IH: "ɪ",
  IY: "i",
  JH: "dʒ",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ŋ",
  OW: "oʊ",
  OY: "ɔɪ",
  P: "p",
  R: "ɹ",
  S: "s",
  SH: "ʃ",
  T: "t",
  TH: "θ",
  UH: "ʊ",
  UW: "u",
  V: "v",
  W: "w",
  Y: "j",
  Z: "z",
  ZH: "ʒ",
  AX: "ə",
};

const ENGLISH_IPA_EXCEPTIONS: Record<string, string> = {
  be: "bi",
  come: "kʌm",
  done: "dʌn",
  free: "fɹi",
  love: "lʌv",
  me: "mi",
  none: "nʌn",
  one: "wʌn",
  see: "si",
  some: "sʌm",
  song: "sɔŋ",
  young: "jʌŋ",
  you: "ju",
};

const MULTI_LETTER_IPA_RULES: Array<[string, string]> = [
  ["tion", "ʃən"],
  ["sion", "ʒən"],
  ["eigh", "eɪ"],
  ["igh", "aɪ"],
  ["tch", "tʃ"],
  ["dge", "dʒ"],
  ["ch", "tʃ"],
  ["sh", "ʃ"],
  ["th", "θ"],
  ["ph", "f"],
  ["ng", "ŋ"],
  ["qu", "kw"],
  ["ck", "k"],
  ["wh", "w"],
  ["ee", "i"],
  ["ea", "i"],
  ["oo", "u"],
  ["ai", "eɪ"],
  ["ay", "eɪ"],
  ["oa", "oʊ"],
  ["ow", "aʊ"],
  ["ou", "aʊ"],
  ["oi", "ɔɪ"],
  ["oy", "ɔɪ"],
  ["au", "ɔ"],
  ["aw", "ɔ"],
  ["er", "ɚ"],
  ["ir", "ɝ"],
  ["ur", "ɝ"],
  ["ar", "ɑɹ"],
  ["or", "ɔɹ"],
];

const SINGLE_LETTER_IPA_MAP: Record<string, string> = {
  a: "æ",
  b: "b",
  c: "k",
  d: "d",
  e: "ɛ",
  f: "f",
  g: "g",
  h: "h",
  i: "ɪ",
  j: "dʒ",
  k: "k",
  l: "l",
  m: "m",
  n: "n",
  o: "ɑ",
  p: "p",
  q: "k",
  r: "ɹ",
  s: "s",
  t: "t",
  u: "ʌ",
  v: "v",
  w: "w",
  x: "ks",
  y: "j",
  z: "z",
};

let cmuDictionary: CmuPronunciationDictionary | null = null;

function sanitizeEnglishInput(text: string): string {
  return text.replace(NON_ENGLISH_CHAR_REGEX, " ").replace(/\s+/g, " ").trim();
}

function tokenizeEnglishWords(text: string): string[] {
  return sanitizeEnglishInput(text).match(ENGLISH_WORD_REGEX) ?? [];
}

function normalizeEnglishWord(word: string): string {
  return word.toLowerCase().replace(NON_LETTER_REGEX, "");
}

function toArpabetIPA(arpabetPronunciation: string): string {
  const phonemes = arpabetPronunciation.trim().split(/\s+/);
  const ipa = phonemes.map((phoneme) => {
    const normalizedPhoneme = phoneme.replace(/\d/g, "");
    return ARPABET_TO_IPA[normalizedPhoneme] ?? normalizedPhoneme.toLowerCase();
  });
  return ipa.join("");
}

function lookupCmuIPA(normalizedWord: string): string | null {
  if (!cmuDictionary) return null;
  const pronunciations = cmuDictionary[normalizedWord];
  if (!pronunciations || pronunciations.length === 0) return null;
  return toArpabetIPA(pronunciations[0]);
}

function heuristicWordToIPA(normalizedWord: string): string {
  const exception = ENGLISH_IPA_EXCEPTIONS[normalizedWord];
  if (exception) return exception;

  let index = 0;
  let result = "";

  while (index < normalizedWord.length) {
    if (
      index === normalizedWord.length - 1 &&
      normalizedWord[index] === "e" &&
      normalizedWord.length > 2
    ) {
      break;
    }

    let matchedRule = false;

    for (const [pattern, ipa] of MULTI_LETTER_IPA_RULES) {
      if (normalizedWord.startsWith(pattern, index)) {
        result += ipa;
        index += pattern.length;
        matchedRule = true;
        break;
      }
    }

    if (matchedRule) continue;

    const char = normalizedWord[index];
    result += SINGLE_LETTER_IPA_MAP[char] ?? char;
    index += 1;
  }

  return result || normalizedWord;
}

function wordToIPA(word: string): string {
  const normalizedWord = normalizeEnglishWord(word);
  if (!normalizedWord) return "";

  const cmuIPA = lookupCmuIPA(normalizedWord);
  if (cmuIPA) return cmuIPA;

  return heuristicWordToIPA(normalizedWord);
}

/**
 * Heuristic syllable count for a single English word.
 * Based on vowel groups with common silent-ending adjustments.
 */
export function countEnglishSyllablesInWord(word: string): number {
  const normalizedWord = normalizeEnglishWord(word);
  if (!normalizedWord) return 0;
  if (normalizedWord.length <= 3) return 1;

  const compact = normalizedWord
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/u, "")
    .replace(/^y/u, "");

  const vowelGroups = compact.match(/[aeiouy]+/gu);
  let count = vowelGroups?.length ?? 0;

  // Some adjacent vowels are pronounced separately (e.g., ra-dio, sci-ence).
  const hiatalPairs = compact.match(/ia|io|eo|iu|ua/gu);
  if (hiatalPairs) count += hiatalPairs.length;

  return Math.max(1, count);
}

function splitEnglishWordToSyllables(word: string): string[] {
  const normalizedWord = normalizeEnglishWord(word);
  if (!normalizedWord) return [];

  const targetSyllableCount = countEnglishSyllablesInWord(normalizedWord);
  if (targetSyllableCount <= 1) return [normalizedWord];

  const vowelGroups = Array.from(normalizedWord.matchAll(/[aeiouy]+/gu)).map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

  if (vowelGroups.length <= 1) return [normalizedWord];

  const boundaries: number[] = [0];
  for (let index = 0; index < vowelGroups.length - 1; index += 1) {
    const currentEnd = vowelGroups[index].end;
    const nextStart = vowelGroups[index + 1].start;
    const consonantGap = nextStart - currentEnd;
    const boundary =
      consonantGap <= 1 ? currentEnd : currentEnd + Math.floor(consonantGap / 2);
    boundaries.push(boundary);
  }
  boundaries.push(normalizedWord.length);

  const parts: string[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const syllable = normalizedWord.slice(boundaries[index], boundaries[index + 1]);
    if (syllable) parts.push(syllable);
  }

  while (parts.length > targetSyllableCount && parts.length > 1) {
    const mergeIndex = parts.length - 2;
    parts[mergeIndex] = `${parts[mergeIndex]}${parts[mergeIndex + 1]}`;
    parts.pop();
  }

  return parts.length > 0 ? parts : [normalizedWord];
}

/**
 * Estimate syllable count for an English text.
 */
export function countEnglishSyllables(text: string): number {
  const words = tokenizeEnglishWords(text);
  return words.reduce((total, word) => total + countEnglishSyllablesInWord(word), 0);
}

/**
 * Split English text into rough syllable chunks for rhyme analysis.
 */
export function splitEnglishSyllables(text: string): string[] {
  const words = tokenizeEnglishWords(text);
  return words.flatMap((word) => splitEnglishWordToSyllables(word));
}

/**
 * Convert English text to IPA-like form.
 * Uses CMU dictionary pronunciations if provided, otherwise falls back to heuristic rules.
 */
export function englishToIPA(text: string): string {
  const words = tokenizeEnglishWords(text);
  return words.map((word) => wordToIPA(word)).filter(Boolean).join(" ");
}

/**
 * Set CMU-like pronunciation dictionary data.
 * Example entry: { love: ["L AH1 V"] }
 */
export function setEnglishPronunciationDictionary(
  dictionary: CmuPronunciationDictionary,
): void {
  cmuDictionary = Object.fromEntries(
    Object.entries(dictionary).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

export function clearEnglishPronunciationDictionary(): void {
  cmuDictionary = null;
}

/**
 * Build Phonetics payload for English input.
 */
export function analyzeEnglishPhonetics(text: string): Phonetics {
  const words = tokenizeEnglishWords(text);
  const syllables = splitEnglishSyllables(text);

  return {
    original: text,
    romanized: words.map((word) => normalizeEnglishWord(word)).join(" ").trim(),
    ipa: englishToIPA(text),
    syllables,
    syllableCount: syllables.length,
  };
}

import type { Language } from "../../types";
import { englishToIPA, splitEnglishSyllables } from "../phonetics/english-ipa";
import { parseKoreanIPASyllable, koreanToIPASyllables } from "../phonetics/korean-ipa";
import {
  type IPASyllableParts,
  normalizeIPASyllableParts,
  parseEnglishIPASyllable,
} from "../phonetics/ipa-syllable";

export interface RhymeSimilarityResult {
  score: number;
  tailSimilarity: number;
  fullSimilarity: number;
  sourceTail: IPASyllableParts | null;
  targetTail: IPASyllableParts | null;
}

type DistanceTable = Record<string, Record<string, number>>;

const DEFAULT_VOWEL_DISTANCE = 0.55;
const DEFAULT_CODA_DISTANCE = 0.8;

const VOWEL_DISTANCE_TABLE: DistanceTable = {};
const CODA_DISTANCE_TABLE: DistanceTable = {};

const RIMELESS_CODA = "∅";

function setDistance(
  table: DistanceTable,
  left: string,
  right: string,
  distance: number,
): void {
  table[left] = table[left] ?? {};
  table[right] = table[right] ?? {};
  table[left][right] = distance;
  table[right][left] = distance;
}

function initializeDistanceTables(): void {
  const vowelPairs: Array<[string, string, number]> = [
    ["a", "ʌ", 0.2],
    ["a", "o", 0.35],
    ["a", "u", 0.9],
    ["a", "i", 0.8],
    ["ʌ", "o", 0.3],
    ["ʌ", "u", 0.45],
    ["ʌ", "i", 0.75],
    ["o", "u", 0.25],
    ["o", "i", 0.85],
    ["u", "i", 0.7],
    ["e", "i", 0.25],
    ["e", "ɛ", 0.15],
    ["i", "ɪ", 0.12],
    ["ʌ", "ə", 0.12],
    ["ɑ", "a", 0.1],
    ["ɔ", "o", 0.12],
    ["æ", "a", 0.2],
  ];

  const codaPairs: Array<[string, string, number]> = [
    ["ŋ", "n", 0.3],
    ["m", "n", 0.4],
    ["m", "ŋ", 0.45],
    ["k", "g", 0.2],
    ["t", "d", 0.2],
    ["p", "b", 0.2],
    ["t", "s", 0.35],
    ["t", "θ", 0.45],
    ["l", "ɹ", 0.2],
    ["s", "ʃ", 0.2],
    [RIMELESS_CODA, "n", 0.75],
    [RIMELESS_CODA, "m", 0.75],
    [RIMELESS_CODA, "ŋ", 0.75],
    [RIMELESS_CODA, "k", 0.8],
    [RIMELESS_CODA, "t", 0.8],
    [RIMELESS_CODA, "p", 0.8],
    [RIMELESS_CODA, "l", 0.7],
    [RIMELESS_CODA, "s", 0.8],
  ];

  for (const [left, right, distance] of vowelPairs) {
    setDistance(VOWEL_DISTANCE_TABLE, left, right, distance);
  }

  for (const [left, right, distance] of codaPairs) {
    setDistance(CODA_DISTANCE_TABLE, left, right, distance);
  }
}

initializeDistanceTables();

function clamp(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizedVowel(vowel: string): string {
  switch (vowel) {
    case "ja":
      return "a";
    case "jʌ":
      return "ʌ";
    case "je":
      return "e";
    case "jo":
      return "o";
    case "ju":
      return "u";
    case "wa":
      return "a";
    case "wʌ":
      return "ʌ";
    case "wɛ":
      return "e";
    case "we":
      return "e";
    case "wi":
      return "i";
    case "ɯi":
      return "i";
    default:
      return vowel;
  }
}

function distanceToSimilarity(distance: number): number {
  return clamp(1 - distance);
}

function lookupDistance(
  table: DistanceTable,
  left: string,
  right: string,
  fallback: number,
): number {
  if (left === right) return 0;
  return table[left]?.[right] ?? fallback;
}

function nucleusSimilarity(left: string, right: string): number {
  const leftNucleus = normalizedVowel(left);
  const rightNucleus = normalizedVowel(right);
  const distance = lookupDistance(
    VOWEL_DISTANCE_TABLE,
    leftNucleus,
    rightNucleus,
    DEFAULT_VOWEL_DISTANCE,
  );
  return distanceToSimilarity(distance);
}

function codaSimilarity(left: string, right: string): number {
  const leftCoda = left || RIMELESS_CODA;
  const rightCoda = right || RIMELESS_CODA;
  const distance = lookupDistance(
    CODA_DISTANCE_TABLE,
    leftCoda,
    rightCoda,
    DEFAULT_CODA_DISTANCE,
  );
  return distanceToSimilarity(distance);
}

function onsetSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0.45;
  if (left[0] === right[0]) return 0.6;
  return 0.15;
}

function syllableSimilarity(left: IPASyllableParts, right: IPASyllableParts): number {
  const nucleus = nucleusSimilarity(left.nucleus, right.nucleus);
  const coda = codaSimilarity(left.coda, right.coda);
  const onset = onsetSimilarity(left.onset, right.onset);
  return clamp(nucleus * 0.55 + coda * 0.3 + onset * 0.15);
}

function tailSimilarity(left: IPASyllableParts, right: IPASyllableParts): number {
  const nucleus = nucleusSimilarity(left.nucleus, right.nucleus);
  const coda = codaSimilarity(left.coda, right.coda);
  return clamp(nucleus * 0.75 + coda * 0.25);
}

function compareSyllableSequence(
  source: IPASyllableParts[],
  target: IPASyllableParts[],
): number {
  if (source.length === 0 || target.length === 0) return 0;

  const window = Math.max(source.length, target.length);
  let total = 0;

  for (let index = 0; index < window; index += 1) {
    const sourceSyllable = source[source.length - 1 - index];
    const targetSyllable = target[target.length - 1 - index];

    if (!sourceSyllable || !targetSyllable) continue;
    total += syllableSimilarity(sourceSyllable, targetSyllable);
  }

  return clamp(total / window);
}

function getEnglishSyllableParts(text: string): IPASyllableParts[] {
  const syllables = splitEnglishSyllables(text);
  const parts: IPASyllableParts[] = [];

  for (const syllable of syllables) {
    const ipaToken = englishToIPA(syllable).split(/\s+/)[0];
    if (!ipaToken) continue;
    const parsed = parseEnglishIPASyllable(ipaToken);
    if (parsed) parts.push(normalizeIPASyllableParts(parsed));
  }

  return parts;
}

function getKoreanSyllableParts(text: string): IPASyllableParts[] {
  const syllables = koreanToIPASyllables(text);
  const parts: IPASyllableParts[] = [];

  for (const syllable of syllables) {
    const parsed = parseKoreanIPASyllable(syllable);
    if (parsed) parts.push(normalizeIPASyllableParts(parsed));
  }

  return parts;
}

export function extractIPASyllableParts(text: string, language: Language): IPASyllableParts[] {
  return language === "ko" ? getKoreanSyllableParts(text) : getEnglishSyllableParts(text);
}

/**
 * Syllable-based rhyme similarity.
 * score = tailSimilarity * 0.7 + fullSimilarity * 0.3
 */
export function calculateRhymeSimilarity(
  sourceText: string,
  sourceLanguage: Language,
  targetText: string,
  targetLanguage: Language,
): RhymeSimilarityResult {
  const sourceSyllables = extractIPASyllableParts(sourceText, sourceLanguage);
  const targetSyllables = extractIPASyllableParts(targetText, targetLanguage);

  const sourceTail = sourceSyllables[sourceSyllables.length - 1] ?? null;
  const targetTail = targetSyllables[targetSyllables.length - 1] ?? null;

  const tail = sourceTail && targetTail ? tailSimilarity(sourceTail, targetTail) : 0;
  const full = compareSyllableSequence(sourceSyllables, targetSyllables);
  const score = clamp(tail * 0.7 + full * 0.3);

  return {
    score,
    tailSimilarity: tail,
    fullSimilarity: full,
    sourceTail,
    targetTail,
  };
}

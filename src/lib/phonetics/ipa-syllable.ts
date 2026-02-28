import { englishToIPA, splitEnglishSyllables } from "./english-ipa";

export interface IPASyllableParts {
  syllable: string;
  onset: string;
  nucleus: string;
  coda: string;
  tail: string;
}

const ENGLISH_NUCLEI = [
  "aɪ",
  "aʊ",
  "eɪ",
  "oʊ",
  "ɔɪ",
  "ɝ",
  "ɚ",
  "i",
  "ɪ",
  "e",
  "ɛ",
  "æ",
  "ɑ",
  "ɔ",
  "u",
  "ʊ",
  "ʌ",
  "ə",
] as const;

const IPA_NORMALIZATION_RULES: Array<[RegExp, string]> = [
  [/tɕʰ/g, "tʃ"],
  [/tɕ͈/g, "tʃ"],
  [/tɕ/g, "tʃ"],
  [/ɕ͈/g, "ʃ"],
  [/ɕ/g, "ʃ"],
  [/kʰ/g, "k"],
  [/tʰ/g, "t"],
  [/pʰ/g, "p"],
  [/k͈/g, "k"],
  [/t͈/g, "t"],
  [/p͈/g, "p"],
  [/s͈/g, "s"],
  [/k̚/g, "k"],
  [/t̚/g, "t"],
  [/p̚/g, "p"],
  [/ɦ/g, "h"],
  [/ɾ/g, "ɹ"],
];

function hasEnglishNucleus(fragment: string): boolean {
  return ENGLISH_NUCLEI.some((nucleus) => fragment.includes(nucleus));
}

function sanitizeIPAToken(ipa: string): string {
  return ipa.replace(/\//g, "").trim();
}

/**
 * Parse an English IPA syllable into onset/nucleus/coda parts.
 * Returns null when no valid nucleus split is found.
 */
export function parseEnglishIPASyllable(ipaSyllable: string): IPASyllableParts | null {
  const token = sanitizeIPAToken(ipaSyllable);
  if (!token) return null;

  const nuclei = [...ENGLISH_NUCLEI].sort((left, right) => right.length - left.length);

  for (const nucleus of nuclei) {
    let searchIndex = 0;

    while (searchIndex < token.length) {
      const nucleusIndex = token.indexOf(nucleus, searchIndex);
      if (nucleusIndex === -1) break;

      const onset = token.slice(0, nucleusIndex);
      const coda = token.slice(nucleusIndex + nucleus.length);

      if (!hasEnglishNucleus(onset) && !hasEnglishNucleus(coda)) {
        return {
          syllable: token,
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
 * Extract rhyme-tail parts from the last English syllable of text.
 * Uses local syllable split + local IPA conversion.
 */
export function getEnglishIPARhymeTail(text: string): IPASyllableParts | null {
  const syllables = splitEnglishSyllables(text);
  if (syllables.length === 0) return null;

  const lastSyllable = syllables[syllables.length - 1];
  const ipa = englishToIPA(lastSyllable);
  if (!ipa) return null;

  const ipaToken = ipa.split(/\s+/)[0];
  return parseEnglishIPASyllable(ipaToken);
}

/**
 * Normalize IPA for cross-lingual rhyme comparison.
 * Example mappings:
 * - /k̚/ -> /k/
 * - /ɾ/ -> /ɹ/
 * - /tɕ/ -> /tʃ/
 */
export function normalizeIPAForRhyme(ipa: string): string {
  const base = sanitizeIPAToken(ipa);
  if (!base) return "";

  let normalized = base;
  for (const [pattern, replacement] of IPA_NORMALIZATION_RULES) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.replace(/\s+/g, " ").trim();
}

/**
 * Normalize an IPA syllable-parts object.
 */
export function normalizeIPASyllableParts(parts: IPASyllableParts): IPASyllableParts {
  const onset = normalizeIPAForRhyme(parts.onset);
  const nucleus = normalizeIPAForRhyme(parts.nucleus);
  const coda = normalizeIPAForRhyme(parts.coda);

  return {
    syllable: normalizeIPAForRhyme(parts.syllable),
    onset,
    nucleus,
    coda,
    tail: `${nucleus}${coda}`,
  };
}


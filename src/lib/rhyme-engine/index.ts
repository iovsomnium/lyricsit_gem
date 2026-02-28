import { generateJSON } from "@/lib/gemini/client";
import { analyzeEnglishPhonetics, splitEnglishSyllables } from "@/lib/phonetics/english-ipa";
import { analyzeKoreanPhonetics } from "@/lib/phonetics/korean-ipa";
import { calculateRhymeSimilarity } from "@/lib/rhyme-engine/similarity";
import type {
  Language,
  Phonetics,
  RhymeCandidate,
  RhymeRequest,
  RhymeResponse,
} from "@/types";

type CandidateJSONResponse =
  | {
      candidates?: string[];
      words?: string[];
      results?: Array<{ word?: string }>;
    }
  | Array<{ word?: string } | string>;

function toAppError(message: string): { code: "INVALID_INPUT"; message: string } {
  return { code: "INVALID_INPUT", message };
}

function languageLabel(language: Language): string {
  return language === "ko" ? "Korean" : "English";
}

function clampMaxResults(maxResults?: number): number {
  if (!maxResults) return 10;
  if (maxResults < 1) return 1;
  if (maxResults > 30) return 30;
  return Math.floor(maxResults);
}

function analyzePhoneticsByLanguage(text: string, language: Language): Phonetics {
  return language === "ko" ? analyzeKoreanPhonetics(text) : analyzeEnglishPhonetics(text);
}

function buildRhymePrompt(request: RhymeRequest, anchorText: string, maxResults: number): string {
  const themeInstruction = request.theme
    ? `Theme context: ${request.theme}. Favor words naturally related to this theme.`
    : "Theme context: none.";

  return `
You are a rhyme candidate generator for lyrics writing.
Return only JSON and no extra text.

Task:
- Full input text: "${request.input}"
- Rhyme focus segment (randomly chosen from input): "${anchorText}"
- Input language: ${languageLabel(request.inputLanguage)}
- Target language: ${languageLabel(request.targetLanguage)}
- Generate ${maxResults} candidate words/short phrases in ${languageLabel(request.targetLanguage)}.
- Candidates should sound similar to the rhyme focus segment when spoken.
- Do not rely only on the very last character of the full input.
- Return target-language candidates only.
- Keep each candidate concise (1 to 2 words), no punctuation.
- Do not include duplicates.
${themeInstruction}

Output JSON schema:
{
  "candidates": ["candidate1", "candidate2", "..."]
}
`.trim();
}

function sanitizeCandidateWord(word: string, targetLanguage: Language): string {
  const trimmed = word.trim();
  if (!trimmed) return "";

  const sanitized =
    targetLanguage === "ko"
      ? trimmed.replace(/[^가-힣\s]/g, "")
      : trimmed.replace(/[^A-Za-z'\s-]/g, "");

  return sanitized.replace(/\s+/g, " ").trim();
}

function extractRawCandidateWords(payload: CandidateJSONResponse): string[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => (typeof item === "string" ? item : item.word ?? ""))
      .filter(Boolean);
  }

  if (payload.candidates && Array.isArray(payload.candidates)) {
    return payload.candidates;
  }
  if (payload.words && Array.isArray(payload.words)) {
    return payload.words;
  }
  if (payload.results && Array.isArray(payload.results)) {
    return payload.results.map((result) => result.word ?? "").filter(Boolean);
  }

  return [];
}

async function fetchCandidateWords(
  request: RhymeRequest,
  anchorText: string,
  maxResults: number,
): Promise<string[]> {
  const prompt = buildRhymePrompt(request, anchorText, maxResults);
  const payload = await generateJSON<CandidateJSONResponse>(prompt);
  const rawWords = extractRawCandidateWords(payload);

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const rawWord of rawWords) {
    const sanitized = sanitizeCandidateWord(rawWord, request.targetLanguage);
    if (!sanitized) continue;
    const key = request.targetLanguage === "ko" ? sanitized : sanitized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(sanitized);
    if (unique.length >= maxResults) break;
  }

  return unique;
}

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function pickRandom<T>(items: T[]): T {
  return items[randomIndex(items.length)] as T;
}

function pickRandomKoreanChunk(token: string): string {
  const chars = Array.from(token).filter((char) => /[가-힣]/u.test(char));
  if (chars.length <= 1) return token;

  const maxChunk = Math.min(3, chars.length);
  const length = 1 + randomIndex(maxChunk);
  const start = randomIndex(chars.length - length + 1);
  return chars.slice(start, start + length).join("");
}

function chooseRhymeAnchor(text: string, language: Language): string {
  if (language === "en") {
    const words = (text.match(/[A-Za-z]+(?:'[A-Za-z]+)*/g) ?? [])
      .map((word) => word.trim())
      .filter(Boolean);

    if (words.length >= 2) return pickRandom(words);
    if (words.length === 1) {
      const syllables = splitEnglishSyllables(words[0]).filter((syllable) => syllable.length > 0);
      if (syllables.length >= 2) return pickRandom(syllables);
      return words[0];
    }

    return text.trim();
  }

  const tokens = (text.match(/[가-힣]+/gu) ?? [])
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length >= 2) return pickRandom(tokens);
  if (tokens.length === 1) return pickRandomKoreanChunk(tokens[0]);

  return text.trim();
}

function toRhymeCandidate(
  sourceText: string,
  sourceLanguage: Language,
  sourcePhonetics: Phonetics,
  targetLanguage: Language,
  candidateWord: string,
): RhymeCandidate {
  const candidatePhonetics = analyzePhoneticsByLanguage(candidateWord, targetLanguage);
  const similarity = calculateRhymeSimilarity(
    sourceText,
    sourceLanguage,
    candidateWord,
    targetLanguage,
  );

  return {
    word: candidateWord,
    language: targetLanguage,
    phonetics: candidatePhonetics,
    similarityScore: similarity.score,
    syllableMatch: sourcePhonetics.syllableCount === candidatePhonetics.syllableCount,
  };
}

export function clearRhymeCache(): void {
  // Rhyme search intentionally avoids caching to keep anchor selection random.
}

export async function findRhymes(request: RhymeRequest): Promise<RhymeResponse> {
  const input = request.input?.trim();
  if (!input) {
    throw toAppError("Input text is required.");
  }

  const normalizedRequest: RhymeRequest = {
    ...request,
    input,
  };

  const maxResults = clampMaxResults(normalizedRequest.maxResults);
  const anchorText = chooseRhymeAnchor(input, normalizedRequest.inputLanguage);
  const inputPhonetics = analyzePhoneticsByLanguage(anchorText, normalizedRequest.inputLanguage);
  const candidateWords = await fetchCandidateWords(normalizedRequest, anchorText, maxResults);
  const candidates = candidateWords
    .map((candidateWord) =>
      toRhymeCandidate(
        anchorText,
        normalizedRequest.inputLanguage,
        inputPhonetics,
        normalizedRequest.targetLanguage,
        candidateWord,
      ))
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, maxResults);

  return {
    inputPhonetics,
    candidates,
  };
}

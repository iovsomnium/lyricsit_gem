import { generateJSON } from "@/lib/gemini/client";
import { analyzeEnglishPhonetics } from "@/lib/phonetics/english-ipa";
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

const RHYME_CACHE = new Map<string, RhymeResponse>();

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

function buildRhymePrompt(request: RhymeRequest, maxResults: number): string {
  const themeInstruction = request.theme
    ? `Theme context: ${request.theme}. Favor words naturally related to this theme.`
    : "Theme context: none.";

  return `
You are a rhyme candidate generator for lyrics writing.
Return only JSON and no extra text.

Task:
- Input text: "${request.input}"
- Input language: ${languageLabel(request.inputLanguage)}
- Target language: ${languageLabel(request.targetLanguage)}
- Generate ${maxResults} candidate words/short phrases in ${languageLabel(request.targetLanguage)}.
- Candidates should sound similar to the input when spoken.
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
  maxResults: number,
): Promise<string[]> {
  const prompt = buildRhymePrompt(request, maxResults);
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

function buildCacheKey(request: RhymeRequest, maxResults: number): string {
  return JSON.stringify({
    input: request.input.trim(),
    inputLanguage: request.inputLanguage,
    targetLanguage: request.targetLanguage,
    theme: request.theme ?? "",
    maxResults,
  });
}

function toRhymeCandidate(
  input: RhymeRequest,
  inputPhonetics: Phonetics,
  candidateWord: string,
): RhymeCandidate {
  const candidatePhonetics = analyzePhoneticsByLanguage(candidateWord, input.targetLanguage);
  const similarity = calculateRhymeSimilarity(
    input.input,
    input.inputLanguage,
    candidateWord,
    input.targetLanguage,
  );

  return {
    word: candidateWord,
    language: input.targetLanguage,
    phonetics: candidatePhonetics,
    similarityScore: similarity.score,
    syllableMatch: inputPhonetics.syllableCount === candidatePhonetics.syllableCount,
  };
}

export function clearRhymeCache(): void {
  RHYME_CACHE.clear();
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
  const cacheKey = buildCacheKey(normalizedRequest, maxResults);
  const cached = RHYME_CACHE.get(cacheKey);
  if (cached) return cached;

  const inputPhonetics = analyzePhoneticsByLanguage(input, normalizedRequest.inputLanguage);
  const candidateWords = await fetchCandidateWords(normalizedRequest, maxResults);
  const candidates = candidateWords
    .map((candidateWord) => toRhymeCandidate(normalizedRequest, inputPhonetics, candidateWord))
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, maxResults);

  const response: RhymeResponse = {
    inputPhonetics,
    candidates,
  };

  RHYME_CACHE.set(cacheKey, response);
  return response;
}


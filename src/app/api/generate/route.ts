import { generateJSON } from "@/lib/gemini/client";
import type {
  ApiErrorResponse,
  AppError,
  Genre,
  Language,
  LyricsGenerateRequest,
  LyricsGenerateResponse,
  LyricsLine,
  Mood,
} from "@/types";
import { NextResponse } from "next/server";

type LyricsJSONResponse = {
  lines?: Array<{
    text?: string;
    language?: Language;
    hasRhyme?: boolean;
  }>;
};

type LineMode = "ko-only" | "en-only" | "mixed";

const VALID_GENRES = new Set<Genre>([
  "kpop",
  "hiphop",
  "rnb",
  "ballad",
  "rock",
  "pop",
  "indie",
  "edm",
]);

const VALID_MOODS = new Set<Mood>([
  "happy",
  "sad",
  "energetic",
  "chill",
  "romantic",
  "angry",
  "nostalgic",
  "hopeful",
]);

function errorResponse(error: AppError, status: number): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error }, { status });
}

function toInvalidInput(message: string): AppError {
  return {
    code: "INVALID_INPUT",
    message,
  };
}

function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

function normalizeLineCount(value?: number): number {
  if (!value) return 4;
  const count = Math.floor(value);
  if (count < 2) return 2;
  if (count > 16) return 16;
  return count;
}

function normalizeGenerateRequest(payload: unknown): Required<LyricsGenerateRequest> {
  if (!payload || typeof payload !== "object") {
    throw toInvalidInput("Request body must be a JSON object.");
  }

  const raw = payload as Partial<LyricsGenerateRequest>;
  const ko = raw.rhymePair?.ko?.trim();
  const en = raw.rhymePair?.en?.trim();

  if (!ko || !en) {
    throw toInvalidInput("`rhymePair.ko` and `rhymePair.en` are required.");
  }

  if (!raw.genre || !VALID_GENRES.has(raw.genre)) {
    throw toInvalidInput("`genre` is invalid.");
  }

  if (!raw.mood || !VALID_MOODS.has(raw.mood)) {
    throw toInvalidInput("`mood` is invalid.");
  }

  return {
    rhymePair: { ko, en },
    genre: raw.genre,
    mood: raw.mood,
    lineCount: normalizeLineCount(raw.lineCount),
  };
}

function containsRhymeWord(text: string, ko: string, en: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes(ko.toLowerCase()) || lower.includes(en.toLowerCase());
}

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function randomLanguage(): Language {
  return Math.random() < 0.5 ? "ko" : "en";
}

function inferLanguageFromText(text: string, fallback: Language): Language {
  const hasKo = /[가-힣]/u.test(text);
  const hasEn = /[A-Za-z]/u.test(text);

  if (hasKo && !hasEn) return "ko";
  if (hasEn && !hasKo) return "en";
  if (!hasKo && !hasEn) return fallback;

  const koCount = (text.match(/[가-힣]/gu) ?? []).length;
  const enCount = (text.match(/[A-Za-z]/g) ?? []).length;
  return koCount >= enCount ? "ko" : "en";
}

function pickLineMode(weights: Record<LineMode, number>): LineMode {
  const roll = Math.random();
  if (roll < weights["ko-only"]) return "ko-only";
  if (roll < weights["ko-only"] + weights["en-only"]) return "en-only";
  return "mixed";
}

function buildRandomLinePlan(lineCount: number): LineMode[] {
  if (lineCount <= 0) return [];

  // Randomize weights each request so language mix ratio is never fixed.
  const wKo = Math.random() + 0.2;
  const wEn = Math.random() + 0.2;
  const wMixed = Math.random() + 0.2;
  const total = wKo + wEn + wMixed;
  const weights: Record<LineMode, number> = {
    "ko-only": wKo / total,
    "en-only": wEn / total,
    mixed: wMixed / total,
  };

  const plan = Array.from({ length: lineCount }, () => pickLineMode(weights));

  const hasKo = plan.some((mode) => mode !== "en-only");
  const hasEn = plan.some((mode) => mode !== "ko-only");
  const hasMixed = plan.some((mode) => mode === "mixed");

  if (!hasKo) plan[randomIndex(plan.length)] = "ko-only";
  if (!hasEn) plan[randomIndex(plan.length)] = "en-only";
  if (lineCount >= 3 && !hasMixed) plan[randomIndex(plan.length)] = "mixed";

  return plan;
}

function lineModeLabel(mode: LineMode): string {
  if (mode === "ko-only") return "Korean-only line";
  if (mode === "en-only") return "English-only line";
  return "Mixed Korean+English line";
}

function buildLinePlanInstructions(plan: LineMode[]): string {
  return plan
    .map((mode, i) => `- Line ${i + 1}: ${lineModeLabel(mode)}`)
    .join("\n");
}

function createFallbackLine(
  mode: LineMode,
  request: Required<LyricsGenerateRequest>,
): LyricsLine {
  if (mode === "ko-only") {
    return {
      text: `${request.rhymePair.ko}를 품은 밤의 멜로디`,
      language: "ko",
      hasRhyme: true,
    };
  }

  if (mode === "en-only") {
    return {
      text: `In the neon haze, ${request.rhymePair.en} keeps echoing`,
      language: "en",
      hasRhyme: true,
    };
  }

  const mixedText = `${request.rhymePair.ko} in my heartbeat, ${request.rhymePair.en} in the night`;
  return {
    text: mixedText,
    language: inferLanguageFromText(mixedText, randomLanguage()),
    hasRhyme: true,
  };
}

function ensureLanguageMix(
  lines: LyricsLine[],
  request: Required<LyricsGenerateRequest>,
): void {
  if (lines.length === 0) return;

  const hasKoOnlyLine = (line: LyricsLine): boolean =>
    /[가-힣]/u.test(line.text) && !/[A-Za-z]/u.test(line.text);
  const hasMixedLine = (line: LyricsLine): boolean =>
    /[가-힣]/u.test(line.text) && /[A-Za-z]/u.test(line.text);

  let mixedIndex = -1;
  if (!lines.some(hasMixedLine)) {
    const i = randomIndex(lines.length);
    const patched = `${request.rhymePair.ko} ${lines[i]?.text ?? ""} ${request.rhymePair.en}`.trim();
    lines[i] = {
      ...(lines[i] as LyricsLine),
      text: patched,
      language: inferLanguageFromText(patched, lines[i]?.language ?? randomLanguage()),
      hasRhyme: true,
    };
    mixedIndex = i;
  }

  if (!lines.some(hasKoOnlyLine)) {
    const i =
      lines.length > 1 && mixedIndex >= 0
        ? (mixedIndex + 1 + randomIndex(lines.length - 1)) % lines.length
        : randomIndex(lines.length);
    lines[i] = {
      ...(lines[i] as LyricsLine),
      text: `${request.rhymePair.ko}를 담은 한 줄`,
      language: "ko",
      hasRhyme: true,
    };
  }
}

function normalizeLyricsLines(
  rawLines: LyricsJSONResponse["lines"],
  request: Required<LyricsGenerateRequest>,
  linePlan: LineMode[],
): LyricsLine[] {
  const normalized = (rawLines ?? [])
    .map((line) => {
      const text = line.text?.trim() ?? "";
      const modelLanguage =
        line.language === "ko" || line.language === "en" ? line.language : randomLanguage();
      return {
        text,
        language: inferLanguageFromText(text, modelLanguage),
        hasRhyme: Boolean(line.hasRhyme),
      };
    })
    .filter((line) => line.text.length > 0);

  const capped = normalized.slice(0, request.lineCount);

  for (const line of capped) {
    if (!line.hasRhyme) {
      line.hasRhyme = containsRhymeWord(line.text, request.rhymePair.ko, request.rhymePair.en);
    }
  }

  while (capped.length < request.lineCount) {
    const mode = linePlan[capped.length] ?? "mixed";
    capped.push(createFallbackLine(mode, request));
  }

  ensureLanguageMix(capped, request);

  return capped;
}

function buildLyricsPrompt(
  request: Required<LyricsGenerateRequest>,
  linePlan: LineMode[],
): string {
  const randomTag = Math.random().toString(36).slice(2, 8);
  const planInstructions = buildLinePlanInstructions(linePlan);

  return `
You are a professional K-pop lyric writer.
Return only JSON. No markdown.

Write ${request.lineCount} lyric lines with code-switching (Korean + English).
Requirements:
- Genre: ${request.genre}
- Mood: ${request.mood}
- Must use rhyme pair:
  - Korean: "${request.rhymePair.ko}"
  - English: "${request.rhymePair.en}"
- Keep lines singable and natural.
- Do not use a fixed language ratio.
- Language balance must feel random and unpredictable each time.
- Follow this random line plan exactly:
${planInstructions}
- At least one line should be mixed Korean+English.
- At least one line should be Korean-only.
- Avoid grouping all Korean lines first and all English lines later.
- Random style tag: ${randomTag}
- For each line, provide:
  - text
  - language ("ko" or "en")
  - hasRhyme (true if that line includes one of the rhyme words)

JSON schema:
{
  "lines": [
    { "text": "line", "language": "ko", "hasRhyme": true }
  ]
}
`.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const generateRequest = normalizeGenerateRequest(body);
    const linePlan = buildRandomLinePlan(generateRequest.lineCount);
    const prompt = buildLyricsPrompt(generateRequest, linePlan);
    const payload = await generateJSON<LyricsJSONResponse>(prompt);

    const response: LyricsGenerateResponse = {
      lines: normalizeLyricsLines(payload.lines, generateRequest, linePlan),
      rhymePair: generateRequest.rhymePair,
      genre: generateRequest.genre,
      mood: generateRequest.mood,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (isAppError(error)) {
      if (error.code === "INVALID_INPUT") return errorResponse(error, 400);
      if (error.code === "RATE_LIMITED") return errorResponse(error, 429);
      return errorResponse(error, 500);
    }

    return errorResponse(
      {
        code: "GEMINI_ERROR",
        message: error instanceof Error ? error.message : "Failed to generate lyrics.",
      },
      500,
    );
  }
}

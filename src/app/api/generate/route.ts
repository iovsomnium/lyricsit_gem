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

function normalizeLyricsLines(
  rawLines: LyricsJSONResponse["lines"],
  request: Required<LyricsGenerateRequest>,
): LyricsLine[] {
  const normalized = (rawLines ?? [])
    .map((line) => ({
      text: line.text?.trim() ?? "",
      language: line.language === "ko" || line.language === "en" ? line.language : "ko",
      hasRhyme: Boolean(line.hasRhyme),
    }))
    .filter((line) => line.text.length > 0);

  const capped = normalized.slice(0, request.lineCount);

  for (const line of capped) {
    if (!line.hasRhyme) {
      line.hasRhyme = containsRhymeWord(line.text, request.rhymePair.ko, request.rhymePair.en);
    }
  }

  while (capped.length < request.lineCount) {
    const fallbackLanguage: Language = capped.length % 2 === 0 ? "ko" : "en";
    const fallbackText =
      fallbackLanguage === "ko"
        ? `${request.rhymePair.ko}를 담아낸 빈 줄`
        : `A placeholder line with ${request.rhymePair.en}`;
    capped.push({
      text: fallbackText,
      language: fallbackLanguage,
      hasRhyme: true,
    });
  }

  return capped;
}

function buildLyricsPrompt(request: Required<LyricsGenerateRequest>): string {
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
- Mix Korean and English lines across the output.
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
    const prompt = buildLyricsPrompt(generateRequest);
    const payload = await generateJSON<LyricsJSONResponse>(prompt);

    const response: LyricsGenerateResponse = {
      lines: normalizeLyricsLines(payload.lines, generateRequest),
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


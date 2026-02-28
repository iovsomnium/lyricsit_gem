import { generateJSON } from "@/lib/gemini/client";
import type {
  ApiErrorResponse,
  AppError,
  SimilarityRequest,
  SimilarityResponse,
  SimilarityResult,
  SimilarityType,
} from "@/types";
import { NextResponse } from "next/server";

type DuckDuckGoTopic = {
  Text?: string;
  FirstURL?: string;
  Topics?: DuckDuckGoTopic[];
};

type DuckDuckGoResponse = {
  AbstractText?: string;
  AbstractURL?: string;
  RelatedTopics?: DuckDuckGoTopic[];
};

type SimilarityJSONResponse = {
  results?: Array<{
    matchedSong?: {
      title?: string;
      artist?: string;
    };
    matchedLine?: string;
    similarityScore?: number;
    similarityType?: SimilarityType | string;
  }>;
};

type WebSnippet = {
  query: string;
  snippet: string;
  url: string;
};

const VALID_SIMILARITY_TYPES = new Set<SimilarityType>([
  "exact",
  "semantic",
  "structural",
]);

function toInvalidInput(message: string): AppError {
  return {
    code: "INVALID_INPUT",
    message,
  };
}

function errorResponse(error: AppError, status: number): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error }, { status });
}

function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

function normalizeSimilarityRequest(payload: unknown): SimilarityRequest {
  if (!payload || typeof payload !== "object") {
    throw toInvalidInput("Request body must be a JSON object.");
  }

  const raw = payload as Partial<SimilarityRequest>;
  const lyrics = raw.lyrics?.trim();
  if (!lyrics) {
    throw toInvalidInput("`lyrics` is required.");
  }

  if (lyrics.length < 10) {
    throw toInvalidInput("`lyrics` is too short for similarity analysis.");
  }

  return { lyrics };
}

function splitLines(lyrics: string): string[] {
  return lyrics
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length >= 4);
}

function extractKeyPhrases(lyrics: string): string[] {
  const lines = splitLines(lyrics);
  const frequency = new Map<string, number>();

  for (const line of lines) {
    const key = line.toLowerCase();
    frequency.set(key, (frequency.get(key) ?? 0) + 1);
  }

  const repeated = [...frequency.entries()]
    .filter(([, count]) => count > 1)
    .sort((left, right) => right[1] - left[1])
    .map(([line]) => line);

  const longest = [...new Set(lines.map((line) => line.toLowerCase()))]
    .sort((left, right) => right.length - left.length)
    .slice(0, 6);

  return [...new Set([...repeated, ...longest])].slice(0, 6);
}

function flattenRelatedTopics(topics: DuckDuckGoTopic[] = []): DuckDuckGoTopic[] {
  const flattened: DuckDuckGoTopic[] = [];

  for (const topic of topics) {
    if (topic.Text) flattened.push(topic);
    if (topic.Topics && topic.Topics.length > 0) {
      flattened.push(...flattenRelatedTopics(topic.Topics));
    }
  }

  return flattened;
}

async function fetchWebSnippetsForPhrase(phrase: string): Promise<WebSnippet[]> {
  const query = `${phrase} lyrics`;
  const endpoint = new URL("https://api.duckduckgo.com/");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("no_html", "1");
  endpoint.searchParams.set("skip_disambig", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return [];
    const payload = (await response.json()) as DuckDuckGoResponse;
    const snippets: WebSnippet[] = [];

    if (payload.AbstractText && payload.AbstractURL) {
      snippets.push({
        query,
        snippet: payload.AbstractText,
        url: payload.AbstractURL,
      });
    }

    const related = flattenRelatedTopics(payload.RelatedTopics).slice(0, 5);
    for (const item of related) {
      if (!item.Text || !item.FirstURL) continue;
      snippets.push({
        query,
        snippet: item.Text,
        url: item.FirstURL,
      });
    }

    return snippets.slice(0, 6);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function collectWebSnippets(phrases: string[]): Promise<WebSnippet[]> {
  const limited = phrases.slice(0, 4);
  const batches = await Promise.all(limited.map((phrase) => fetchWebSnippetsForPhrase(phrase)));
  return batches.flat().slice(0, 12);
}

function buildSimilarityPrompt(
  lyrics: string,
  keyPhrases: string[],
  webSnippets: WebSnippet[],
): string {
  return `
You are a lyrics plagiarism/similarity analyst.
Return only JSON.

Input lyrics:
${lyrics}

Extracted key phrases:
${JSON.stringify(keyPhrases)}

Web search snippets:
${JSON.stringify(webSnippets)}

Task:
- Compare input lyrics against possible existing songs suggested by snippets.
- Identify exact phrase overlaps, semantic similarity, and structural similarity.
- Return only meaningful matches with similarityScore >= 0.45.
- similarityType must be one of: "exact", "semantic", "structural".
- similarityScore must be between 0 and 1.

Output JSON schema:
{
  "results": [
    {
      "matchedSong": { "title": "song title", "artist": "artist name" },
      "matchedLine": "closest matching line or phrase",
      "similarityScore": 0.0,
      "similarityType": "exact"
    }
  ]
}
`.trim();
}

function normalizeSimilarityType(value: unknown): SimilarityType {
  if (typeof value === "string" && VALID_SIMILARITY_TYPES.has(value as SimilarityType)) {
    return value as SimilarityType;
  }
  return "semantic";
}

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return num;
}

function normalizeSimilarityResults(raw: SimilarityJSONResponse["results"]): SimilarityResult[] {
  return (raw ?? [])
    .map((result) => {
      const title = result.matchedSong?.title?.trim() ?? "";
      const artist = result.matchedSong?.artist?.trim() ?? "Unknown";
      const matchedLine = result.matchedLine?.trim() ?? "";
      const similarityScore = clampScore(result.similarityScore);

      if (!title || !matchedLine || similarityScore <= 0) return null;

      return {
        matchedSong: {
          title,
          artist,
        },
        matchedLine,
        similarityScore,
        similarityType: normalizeSimilarityType(result.similarityType),
      } satisfies SimilarityResult;
    })
    .filter((value): value is SimilarityResult => Boolean(value))
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const similarityRequest = normalizeSimilarityRequest(body);

    const keyPhrases = extractKeyPhrases(similarityRequest.lyrics);
    const webSnippets = await collectWebSnippets(keyPhrases);

    const prompt = buildSimilarityPrompt(
      similarityRequest.lyrics,
      keyPhrases,
      webSnippets,
    );
    const payload = await generateJSON<SimilarityJSONResponse>(prompt);

    const response: SimilarityResponse = {
      results: normalizeSimilarityResults(payload.results),
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
        message: error instanceof Error ? error.message : "Failed to check lyrics similarity.",
      },
      500,
    );
  }
}


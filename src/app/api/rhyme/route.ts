import { findRhymes } from "@/lib/rhyme-engine";
import type { ApiErrorResponse, AppError, RhymeRequest, Theme } from "@/types";
import { NextResponse } from "next/server";

const VALID_LANGUAGES = new Set(["ko", "en"]);
const VALID_THEMES = new Set<Theme>([
  "love",
  "farewell",
  "freedom",
  "dream",
  "night",
  "youth",
  "pain",
  "party",
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

function normalizeRhymeRequest(payload: unknown): RhymeRequest {
  if (!payload || typeof payload !== "object") {
    throw toInvalidInput("Request body must be a JSON object.");
  }

  const raw = payload as Partial<RhymeRequest>;
  const input = raw.input?.trim();
  if (!input) {
    throw toInvalidInput("`input` is required.");
  }

  if (!raw.inputLanguage || !VALID_LANGUAGES.has(raw.inputLanguage)) {
    throw toInvalidInput("`inputLanguage` must be either `ko` or `en`.");
  }

  if (!raw.targetLanguage || !VALID_LANGUAGES.has(raw.targetLanguage)) {
    throw toInvalidInput("`targetLanguage` must be either `ko` or `en`.");
  }

  if (raw.inputLanguage === raw.targetLanguage) {
    throw toInvalidInput("`inputLanguage` and `targetLanguage` must be different.");
  }

  if (raw.theme !== undefined && !VALID_THEMES.has(raw.theme)) {
    throw toInvalidInput("`theme` is invalid.");
  }

  if (raw.maxResults !== undefined) {
    const maxResults = Number(raw.maxResults);
    if (!Number.isFinite(maxResults) || maxResults < 1 || maxResults > 30) {
      throw toInvalidInput("`maxResults` must be between 1 and 30.");
    }
  }

  return {
    input,
    inputLanguage: raw.inputLanguage,
    targetLanguage: raw.targetLanguage,
    theme: raw.theme,
    maxResults: raw.maxResults,
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rhymeRequest = normalizeRhymeRequest(body);
    const response = await findRhymes(rhymeRequest);
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
        message: error instanceof Error ? error.message : "Failed to process rhyme request.",
      },
      500,
    );
  }
}


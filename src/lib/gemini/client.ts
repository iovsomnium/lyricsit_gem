import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  type GenerativeModel,
} from "@google/generative-ai";
import type { AppError } from "@/types";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set. Add it to .env.local");
}

const genAI = new GoogleGenerativeAI(apiKey);

function buildModelCandidates(): string[] {
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const candidates = [
    configuredModel,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ];

  return [...new Set(candidates.filter((value): value is string => Boolean(value)))];
}

const MODEL_CANDIDATES = buildModelCandidates();
const modelCache = new Map<string, GenerativeModel>();

function getGenerativeModel(modelName: string): GenerativeModel {
  const cached = modelCache.get(modelName);
  if (cached) return cached;

  const model = genAI.getGenerativeModel({ model: modelName });
  modelCache.set(modelName, model);
  return model;
}

const geminiModel = getGenerativeModel(MODEL_CANDIDATES[0]);

function isModelNotFoundError(error: unknown): error is GoogleGenerativeAIFetchError {
  return error instanceof GoogleGenerativeAIFetchError && error.status === 404;
}

async function runWithModelFallback<T>(
  runner: (model: GenerativeModel) => Promise<T>,
): Promise<T> {
  let sawModelNotFound = false;
  let lastError: unknown = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = getGenerativeModel(modelName);
      return await runner(model);
    } catch (error) {
      if (isModelNotFoundError(error)) {
        sawModelNotFound = true;
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (sawModelNotFound) {
    throw createAppError(
      "GEMINI_ERROR",
      `No available Gemini model from fallback list: ${MODEL_CANDIDATES.join(", ")}`,
      lastError instanceof Error ? lastError.message : undefined,
    );
  }

  throw lastError;
}

/**
 * Generate a free-text response from Gemini.
 */
async function generateText(prompt: string): Promise<string> {
  try {
    const result = await runWithModelFallback((model) => model.generateContent(prompt));
    return result.response.text();
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Generate a JSON response from Gemini.
 * Uses responseMimeType: "application/json" for structured output.
 */
async function generateJSON<T>(prompt: string): Promise<T> {
  try {
    const result = await runWithModelFallback((model) =>
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    );
    const text = result.response.text();
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createAppError("GEMINI_ERROR", "Failed to parse Gemini JSON response");
    }
    throw toAppError(error);
  }
}

function toAppError(error: unknown): AppError {
  if (error instanceof GoogleGenerativeAIFetchError) {
    if (error.status === 429) {
      return createAppError("RATE_LIMITED", "API rate limit exceeded. Please try again later.");
    }
    if (error.status === 404) {
      return createAppError(
        "GEMINI_ERROR",
        "Gemini model not found/unavailable. Try setting GEMINI_MODEL=gemini-2.5-flash",
        error.message,
      );
    }
    return createAppError(
      "GEMINI_ERROR",
      `Gemini API error: ${error.statusText ?? error.message}`,
    );
  }
  if (isAppError(error)) return error;
  return createAppError(
    "GEMINI_ERROR",
    error instanceof Error ? error.message : "Unknown Gemini error",
  );
}

function createAppError(
  code: AppError["code"],
  message: string,
  details?: string,
): AppError {
  return { code, message, details };
}

function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}

export { genAI, geminiModel, generateText, generateJSON };

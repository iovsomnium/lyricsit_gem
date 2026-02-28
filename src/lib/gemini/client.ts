import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import type { AppError } from "@/types";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set. Add it to .env.local");
}

const genAI = new GoogleGenerativeAI(apiKey);

const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

/**
 * Generate a free-text response from Gemini.
 */
async function generateText(prompt: string): Promise<string> {
  try {
    const result = await geminiModel.generateContent(prompt);
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
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
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

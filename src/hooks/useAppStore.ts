import { create } from "zustand";
import type {
  Language,
  Genre,
  Mood,
  Theme,
  RhymeRequest,
  RhymeResponse,
  RhymeCandidate,
  LyricsGenerateRequest,
  LyricsGenerateResponse,
  RhymePair,
  LyricsLine,
  SimilarityRequest,
  SimilarityResponse,
  SimilarityResult,
  AppError,
  Phonetics,
} from "@/types";

// ============================================================
// State
// ============================================================

interface AppState {
  // 입력 상태
  inputText: string;
  inputLanguage: Language;
  targetLanguage: Language;

  // 옵션 상태
  theme: Theme | null;
  genre: Genre;
  mood: Mood;

  // 데이터 상태
  inputPhonetics: Phonetics | null;
  rhymeResults: RhymeCandidate[];
  selectedRhymes: RhymePair[];
  generatedLyrics: LyricsLine[];
  lyricsDraftText: string;
  similarityResults: SimilarityResult[];

  // UI 상태
  isSearching: boolean;
  isGenerating: boolean;
  isCheckingSimilarity: boolean;
  error: AppError | null;
}

// ============================================================
// Actions
// ============================================================

interface AppActions {
  // 입력 액션
  setInputText: (text: string) => void;
  setInputLanguage: (lang: Language) => void;
  setTargetLanguage: (lang: Language) => void;
  setTheme: (theme: Theme | null) => void;
  setGenre: (genre: Genre) => void;
  setMood: (mood: Mood) => void;

  // 선택 액션
  selectRhyme: (pair: RhymePair) => void;
  deselectRhyme: (pair: RhymePair) => void;
  clearSelectedRhymes: () => void;

  // 데이터 초기화
  clearRhymeResults: () => void;
  clearGeneratedLyrics: () => void;
  setLyricsDraftText: (text: string) => void;
  clearSimilarityResults: () => void;
  clearError: () => void;
  resetAll: () => void;

  // API 연동 액션 (5-B)
  searchRhymes: () => Promise<void>;
  generateLyrics: (options?: {
    rhymePair?: RhymePair;
    lineCount?: number;
  }) => Promise<void>;
  checkSimilarity: (lyricsText?: string) => Promise<void>;
}

// ============================================================
// Initial State
// ============================================================

const initialState: AppState = {
  inputText: "",
  inputLanguage: "ko",
  targetLanguage: "en",
  theme: null,
  genre: "kpop",
  mood: "chill",
  inputPhonetics: null,
  rhymeResults: [],
  selectedRhymes: [],
  generatedLyrics: [],
  lyricsDraftText: "",
  similarityResults: [],
  isSearching: false,
  isGenerating: false,
  isCheckingSimilarity: false,
  error: null,
};

const RHYME_CACHE = new Map<string, RhymeResponse>();
const RHYME_INFLIGHT = new Map<string, Promise<RhymeResponse>>();
const LYRICS_CACHE = new Map<string, LyricsGenerateResponse>();
const LYRICS_INFLIGHT = new Map<string, Promise<LyricsGenerateResponse>>();
const SIMILARITY_CACHE = new Map<string, SimilarityResponse>();
const SIMILARITY_INFLIGHT = new Map<string, Promise<SimilarityResponse>>();

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRY_COUNT = 1;
const RETRY_DELAY_MS = 350;
const RHYME_TIMEOUT_MS = 30_000;
const GENERATE_TIMEOUT_MS = 40_000;
const SIMILARITY_TIMEOUT_MS = 45_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAppError(value: unknown): value is AppError {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

function getErrorFromPayload(payload: unknown): AppError | null {
  if (!isRecord(payload) || !("error" in payload)) return null;
  const nested = (payload as Record<string, unknown>).error;
  return isAppError(nested) ? nested : null;
}

function toUnknownError(message: string): AppError {
  return {
    code: "NETWORK_ERROR",
    message,
  };
}

function mapHttpStatusToError(status: number, fallbackMessage: string): AppError {
  if (status === 429) {
    return { code: "RATE_LIMITED", message: fallbackMessage || "Too many requests. Try again." };
  }
  if (status >= 400 && status < 500) {
    return { code: "INVALID_INPUT", message: fallbackMessage || "Invalid request payload." };
  }
  return { code: "NETWORK_ERROR", message: fallbackMessage || "Request failed." };
}

async function parseErrorResponse(response: Response): Promise<AppError> {
  try {
    const payload = (await response.json()) as unknown;
    const appError = getErrorFromPayload(payload);
    if (appError) return appError;
  } catch {
    // ignore parsing failure and fallback to status-based error
  }

  return mapHttpStatusToError(response.status, response.statusText);
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJSONWithRetry<T>(
  url: string,
  payload: unknown,
  options?: { retries?: number; timeoutMs?: number },
): Promise<T> {
  const retries = options?.retries ?? DEFAULT_RETRY_COUNT;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastError: AppError | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        timeoutMs,
      );

      if (!response.ok) {
        const error = await parseErrorResponse(response);
        const canRetry = response.status >= 500 && attempt < retries;
        if (canRetry) {
          lastError = error;
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw error;
      }

      return (await response.json()) as T;
    } catch (error) {
      const appError: AppError =
        isAppError(error)
          ? error
          : error instanceof DOMException && error.name === "AbortError"
            ? toUnknownError("요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.")
            : toUnknownError(error instanceof Error ? error.message : "Network request failed.");

      const canRetry = appError.code === "NETWORK_ERROR" && attempt < retries;
      if (canRetry) {
        lastError = appError;
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw appError;
    }
  }

  throw (
    lastError ?? {
      code: "NETWORK_ERROR",
      message: "Request failed after retry.",
    }
  );
}

async function getCachedOrFetch<T>(
  key: string,
  cache: Map<string, T>,
  inflight: Map<string, Promise<T>>,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const next = fetcher()
    .then((result) => {
      cache.set(key, result);
      inflight.delete(key);
      return result;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, next);
  return next;
}

// ============================================================
// Store
// ============================================================

export const useAppStore = create<AppState & AppActions>()((set, get) => ({
  ...initialState,

  // 입력 액션
  setInputText: (text) => set({ inputText: text }),
  setInputLanguage: (lang) =>
    set((state) => ({
      inputLanguage: lang,
      targetLanguage:
        state.targetLanguage === lang
          ? lang === "ko"
            ? "en"
            : "ko"
          : state.targetLanguage,
    })),
  setTargetLanguage: (lang) =>
    set((state) => ({
      targetLanguage: lang,
      inputLanguage:
        state.inputLanguage === lang
          ? lang === "ko"
            ? "en"
            : "ko"
          : state.inputLanguage,
    })),
  setTheme: (theme) => set({ theme }),
  setGenre: (genre) => set({ genre }),
  setMood: (mood) => set({ mood }),

  // 선택 액션
  selectRhyme: (pair) =>
    set((state) => {
      const exists = state.selectedRhymes.some(
        (r) => r.ko === pair.ko && r.en === pair.en
      );
      if (exists) return state;
      return { selectedRhymes: [...state.selectedRhymes, pair] };
    }),

  deselectRhyme: (pair) =>
    set((state) => ({
      selectedRhymes: state.selectedRhymes.filter(
        (r) => !(r.ko === pair.ko && r.en === pair.en)
      ),
    })),

  clearSelectedRhymes: () => set({ selectedRhymes: [] }),

  // 데이터 초기화
  clearRhymeResults: () =>
    set({
      inputPhonetics: null,
      rhymeResults: [],
      selectedRhymes: [],
    }),
  clearGeneratedLyrics: () => set({ generatedLyrics: [], lyricsDraftText: "" }),
  setLyricsDraftText: (text) => set({ lyricsDraftText: text }),
  clearSimilarityResults: () => set({ similarityResults: [] }),
  clearError: () => set({ error: null }),
  resetAll: () => {
    RHYME_CACHE.clear();
    RHYME_INFLIGHT.clear();
    LYRICS_CACHE.clear();
    LYRICS_INFLIGHT.clear();
    SIMILARITY_CACHE.clear();
    SIMILARITY_INFLIGHT.clear();
    set(initialState);
  },

  // ============================================================
  // API 액션
  // ============================================================
  searchRhymes: async () => {
    const state = get();
    const input = state.inputText.trim();

    if (!input) {
      set({
        error: { code: "INVALID_INPUT", message: "검색할 텍스트를 입력해주세요." },
      });
      return;
    }

    const payload: RhymeRequest = {
      input,
      inputLanguage: state.inputLanguage,
      targetLanguage: state.targetLanguage,
      maxResults: 10,
      ...(state.theme ? { theme: state.theme } : {}),
    };

    const cacheKey = JSON.stringify(payload);

    set({
      isSearching: true,
      error: null,
    });

    try {
      const response = await getCachedOrFetch(
        cacheKey,
        RHYME_CACHE,
        RHYME_INFLIGHT,
        () =>
          fetchJSONWithRetry<RhymeResponse>("/api/rhyme", payload, {
            timeoutMs: RHYME_TIMEOUT_MS,
          }),
      );

      set({
        inputPhonetics: response.inputPhonetics,
        rhymeResults: response.candidates,
        selectedRhymes: [],
      });
    } catch (error) {
      set({
        error: isAppError(error)
          ? error
          : toUnknownError("라임 검색 중 오류가 발생했습니다."),
      });
    } finally {
      set({ isSearching: false });
    }
  },

  generateLyrics: async (options) => {
    const state = get();
    const pair = options?.rhymePair ?? state.selectedRhymes[0];

    if (!pair) {
      set({
        error: {
          code: "INVALID_INPUT",
          message: "가사 생성을 위해 라임 페어를 먼저 선택해주세요.",
        },
      });
      return;
    }

    const payload: LyricsGenerateRequest = {
      rhymePair: pair,
      genre: state.genre,
      mood: state.mood,
      lineCount: options?.lineCount ?? 4,
    };
    const cacheKey = JSON.stringify(payload);

    set({
      isGenerating: true,
      error: null,
    });

    try {
      const response = await getCachedOrFetch(
        cacheKey,
        LYRICS_CACHE,
        LYRICS_INFLIGHT,
        () =>
          fetchJSONWithRetry<LyricsGenerateResponse>("/api/generate", payload, {
            timeoutMs: GENERATE_TIMEOUT_MS,
          }),
      );

      set({
        generatedLyrics: response.lines,
        lyricsDraftText: "",
        similarityResults: [],
      });
    } catch (error) {
      set({
        error: isAppError(error)
          ? error
          : toUnknownError("가사 생성 중 오류가 발생했습니다."),
      });
    } finally {
      set({ isGenerating: false });
    }
  },

  checkSimilarity: async (lyricsText) => {
    const state = get();
    const lyrics =
      lyricsText?.trim() ||
      state.lyricsDraftText.trim() ||
      state.generatedLyrics
        .map((line) => line.text.trim())
        .filter(Boolean)
        .join("\n")
        .trim();

    if (!lyrics) {
      set({
        error: {
          code: "INVALID_INPUT",
          message: "유사도 검사를 위해 가사를 먼저 준비해주세요.",
        },
      });
      return;
    }

    const payload: SimilarityRequest = {
      lyrics,
    };
    const cacheKey = JSON.stringify(payload);

    set({
      isCheckingSimilarity: true,
      error: null,
    });

    try {
      const response = await getCachedOrFetch(
        cacheKey,
        SIMILARITY_CACHE,
        SIMILARITY_INFLIGHT,
        () =>
          fetchJSONWithRetry<SimilarityResponse>("/api/similarity", payload, {
            retries: 1,
            timeoutMs: SIMILARITY_TIMEOUT_MS,
          }),
      );

      set({
        similarityResults: response.results,
      });
    } catch (error) {
      set({
        error: isAppError(error)
          ? error
          : toUnknownError("유사도 검사 중 오류가 발생했습니다."),
      });
    } finally {
      set({ isCheckingSimilarity: false });
    }
  },
}));

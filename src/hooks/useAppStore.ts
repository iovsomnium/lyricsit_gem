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
  SavedLyricsMemo,
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

  // 메모 상태
  savedMemos: SavedLyricsMemo[];

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

  // 메모 액션
  loadMemosFromStorage: () => void;
  saveMemo: (memo: Omit<SavedLyricsMemo, "id" | "createdAt" | "updatedAt">) => void;
  deleteMemo: (id: string) => void;
  clearAllMemos: () => void;
  checkMemoSimilarity: (id: string) => Promise<void>;

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
  savedMemos: [],
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

// ============================================================
// localStorage Utilities
// ============================================================

const STORAGE_KEY = "crossrhyme:saved-lyrics";
const MAX_MEMOS = 50;
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

function loadMemosFromLocalStorage(): SavedLyricsMemo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn("Invalid memos data in localStorage, resetting");
      return [];
    }

    return parsed as SavedLyricsMemo[];
  } catch (error) {
    console.error("Failed to load memos from localStorage:", error);
    // Backup corrupted data
    try {
      const corrupted = localStorage.getItem(STORAGE_KEY);
      if (corrupted) {
        localStorage.setItem(`${STORAGE_KEY}-backup-${Date.now()}`, corrupted);
      }
    } catch {
      // Ignore backup failure
    }
    return [];
  }
}

function saveMemosToLocalStorage(memos: SavedLyricsMemo[]): AppError | null {
  try {
    const serialized = JSON.stringify(memos);

    // Check size limit
    if (serialized.length > MAX_STORAGE_SIZE) {
      return {
        code: "INVALID_INPUT",
        message: "Storage limit exceeded. Delete some saved memos and try again.",
      };
    }

    localStorage.setItem(STORAGE_KEY, serialized);
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === "QuotaExceededError") {
      return {
        code: "INVALID_INPUT",
        message: "Not enough storage space. Delete some saved memos and try again.",
      };
    }
    return {
      code: "NETWORK_ERROR",
      message: "An error occurred while saving your memo.",
    };
  }
}

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
            ? toUnknownError("The request timed out. Please try again in a moment.")
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
        error: { code: "INVALID_INPUT", message: "Enter text before searching for rhymes." },
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

    set({
      isSearching: true,
      error: null,
    });

    try {
      const response = await fetchJSONWithRetry<RhymeResponse>(
        "/api/rhyme",
        payload,
        {
          timeoutMs: RHYME_TIMEOUT_MS,
        },
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
          : toUnknownError("An error occurred while searching rhymes."),
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
          message: "Select a rhyme pair before generating lyrics.",
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

    set({
      isGenerating: true,
      error: null,
    });

    try {
      const response = await fetchJSONWithRetry<LyricsGenerateResponse>(
        "/api/generate",
        payload,
        {
          timeoutMs: GENERATE_TIMEOUT_MS,
        },
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
          : toUnknownError("An error occurred while generating lyrics."),
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
          message: "Prepare lyrics before running the similarity check.",
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
          : toUnknownError("An error occurred while running similarity check."),
      });
    } finally {
      set({ isCheckingSimilarity: false });
    }
  },

  // ============================================================
  // 메모 액션
  // ============================================================

  loadMemosFromStorage: () => {
    const memos = loadMemosFromLocalStorage();
    set({ savedMemos: memos });
  },

  saveMemo: (memo) => {
    const state = get();

    // 빈 가사 체크
    if (!memo.content.trim()) {
      set({
        error: {
          code: "INVALID_INPUT",
          message: "No lyrics to save.",
        },
      });
      return;
    }

    // 최대 개수 체크
    if (state.savedMemos.length >= MAX_MEMOS) {
      set({
        error: {
          code: "INVALID_INPUT",
          message: `You can save up to ${MAX_MEMOS} memos.`,
        },
      });
      return;
    }

    const now = Date.now();
    const newMemo: SavedLyricsMemo = {
      ...memo,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const updatedMemos = [newMemo, ...state.savedMemos];

    // localStorage에 저장
    const saveError = saveMemosToLocalStorage(updatedMemos);
    if (saveError) {
      set({ error: saveError });
      return;
    }

    set({
      savedMemos: updatedMemos,
      error: null,
    });
  },

  deleteMemo: (id) => {
    const state = get();
    const updatedMemos = state.savedMemos.filter((memo) => memo.id !== id);

    const saveError = saveMemosToLocalStorage(updatedMemos);
    if (saveError) {
      set({ error: saveError });
      return;
    }

    set({ savedMemos: updatedMemos });
  },

  clearAllMemos: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ savedMemos: [] });
  },

  checkMemoSimilarity: async (id) => {
    const state = get();
    const memo = state.savedMemos.find((m) => m.id === id);

    if (!memo) {
      set({
        error: {
          code: "INVALID_INPUT",
          message: "Memo not found.",
        },
      });
      return;
    }

    const payload: SimilarityRequest = {
      lyrics: memo.content,
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

      // 메모 업데이트
      const updatedMemos = state.savedMemos.map((m) =>
        m.id === id
          ? {
              ...m,
              metadata: {
                ...m.metadata,
                hasBeenChecked: true,
                lastCheckResults: response.results,
              },
              updatedAt: Date.now(),
            }
          : m
      );

      const saveError = saveMemosToLocalStorage(updatedMemos);
      if (saveError) {
        set({ error: saveError });
        return;
      }

      set({
        savedMemos: updatedMemos,
      });
    } catch (error) {
      set({
        error: isAppError(error)
          ? error
          : toUnknownError("An error occurred while running similarity check."),
      });
    } finally {
      set({ isCheckingSimilarity: false });
    }
  },
}));

// 초기화 시 localStorage에서 메모 로드
if (typeof window !== "undefined") {
  useAppStore.getState().loadMemosFromStorage();
}

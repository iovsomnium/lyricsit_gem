import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "./useAppStore";
import type { LyricsGenerateResponse, RhymeResponse, SimilarityResponse } from "@/types";

function jsonResponse<T>(payload: T): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload,
  } as Response;
}

describe("useAppStore API actions", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useAppStore.getState().resetAll();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAppStore.getState().resetAll();
  });

  it("searchRhymes stores input phonetics and candidates", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse<RhymeResponse>({
        inputPhonetics: {
          original: "사랑",
          romanized: "sa-rang",
          ipa: "sa ɾaŋ",
          syllables: ["sa", "rang"],
          syllableCount: 2,
        },
        candidates: [
          {
            word: "song",
            language: "en",
            phonetics: {
              original: "song",
              romanized: "song",
              ipa: "sɔŋ",
              syllables: ["song"],
              syllableCount: 1,
            },
            similarityScore: 0.83,
            syllableMatch: false,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const store = useAppStore.getState();
    store.setInputText("사랑");
    store.setInputLanguage("ko");
    store.setTargetLanguage("en");

    await useAppStore.getState().searchRhymes();

    const next = useAppStore.getState();
    expect(next.inputPhonetics?.ipa).toBe("sa ɾaŋ");
    expect(next.rhymeResults).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rhyme",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("generateLyrics resets draft and similarity results", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse<LyricsGenerateResponse>({
        lines: [
          { text: "사랑은 밤을 타고", language: "ko", hasRhyme: true },
          { text: "A song that won't let go", language: "en", hasRhyme: true },
        ],
        rhymePair: { ko: "사랑", en: "song" },
        genre: "kpop",
        mood: "chill",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    useAppStore.setState({
      selectedRhymes: [{ ko: "사랑", en: "song" }],
      lyricsDraftText: "old draft",
      similarityResults: [
        {
          matchedSong: { title: "Old", artist: "Ref" },
          matchedLine: "old line",
          similarityScore: 0.72,
          similarityType: "semantic",
        },
      ],
    });

    await useAppStore.getState().generateLyrics();

    const next = useAppStore.getState();
    expect(next.generatedLyrics).toHaveLength(2);
    expect(next.similarityResults).toEqual([]);
    expect(next.lyricsDraftText).toBe("");
  });

  it("checkSimilarity prefers edited draft text over generated lyrics", async () => {
    let postedLyrics = "";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { lyrics?: string };
      postedLyrics = body.lyrics ?? "";

      return jsonResponse<SimilarityResponse>({
        results: [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    useAppStore.setState({
      generatedLyrics: [
        { text: "generated line one", language: "en", hasRhyme: true },
        { text: "generated line two", language: "en", hasRhyme: true },
      ],
      lyricsDraftText: "edited first line\nedited second line",
    });

    await useAppStore.getState().checkSimilarity();

    expect(postedLyrics).toBe("edited first line\nedited second line");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/similarity",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

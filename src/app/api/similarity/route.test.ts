import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SimilarityResponse } from "@/types";

const generateJSONMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/gemini/client", () => ({
  generateJSON: generateJSONMock,
}));

import { POST } from "./route";

function createJsonResponse<T>(payload: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "ERROR",
    json: async () => payload,
  } as Response;
}

function createRequest(payload: unknown): Request {
  return new Request("http://localhost/api/similarity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/similarity", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 for short lyrics input", async () => {
    const response = await POST(createRequest({ lyrics: "too short" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("normalizes and sorts similarity results with deterministic mocks", async () => {
    const fetchMock = vi.fn(async () =>
      createJsonResponse({
        AbstractText: "Reference song snippet",
        AbstractURL: "https://example.com/song-a",
        RelatedTopics: [{ Text: "Another lyric context", FirstURL: "https://example.com/song-b" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    generateJSONMock.mockResolvedValue({
      results: [
        {
          matchedSong: { title: " Song B ", artist: " Artist B " },
          matchedLine: "we dance all night",
          similarityScore: 0.62,
          similarityType: "unknown",
        },
        {
          matchedSong: { title: " Song A ", artist: " Artist A " },
          matchedLine: "love in the moonlight",
          similarityScore: 1.25,
          similarityType: "exact",
        },
        {
          matchedSong: { title: "", artist: "Nobody" },
          matchedLine: "invalid row",
          similarityScore: 0.9,
          similarityType: "semantic",
        },
      ],
    });

    const response = await POST(
      createRequest({
        lyrics: "Love in the moonlight\nWe dance all night\nLove in the moonlight",
      }),
    );
    const body = (await response.json()) as SimilarityResponse;

    expect(response.status).toBe(200);
    expect(body.results).toEqual([
      {
        matchedSong: { title: "Song A", artist: "Artist A" },
        matchedLine: "love in the moonlight",
        similarityScore: 1,
        similarityType: "exact",
      },
      {
        matchedSong: { title: "Song B", artist: "Artist B" },
        matchedLine: "we dance all night",
        similarityScore: 0.62,
        similarityType: "semantic",
      },
    ]);

    expect(generateJSONMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalled();

    const firstFetchArg = fetchMock.mock.calls[0]?.[0];
    expect(String(firstFetchArg)).toContain("api.duckduckgo.com");
  });

  it("continues with empty web snippets when search fetch fails", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);

    generateJSONMock.mockResolvedValue({ results: [] });

    const response = await POST(
      createRequest({
        lyrics: "Echoes on the rooftop\nEchoes on the rooftop\nNight keeps calling",
      }),
    );
    const body = (await response.json()) as SimilarityResponse;

    expect(response.status).toBe(200);
    expect(body.results).toEqual([]);
    expect(generateJSONMock).toHaveBeenCalledTimes(1);
    expect(String(generateJSONMock.mock.calls[0]?.[0])).toContain("Web search snippets:");
  });

  it("returns 429 when Gemini is rate-limited", async () => {
    const fetchMock = vi.fn(async () => createJsonResponse({ RelatedTopics: [] }));
    vi.stubGlobal("fetch", fetchMock);

    generateJSONMock.mockRejectedValue({
      code: "RATE_LIMITED",
      message: "Too many requests",
    });

    const response = await POST(
      createRequest({
        lyrics: "Keep it alive tonight\nKeep it alive tonight\nWe run till sunrise",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});

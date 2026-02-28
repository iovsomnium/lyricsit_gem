import { describe, expect, it } from "vitest";
import {
  calculateRhymeSimilarity,
  extractIPASyllableParts,
} from "./similarity";

describe("extractIPASyllableParts", () => {
  it("extracts Korean IPA syllable parts", () => {
    const parts = extractIPASyllableParts("사랑", "ko");
    expect(parts.length).toBe(2);
    expect(parts[1]?.tail).toBe("aŋ");
  });

  it("extracts English IPA syllable parts", () => {
    const parts = extractIPASyllableParts("free", "en");
    expect(parts.length).toBeGreaterThan(0);
    expect(parts[parts.length - 1]?.tail).toBe("i");
  });
});

describe("calculateRhymeSimilarity", () => {
  it("uses score = tail*0.7 + full*0.3", () => {
    const result = calculateRhymeSimilarity("사랑", "ko", "song", "en");
    expect(result.score).toBeCloseTo(result.tailSimilarity * 0.7 + result.fullSimilarity * 0.3);
  });

  it("gives higher score to closer rhyme candidates", () => {
    const close = calculateRhymeSimilarity("사랑", "ko", "song", "en");
    const far = calculateRhymeSimilarity("사랑", "ko", "free", "en");
    expect(close.score).toBeGreaterThan(far.score);
  });

  it("returns normalized score range 0..1", () => {
    const result = calculateRhymeSimilarity("사랑해", "ko", "be free", "en");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.tailSimilarity).toBeGreaterThanOrEqual(0);
    expect(result.tailSimilarity).toBeLessThanOrEqual(1);
    expect(result.fullSimilarity).toBeGreaterThanOrEqual(0);
    expect(result.fullSimilarity).toBeLessThanOrEqual(1);
  });
});


/**
 * Target-size optimizer tests — full convergence behavior against fake encoders.
 */
import { describe, it, expect } from 'vitest';
import { searchBestQualityUnder, optimizeToTarget, DEFAULT_SCALES, type QualitySearchResult } from '../src/engine/target-size';
import { EngineError } from '../src/engine/errors';

interface FakeBlob { size: number }

/** Strictly decreasing size as quality rises (typical codec behavior). */
function fakeEncoder(base: number) {
  const calls: number[] = [];
  const encode = async (q: number): Promise<FakeBlob> => {
    calls.push(q);
    const size = Math.round(base * Math.pow(q, 1.2)) + 100;
    return { size };
  };
  return { encode, calls };
}

describe('searchBestQualityUnder', () => {
  it('solves generous targets in one pass at ceiling quality', async () => {
    const { encode, calls } = fakeEncoder(10_000);
    const result = await searchBestQualityUnder(encode, 50_000);
    expect(result.hitTarget).toBe(true);
    expect(result.quality).toBe(0.95);
    expect(result.attempts).toBe(1);
    expect(calls).toHaveLength(1);
  });

  it('converges to the best quality under a mid-range target', async () => {
    const base = 100_000;
    const target = 50_000;
    const { encode } = fakeEncoder(base);
    const result = await searchBestQualityUnder(encode, target);
    expect(result.hitTarget).toBe(true);
    expect(result.blob.size).toBeLessThanOrEqual(target);
    // Result should sit close to (and just under) the target, not far below it.
    expect(target - result.blob.size).toBeLessThanOrEqual(Math.max(target * 0.02, 1024) + 1500);
    expect(result.quality).toBeGreaterThan(0.05);
    expect(result.quality).toBeLessThan(0.95);
    expect(result.attempts).toBeLessThanOrEqual(14);
    // Monotonic sanity: the returned blob matches the returned quality's size.
    const expected = Math.round(base * Math.pow(result.quality, 1.2)) + 100;
    expect(Math.abs(result.blob.size - expected)).toBeLessThanOrEqual(1);
  });

  it('reports the honest floor when the target is unreachable', async () => {
    const { encode } = fakeEncoder(100_000);
    const result = await searchBestQualityUnder(encode, 1_000);
    expect(result.hitTarget).toBe(false);
    expect(result.quality).toBe(0.05);
    expect(result.floorBytes).toBe(result.blob.size);
    expect(result.floorBytes).toBeGreaterThan(1_000);
  });

  it('respects the attempt cap', async () => {
    const { encode } = fakeEncoder(100_000);
    const result = await searchBestQualityUnder(encode, 50_000, {
      maxAttempts: 6,
      toleranceRatio: 0,
      toleranceBytes: 0,
    });
    expect(result.attempts).toBeLessThanOrEqual(6);
  });

  it('validates the target input', async () => {
    const { encode } = fakeEncoder(10_000);
    await expect(searchBestQualityUnder(encode, 0)).rejects.toBeInstanceOf(EngineError);
    await expect(searchBestQualityUnder(encode, Number.NaN)).rejects.toBeInstanceOf(EngineError);
  });
});

function ok(_scale: number, size: number): QualitySearchResult<FakeBlob> {
  return { blob: { size }, quality: 0.7, attempts: 3, hitTarget: true, floorBytes: size };
}
function fail(size: number): QualitySearchResult<FakeBlob> {
  return { blob: { size }, quality: 0.05, attempts: 2, hitTarget: false, floorBytes: size };
}

describe('optimizeToTarget (dimension ladder)', () => {
  it('never reduces dimensions unless explicitly allowed', async () => {
    const triedScales: number[] = [];
    const result = await optimizeToTarget({
      targetBytes: 50_000,
      allowDimensionReduction: false,
      searchAtScale: async (scale) => {
        triedScales.push(scale);
        return fail(80_000);
      },
    });
    expect(triedScales).toEqual([1]);
    expect(result.hitTarget).toBe(false);
  });

  it('walks down the ladder until a scale succeeds', async () => {
    const triedScales: number[] = [];
    const result = await optimizeToTarget({
      targetBytes: 50_000,
      allowDimensionReduction: true,
      searchAtScale: async (scale) => {
        triedScales.push(scale);
        return scale <= 0.8 ? ok(scale, 40_000) : fail(80_000);
      },
    });
    expect(triedScales).toEqual([1, 0.9, 0.8]);
    expect(result.hitTarget).toBe(true);
    if (result.hitTarget) {
      expect(result.scale).toBe(0.8);
      expect(result.attemptsTotal).toBeGreaterThan(0);
    }
  });

  it('uses the full default ladder and reports the smallest floor', async () => {
    const result = await optimizeToTarget({
      targetBytes: 10_000,
      allowDimensionReduction: true,
      searchAtScale: async (scale) => fail(Math.round(100_000 * scale)),
    });
    expect(result.hitTarget).toBe(false);
    if (!result.hitTarget) {
      expect(result.floorScale).toBe(DEFAULT_SCALES[DEFAULT_SCALES.length - 1]);
      expect(result.floorBytes).toBe(Math.round(100_000 * 0.3));
    }
  });
});

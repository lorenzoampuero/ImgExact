/**
 * Target file size optimization — bounded quality search + optional dimension ladder.
 *
 * Design constraints:
 * - Never claim mathematical exactness: the contract is "≤ target, best quality that fits".
 * - Never reduce dimensions without explicit consent (`allowDimensionReduction`).
 * - Deterministic and dependency-injected, so the full convergence behavior is unit-tested
 *   with fake encoders (no browser required).
 */

import { EngineError } from './errors';

export interface SizedBlob {
  size: number;
}

export interface QualitySearchOptions {
  /** Lowest quality attempted (encoding floor). */
  minQuality?: number;
  /** Highest quality attempted (encoding ceiling). */
  maxQuality?: number;
  /** Hard cap on encode passes. */
  maxAttempts?: number;
  /** Stop early when the result is this close to the target (relative). */
  toleranceRatio?: number;
  /** Stop early when the result is this close to the target (absolute bytes). */
  toleranceBytes?: number;
}

export interface QualitySearchResult<T extends SizedBlob> {
  blob: T;
  quality: number;
  attempts: number;
  hitTarget: boolean;
  /** Smallest size observed at minQuality — the honest floor when the target is unreachable. */
  floorBytes: number;
}

/**
 * Finds the highest quality whose encoded size is ≤ targetBytes.
 * Returns `hitTarget: false` (with the floor size) when even minQuality overshoots.
 */
export async function searchBestQualityUnder<T extends SizedBlob>(
  encode: (quality: number) => Promise<T>,
  targetBytes: number,
  opts?: QualitySearchOptions,
): Promise<QualitySearchResult<T>> {
  if (!Number.isFinite(targetBytes) || targetBytes <= 0) {
    throw new EngineError('INVALID_INPUT', 'Target size must be a positive number of bytes');
  }
  const minQuality = opts?.minQuality ?? 0.05;
  const maxQuality = opts?.maxQuality ?? 0.95;
  const maxAttempts = opts?.maxAttempts ?? 14;
  const toleranceRatio = opts?.toleranceRatio ?? 0.02;
  const toleranceBytes = opts?.toleranceBytes ?? 1024;
  const tolerance = Math.max(targetBytes * toleranceRatio, toleranceBytes);

  let attempts = 0;
  const tryEncode = async (q: number): Promise<T> => {
    attempts++;
    return encode(q);
  };

  // Ceiling first — a generous target is solved in one pass.
  const ceiling = await tryEncode(maxQuality);
  if (ceiling.size <= targetBytes) {
    return { blob: ceiling, quality: maxQuality, attempts, hitTarget: true, floorBytes: ceiling.size };
  }

  // Floor — establishes the honest minimum before searching.
  const floor = await tryEncode(minQuality);
  if (floor.size > targetBytes) {
    return { blob: floor, quality: minQuality, attempts, hitTarget: false, floorBytes: floor.size };
  }

  let lo = minQuality;
  let hi = maxQuality;
  let best = floor;
  let bestQ = minQuality;

  while (attempts < maxAttempts && hi - lo > 0.015) {
    const mid = (lo + hi) / 2;
    const blob = await tryEncode(mid);
    if (blob.size <= targetBytes) {
      best = blob;
      bestQ = mid;
      lo = mid;
      if (targetBytes - blob.size <= tolerance) break; // close enough — stop early
    } else {
      hi = mid;
    }
  }

  return { blob: best, quality: bestQ, attempts, hitTarget: true, floorBytes: floor.size };
}

export const DEFAULT_SCALES = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.42, 0.35, 0.3];

export interface OptimizeToTargetArgs<T extends SizedBlob> {
  targetBytes: number;
  allowDimensionReduction: boolean;
  scales?: number[];
  searchAtScale: (scale: number) => Promise<QualitySearchResult<T>>;
}

export type OptimizeToTargetResult<T extends SizedBlob> =
  | { hitTarget: true; blob: T; quality: number; scale: number; attemptsTotal: number }
  | { hitTarget: false; blob: T; floorBytes: number; floorScale: number; attemptsTotal: number };

/**
 * Ladder wrapper: tries the full-size search first, then descending scales
 * (only when dimension reduction is explicitly allowed).
 */
export async function optimizeToTarget<T extends SizedBlob>(
  args: OptimizeToTargetArgs<T>,
): Promise<OptimizeToTargetResult<T>> {
  const { allowDimensionReduction, searchAtScale } = args;
  const scales = allowDimensionReduction ? args.scales ?? DEFAULT_SCALES : [1];

  let attemptsTotal = 0;
  let bestFloor = Number.POSITIVE_INFINITY;
  let bestFloorScale = 1;
  let bestFloorBlob: T | null = null;

  for (const scale of scales) {
    const result = await searchAtScale(scale);
    attemptsTotal += result.attempts;
    if (result.hitTarget) {
      return {
        hitTarget: true,
        blob: result.blob,
        quality: result.quality,
        scale,
        attemptsTotal,
      };
    }
    if (result.floorBytes < bestFloor) {
      bestFloor = result.floorBytes;
      bestFloorScale = scale;
      bestFloorBlob = result.blob;
    }
  }

  return {
    hitTarget: false,
    blob: bestFloorBlob as T,
    floorBytes: Number.isFinite(bestFloor) ? bestFloor : 0,
    floorScale: bestFloorScale,
    attemptsTotal,
  };
}

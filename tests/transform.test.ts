/**
 * Resize/crop planning math tests (pure part of transform.ts).
 */
import { describe, it, expect } from 'vitest';
import { computeResizePlan, clampRect, parseDimension, parsePercent, ratioLockedHeight } from '../src/engine/transform';
import { EngineError } from '../src/engine/errors';

describe('computeResizePlan', () => {
  it('fit: contains inside bounds keeping ratio', () => {
    const plan = computeResizePlan(4000, 3000, { mode: 'fit', width: 600, height: 600 });
    expect(plan.outWidth).toBe(600);
    expect(plan.outHeight).toBe(450);
    expect(plan.source).toEqual({ x: 0, y: 0, width: 4000, height: 3000 });
  });

  it('width-only resize derives proportional height', () => {
    const plan = computeResizePlan(4000, 3000, { mode: 'fit', width: 800 });
    expect(plan).toMatchObject({ outWidth: 800, outHeight: 600 });
  });

  it('height-only resize derives proportional width', () => {
    const plan = computeResizePlan(4000, 3000, { mode: 'fit', height: 300 });
    expect(plan).toMatchObject({ outWidth: 400, outHeight: 300 });
  });

  it('stretch: exact bounds, full source', () => {
    const plan = computeResizePlan(4000, 3000, { mode: 'stretch', width: 600, height: 600 });
    expect(plan.outWidth).toBe(600);
    expect(plan.outHeight).toBe(600);
    expect(plan.source).toEqual({ x: 0, y: 0, width: 4000, height: 3000 });
  });

  it('fill: exact bounds via centered cover crop', () => {
    const plan = computeResizePlan(4000, 3000, { mode: 'fill', width: 1000, height: 1000 });
    expect(plan.outWidth).toBe(1000);
    expect(plan.outHeight).toBe(1000);
    expect(plan.source).toEqual({ x: 500, y: 0, width: 3000, height: 3000 });
  });

  it('fill: tall source crops top/bottom', () => {
    const plan = computeResizePlan(1000, 4000, { mode: 'fill', width: 500, height: 1000 });
    expect(plan.source.width).toBe(1000);
    expect(plan.source.height).toBe(2000);
    expect(plan.source.x).toBe(0);
    expect(plan.source.y).toBe(1000);
  });

  it('percent scaling rounds both dimensions', () => {
    const plan = computeResizePlan(4000, 3000, { mode: 'fit', percent: 25 });
    expect(plan).toMatchObject({ outWidth: 1000, outHeight: 750 });
  });

  it('rejects dimensions above the safe canvas limit', () => {
    expect(() => computeResizePlan(4000, 3000, { mode: 'fit', width: 20000 })).toThrow(EngineError);
  });

  it('rejects empty requests', () => {
    expect(() => computeResizePlan(4000, 3000, { mode: 'fit' })).toThrow(EngineError);
  });
});

describe('clampRect', () => {
  it('clamps crop rectangles into bounds', () => {
    expect(clampRect({ x: -50, y: 10, width: 5000, height: 200 }, 1000, 800)).toEqual({
      x: 0, y: 10, width: 1000, height: 200,
    });
  });
  it('enforces minimum 1x1', () => {
    expect(clampRect({ x: 999, y: 799, width: 0.4, height: 0.4 }, 1000, 800)).toEqual({
      x: 999, y: 799, width: 1, height: 1,
    });
  });
});

describe('input parsing', () => {
  it('parses pixel dimensions', () => {
    expect(parseDimension('600')).toBe(600);
    expect(parseDimension(' 600px ')).toBe(600);
    expect(parseDimension('')).toBeNull();
    expect(parseDimension('600.5')).toBeNull();
    expect(parseDimension('abc')).toBeNull();
  });
  it('parses percentages', () => {
    expect(parsePercent('50')).toBe(50);
    expect(parsePercent('50%')).toBe(50);
    expect(parsePercent('0')).toBeNull();
    expect(parsePercent('1200')).toBeNull();
  });
  it('ratio-locked height', () => {
    expect(ratioLockedHeight(600, 1)).toBe(600);
    expect(ratioLockedHeight(1080, 4 / 5)).toBe(1350);
  });
});

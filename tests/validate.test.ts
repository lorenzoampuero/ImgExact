/**
 * Validation guard tests — malformed/adversarial inputs must fail with precise codes.
 */
import { describe, it, expect } from 'vitest';
import { validateFileMeta, type Limits } from '../src/engine/validate';
import { EngineError } from '../src/engine/errors';
import { bytes, makePngHeader, makeJpeg } from './helpers';

const LIMITS: Limits = {
  warnFileBytes: 50 * 1024 * 1024,
  maxFileBytes: 200 * 1024 * 1024,
  warnPixels: 40_000_000,
  maxPixels: 100_000_000,
};

function expectCode(fn: () => unknown, code: string): EngineError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(EngineError);
    expect((err as EngineError).code).toBe(code);
    return err as EngineError;
  }
  throw new Error(`Expected ${code} but nothing was thrown`);
}

describe('validateFileMeta', () => {
  it('rejects empty files', () => {
    expectCode(() => validateFileMeta({ name: 'x.png', size: 0 }, new Uint8Array(0), LIMITS), 'EMPTY_FILE');
  });

  it('rejects files above the hard size limit', () => {
    const head = makePngHeader(10, 10);
    expectCode(
      () => validateFileMeta({ name: 'big.png', size: 300 * 1024 * 1024 }, head, LIMITS),
      'FILE_TOO_LARGE',
    );
  });

  it('rejects unknown signatures as corrupt', () => {
    expectCode(
      () => validateFileMeta({ name: 'mystery.bin', size: 1000 }, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), LIMITS),
      'CORRUPT_FILE',
    );
  });

  it('rejects SVG with a specific explanation', () => {
    const svg = bytes(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'));
    const err = expectCode(() => validateFileMeta({ name: 'logo.svg', size: svg.length }, svg, LIMITS), 'UNSUPPORTED_FORMAT');
    expect(err.detail).toContain('vector');
  });

  it('rejects TIFF with guidance', () => {
    const tiff = new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0, 0, 0, 0]);
    const err = expectCode(() => validateFileMeta({ name: 'scan.tif', size: tiff.length }, tiff, LIMITS), 'UNSUPPORTED_FORMAT');
    expect(err.detail).toContain('Convert');
  });

  it('blocks decompression bombs via header dimensions', () => {
    const huge = makePngHeader(20000, 20000); // 400 MP
    const err = expectCode(
      () => validateFileMeta({ name: 'bomb.png', size: huge.length }, huge, LIMITS),
      'TOO_MANY_PIXELS',
    );
    expect(err.detail).toContain('400');
  });

  it('accepts large-but-safe images with a warning', () => {
    const big = makePngHeader(8000, 6000); // 48 MP > warn threshold
    const result = validateFileMeta({ name: 'big.png', size: big.length }, big, LIMITS);
    expect(result.kind).toBe('png');
    expect(result.dims).toEqual({ width: 8000, height: 6000 });
    expect(result.warnings.some((w) => w.includes('megapixels'))).toBe(true);
  });

  it('flags extension/content mismatch but proceeds', () => {
    const png = makePngHeader(100, 100);
    const result = validateFileMeta({ name: 'photo.jpg', size: png.length }, png, LIMITS);
    expect(result.kind).toBe('png');
    expect(result.extensionMismatch).toBe(true);
    expect(result.warnings.some((w) => w.includes('extension'))).toBe(true);
  });

  it('does not flag heic/avif container pairing as a mismatch', () => {
    const avif = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0, 0, 0, 0]);
    const result = validateFileMeta({ name: 'IMG_1234.heic', size: avif.length }, avif, LIMITS);
    expect(result.kind).toBe('avif');
    expect(result.extensionMismatch).toBe(false);
  });

  it('allows HEIC through to the decoder (conditional support)', () => {
    const heic = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0]);
    const result = validateFileMeta({ name: 'photo.heic', size: heic.length }, heic, LIMITS);
    expect(result.kind).toBe('heic');
  });

  it('accepts a normal JPEG', () => {
    const jpeg = makeJpeg(1200, 800);
    const result = validateFileMeta({ name: 'photo.jpeg', size: jpeg.length }, jpeg, LIMITS);
    expect(result).toMatchObject({ kind: 'jpeg', mime: 'image/jpeg' });
    expect(result.dims).toEqual({ width: 1200, height: 800 });
    expect(result.warnings).toHaveLength(0);
  });

  it('does not crash without a known extension', () => {
    const jpeg = makeJpeg(10, 10);
    const result = validateFileMeta({ name: 'mystery', size: jpeg.length }, jpeg, LIMITS);
    expect(result.kind).toBe('jpeg');
    expect(result.extensionMismatch).toBe(false);
  });
});

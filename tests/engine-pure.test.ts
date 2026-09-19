/**
 * Pure engine tests: sniffing, dimensions, formatting, unit parsing, Base64.
 */
import { describe, it, expect } from 'vitest';
import { sniffKind, readDimensions, pngMayHaveAlpha, webpMayHaveAlpha } from '../src/engine/headers';
import {
  formatBytes, parseSizeToBytes, formatPercent, reductionRatio,
  formatRatio, megapixels, printSize, gcd,
  outputFilename, sanitizeName, baseName, extensionForMime,
} from '../src/engine/format';
import { bytesToBase64, bytesToDataUri, base64SizeInfo } from '../src/engine/base64';
import { makePngHeader, makeJpeg, makeGif, makeWebpVp8x, makeAvif, makeBmp, bytes } from './helpers';

describe('sniffKind', () => {
  it('detects JPEG magic bytes', () => {
    expect(sniffKind(makeJpeg(10, 10))).toBe('jpeg');
  });
  it('detects PNG signature', () => {
    expect(sniffKind(makePngHeader(10, 10))).toBe('png');
  });
  it('detects GIF', () => {
    expect(sniffKind(makeGif(10, 10))).toBe('gif');
  });
  it('detects WebP via RIFF container', () => {
    expect(sniffKind(makeWebpVp8x(10, 10))).toBe('webp');
  });
  it('detects AVIF via ftyp brand', () => {
    expect(sniffKind(makeAvif(10, 10))).toBe('avif');
  });
  it('detects HEIC via ftyp brand', () => {
    const heic = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0, 0, 0, 0]);
    expect(sniffKind(heic)).toBe('heic');
  });
  it('detects BMP', () => {
    expect(sniffKind(makeBmp(10, 10))).toBe('bmp');
  });
  it('detects SVG from text head', () => {
    const svg = bytes(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'));
    expect(sniffKind(svg)).toBe('svg');
  });
  it('detects TIFF (still unsupported downstream)', () => {
    expect(sniffKind(new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0, 0, 0, 0]))).toBe('tiff');
  });
  it('returns unknown for garbage', () => {
    expect(sniffKind(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBe('unknown');
  });
  it('returns unknown for empty', () => {
    expect(sniffKind(new Uint8Array(0))).toBe('unknown');
  });
});

describe('readDimensions', () => {
  it('reads PNG dimensions (big-endian IHDR)', () => {
    expect(readDimensions(makePngHeader(640, 480), 'png')).toEqual({ width: 640, height: 480 });
  });
  it('reads JPEG dimensions from SOF0', () => {
    expect(readDimensions(makeJpeg(4032, 3024), 'jpeg')).toEqual({ width: 4032, height: 3024 });
  });
  it('skips APP0 and finds SOF (no-JFIF variant)', () => {
    expect(readDimensions(makeJpeg(300, 200, { withJfif: false }), 'jpeg')).toEqual({ width: 300, height: 200 });
  });
  it('reads GIF dimensions (little-endian)', () => {
    expect(readDimensions(makeGif(320, 240), 'gif')).toEqual({ width: 320, height: 240 });
  });
  it('reads WebP VP8X canvas size', () => {
    expect(readDimensions(makeWebpVp8x(1920, 1080), 'webp')).toEqual({ width: 1920, height: 1080 });
  });
  it('reads AVIF ispe dimensions', () => {
    expect(readDimensions(makeAvif(800, 600), 'avif')).toEqual({ width: 800, height: 600 });
  });
  it('reads BMP dimensions', () => {
    expect(readDimensions(makeBmp(100, 50), 'bmp')).toEqual({ width: 100, height: 50 });
  });
  it('returns null on corrupt JPEG trailer', () => {
    const corrupt = bytes([0xff, 0xd8, 0x00, 0x00, 0x00]);
    expect(readDimensions(corrupt, 'jpeg')).toBeNull();
  });
  it('returns null for truncated PNG', () => {
    expect(readDimensions(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 'png')).toBeNull();
  });
});

describe('alpha capability flags', () => {
  it('PNG color type 6 implies alpha; type 2 does not', () => {
    expect(pngMayHaveAlpha(makePngHeader(10, 10, 6))).toBe(true);
    expect(pngMayHaveAlpha(makePngHeader(10, 10, 2))).toBe(false);
  });
  it('WebP alpha flag from VP8X', () => {
    const withAlpha = makeWebpVp8x(10, 10);
    expect(webpMayHaveAlpha(withAlpha)).toBe(false);
    withAlpha[20] = 0x10;
    expect(webpMayHaveAlpha(withAlpha)).toBe(true);
  });
});

describe('formatBytes / parseSizeToBytes', () => {
  it('formats bytes in binary units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(50 * 1024)).toBe('50 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatBytes(187 * 1024)).toBe('187 KB');
  });
  it('parses human sizes', () => {
    expect(parseSizeToBytes('50 kb')).toBe(51200);
    expect(parseSizeToBytes('50KB')).toBe(51200);
    expect(parseSizeToBytes('1.5 MB')).toBe(Math.round(1.5 * 1048576));
    expect(parseSizeToBytes('200 k')).toBe(204800);
    expect(parseSizeToBytes('50')).toBe(51200); // bare number = KB in this domain
    expect(parseSizeToBytes('0,5 mb')).toBe(524288);
    expect(parseSizeToBytes('2 gb')).toBe(2 * 1024 * 1024 * 1024);
  });
  it('rejects nonsense', () => {
    expect(parseSizeToBytes('')).toBeNull();
    expect(parseSizeToBytes('banana')).toBeNull();
    expect(parseSizeToBytes('-5 kb')).toBeNull();
    expect(parseSizeToBytes('0')).toBeNull();
  });
});

describe('ratio and sizes', () => {
  it('computes percentage reductions', () => {
    expect(reductionRatio(100, 25)).toBeCloseTo(0.75);
    expect(formatPercent(0.9333)).toBe('93.3%');
  });
  it('ratio labels use gcd when elegant, decimals otherwise', () => {
    expect(formatRatio(1920, 1080)).toBe('16:9');
    expect(formatRatio(1080, 1350)).toBe('4:5');
    expect(formatRatio(1080, 566)).toBe('1.91:1');
  });
  it('megapixels', () => {
    expect(megapixels(4032, 3024)).toBe('12.2 MP');
    expect(megapixels(1920, 1080)).toBe('2.1 MP');
  });
  it('print size arithmetic (px / dpi)', () => {
    const ps = printSize(1800, 1200, 300);
    expect(ps).not.toBeNull();
    expect(ps!.inches.width).toBeCloseTo(6);
    expect(ps!.cm.width).toBeCloseTo(15.24);
  });
  it('gcd basics', () => {
    expect(gcd(12, 8)).toBe(4);
    expect(gcd(0, 5)).toBe(5);
  });
});

describe('filenames', () => {
  it('produces understandable output names', () => {
    expect(outputFilename('photo.HEIC', 'compressed', 'image/jpeg')).toBe('photo-compressed.jpg');
    expect(outputFilename('IMG_1234 (1).jpg', 'resized', 'image/webp')).toBe('IMG_1234-1-resized.webp');
  });
  it('sanitizes hostile names', () => {
    expect(sanitizeName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeName('...')).toBe('image');
    expect(sanitizeName('a b  c.png')).toBe('a-b-c');
  });
  it('strips known extensions in baseName', () => {
    expect(baseName('photo.jpeg')).toBe('photo');
    expect(baseName('photo.tar.gz')).toBe('photo.tar');
  });
  it('maps mime to extension', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('image/svg+xml')).toBe('img');
  });
});

describe('base64', () => {
  it('encodes known vectors', () => {
    expect(bytesToBase64(new Uint8Array([0x4d, 0x61, 0x6e]))).toBe('TWFu');
    expect(bytesToBase64(new Uint8Array([0x4d, 0x61]))).toBe('TWE=');
    expect(bytesToBase64(new Uint8Array([0x4d]))).toBe('TQ==');
    expect(bytesToBase64(new Uint8Array(0))).toBe('');
  });
  it('matches an independent encoder for deterministic data', () => {
    const data = new Uint8Array(1000);
    for (let i = 0; i < data.length; i++) data[i] = (i * 31) % 256;
    let binary = '';
    for (const byte of data) binary += String.fromCharCode(byte);
    const expected = btoa(binary);
    expect(bytesToBase64(data)).toBe(expected);
  });
  it('data URI format', () => {
    expect(bytesToDataUri(new Uint8Array([0xff]), 'image/png')).toBe('data:image/png;base64,/w==');
  });
  it('size math: 33% overhead', () => {
    const info = base64SizeInfo(3000, 'image/png');
    expect(info.base64Chars).toBe(4000);
    expect(info.overheadRatio).toBeGreaterThan(0.3);
  });
});

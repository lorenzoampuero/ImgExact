/**
 * Metadata parsing + print-density patching tests.
 */
import { describe, it, expect } from 'vitest';
import {
  readJpegMetadata, readPngMetadata, inspectMetadata, hasAnyMetadata,
  patchJpegDpi, insertPngPhys, crc32,
} from '../src/engine/metadata';
import { bytes, makeJpeg, makePngHeader, makeExifJpeg } from './helpers';

const asciiBytes = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

describe('readJpegMetadata (EXIF)', () => {
  it('extracts camera, software, datetime, orientation', () => {
    const jpeg = makeExifJpeg(1200, 900, {
      make: 'Canon',
      model: 'EOS R6',
      software: 'Firmware 1.4',
      dateTime: '2026:08:01 12:30:45',
      orientation: 6,
    });
    const report = readJpegMetadata(jpeg);
    expect(report.hasExif).toBe(true);
    expect(report.cameraMake).toBe('Canon');
    expect(report.cameraModel).toBe('EOS R6');
    expect(report.software).toBe('Firmware 1.4');
    expect(report.dateTime).toBe('2026:08:01 12:30:45');
    expect(report.orientation).toBe(6);
    expect(report.hasGps).toBe(false);
    expect(hasAnyMetadata(report)).toBe(true);
  });

  it('extracts GPS decimal coordinates', () => {
    const jpeg = makeExifJpeg(800, 600, { gps: { lat: 48.8584, lon: 2.2945 } });
    const report = readJpegMetadata(jpeg);
    expect(report.hasGps).toBe(true);
    expect(report.gpsLatitude).toBeCloseTo(48.8584, 2);
    expect(report.gpsLongitude).toBeCloseTo(2.2945, 2);
  });

  it('handles southern/western hemispheres via refs', () => {
    const jpeg = makeExifJpeg(800, 600, { gps: { lat: -33.8688, lon: -70.6693 } });
    const report = readJpegMetadata(jpeg);
    expect(report.gpsLatitude).toBeCloseTo(-33.8688, 2);
    expect(report.gpsLongitude).toBeCloseTo(-70.6693, 2);
  });

  it('reports a clean file as clean', () => {
    const report = readJpegMetadata(makeJpeg(100, 100));
    expect(report.hasExif).toBe(false);
    expect(hasAnyMetadata(report)).toBe(false);
  });

  it('does not crash on truncated EXIF segments', () => {
    const truncated = bytes([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x20], asciiBytes('Exif'), [0, 0]);
    expect(() => readJpegMetadata(truncated)).not.toThrow();
  });
});

describe('readPngMetadata (text chunks)', () => {
  function pngWithText(keyword: string, text: string): Uint8Array {
    const png = makePngHeader(100, 100);
    const t = asciiBytes('tEXt');
    const data = bytes(asciiBytes(keyword), [0], asciiBytes(text));
    const chunk = bytes(
      [(data.length >>> 24) & 0xff, (data.length >>> 16) & 0xff, (data.length >>> 8) & 0xff, data.length & 0xff],
      t, data,
    );
    const crcVal = crc32(bytes(t, data));
    const crcBytes = bytes([(crcVal >>> 24) & 0xff, (crcVal >>> 16) & 0xff, (crcVal >>> 8) & 0xff, crcVal & 0xff]);
    return bytes(png, chunk, crcBytes);
  }

  it('parses tEXt chunks', () => {
    const report = readPngMetadata(pngWithText('Software', 'GIMP 2.10'));
    expect(report.pngTextChunks).toHaveLength(1);
    expect(report.pngTextChunks[0]).toEqual({ keyword: 'Software', text: 'GIMP 2.10' });
    expect(hasAnyMetadata(report)).toBe(true);
  });

  it('clean PNG has no metadata', () => {
    const report = readPngMetadata(makePngHeader(100, 100));
    expect(hasAnyMetadata(report)).toBe(false);
  });
});

describe('inspectMetadata dispatch', () => {
  it('routes by kind without throwing on any sample', () => {
    expect(() => inspectMetadata(makeJpeg(10, 10), 'jpeg')).not.toThrow();
    expect(() => inspectMetadata(makePngHeader(10, 10), 'png')).not.toThrow();
    expect(() => inspectMetadata(new Uint8Array(64), 'webp')).not.toThrow();
  });
});

describe('crc32', () => {
  it('matches the standard test vector', () => {
    const data = asciiBytes('123456789');
    expect(crc32(data)).toBe(0xcbf43926);
  });
});

describe('patchJpegDpi', () => {
  it('updates an existing JFIF density field', () => {
    const jpeg = makeJpeg(100, 100); // helper writes JFIF with 72 DPI
    const patched = patchJpegDpi(jpeg, 300);
    // JFIF layout: FF E0 (2) len (2) 'JFIF\0' (5) ver (2) units (1) at index 13, X density at 14-15
    expect(patched[13]).toBe(1); // units = inches
    const x = (patched[14]! << 8) | patched[15]!;
    expect(x).toBe(300);
    expect(patched.length).toBe(jpeg.length);
  });

  it('inserts a JFIF APP0 when missing', () => {
    const noJfif = makeJpeg(100, 100, { withJfif: false });
    const patched = patchJpegDpi(noJfif, 300);
    expect(patched.length).toBe(noJfif.length + 18);
    expect(patched[2]).toBe(0xff);
    expect(patched[3]).toBe(0xe0);
    // density bytes: after FF E0 len(2) 'JFIF\0'(5) ver(2) units(1) => offset 2+4+5+2+1 = 14
    const x = (patched[14]! << 8) | patched[15]!;
    expect(x).toBe(300);
  });

  it('rejects non-JPEG input', () => {
    expect(() => patchJpegDpi(makePngHeader(10, 10), 300)).toThrow();
  });
});

describe('insertPngPhys', () => {
  it('inserts a valid pHYs chunk after IHDR', () => {
    const png = makePngHeader(100, 100);
    const out = insertPngPhys(png, 300);
    expect(out.length).toBe(png.length + 21);
    const chunkStart = 33;
    const length = (out[chunkStart]! << 24) | (out[chunkStart + 1]! << 16) | (out[chunkStart + 2]! << 8) | out[chunkStart + 3]!;
    expect(length).toBe(9);
    expect(String.fromCharCode(out[chunkStart + 4]!, out[chunkStart + 5]!, out[chunkStart + 6]!, out[chunkStart + 7]!)).toBe('pHYs');
    const ppm = ((out[chunkStart + 8]! << 24) | (out[chunkStart + 9]! << 16) | (out[chunkStart + 10]! << 8) | out[chunkStart + 11]!) >>> 0;
    expect(ppm).toBe(Math.round(300 / 0.0254));
    expect(out[chunkStart + 16]).toBe(1); // unit: metre
    // CRC covers type+data
    const stored = ((out[chunkStart + 17]! << 24) | (out[chunkStart + 18]! << 16) | (out[chunkStart + 19]! << 8) | out[chunkStart + 20]!) >>> 0;
    expect(stored).toBe(crc32(out.subarray(chunkStart + 4, chunkStart + 17)));
  });

  it('rejects non-PNG input', () => {
    expect(() => insertPngPhys(makeJpeg(10, 10), 300)).toThrow();
  });
});

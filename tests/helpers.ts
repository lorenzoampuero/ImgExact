/**
 * Byte builders for engine tests — construct minimal valid file skeletons
 * without any external image tooling.
 */

import { crc32 } from '../src/engine/metadata';

function u16be(v: number): number[] { return [(v >> 8) & 0xff, v & 0xff]; }
function u16le(v: number): number[] { return [v & 0xff, (v >> 8) & 0xff]; }
function u24le(v: number): number[] { return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff]; }
function u32be(v: number): number[] { return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]; }
function u32le(v: number): number[] { return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]; }
function ascii(s: string): number[] { return [...s].map((c) => c.charCodeAt(0)); }

export function bytes(...parts: Array<number[] | Uint8Array>): Uint8Array {
  const flat: number[] = [];
  for (const p of parts) {
    if (p instanceof Uint8Array) flat.push(...p);
    else flat.push(...p);
  }
  return new Uint8Array(flat);
}

/** Minimal valid PNG header: signature + IHDR (no IDAT needed for parser tests). */
export function makePngHeader(width: number, height: number, colorType = 6): Uint8Array {
  const ihdrData = [...u32be(width), ...u32be(height), 8, colorType, 0, 0, 0];
  const type = ascii('IHDR');
  const crc = crc32(new Uint8Array([...type, ...ihdrData]));
  return bytes(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    u32be(13), type, ihdrData, u32be(crc),
  );
}

/** JPEG: SOI + optional APP0 + SOF0 with dimensions + EOI. */
export function makeJpeg(width: number, height: number, opts?: { withJfif?: boolean }): Uint8Array {
  const parts: Array<number[] | Uint8Array> = [[0xff, 0xd8]];
  if (opts?.withJfif !== false) {
    parts.push(
      [0xff, 0xe0], u16be(16), ascii('JFIF\0'),
      [0x01, 0x01, 0x00], u16be(72), u16be(72), [0x00, 0x00],
    );
  }
  // SOF0: length 17, precision 8, height, width, 3 components
  parts.push(
    [0xff, 0xc0], u16be(17), [8], u16be(height), u16be(width),
    [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1],
  );
  parts.push([0xff, 0xd9]);
  return bytes(...parts);
}

/** GIF89a header with logical screen descriptor. */
export function makeGif(width: number, height: number): Uint8Array {
  return bytes(ascii('GIF89a'), u16le(width), u16le(height), [0x00, 0x00, 0x00]);
}

/** WebP VP8X extended header with canvas size (standard layout: flags, reserved, 24-bit w/h). */
export function makeWebpVp8x(width: number, height: number): Uint8Array {
  const payload = [0x00, 0x00, 0x00, 0x00, ...u24le(width - 1), ...u24le(height - 1)];
  return bytes(
    ascii('RIFF'), u32le(4 + 8 + payload.length), ascii('WEBP'),
    ascii('VP8X'), u32le(payload.length), payload,
  );
}

/** AVIF-style box structure with an ispe box. */
export function makeAvif(width: number, height: number): Uint8Array {
  const ftyp = bytes(ascii('ftyp'), ascii('avif'), u32be(0), ascii('avif'), ascii('mif1'));
  const ispePayload = [...u32be(0), ...u32be(width), ...u32be(height)];
  const ispe = bytes(ascii('ispe'), ispePayload);
  return bytes(u32be(ftyp.length + 0), ftyp, u32be(ispe.length), ispe);
}

/** BMP header with dimensions. */
export function makeBmp(width: number, height: number): Uint8Array {
  return bytes(
    ascii('BM'), u32le(54), [0, 0, 0, 0], u32le(54),
    u32le(40), u32le(width), u32le(height), u16le(1), u16le(24),
    u32le(0), u32le(0), u32le(0), u32le(0), u32le(0), u32le(0),
  );
}

// ---------------------------------------------------------------------------
// EXIF JPEG builder
// ---------------------------------------------------------------------------

export interface ExifInput {
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  orientation?: number;
  gps?: { lat: number; lon: number };
}

/**
 * Builds a JPEG with a well-formed EXIF APP1 segment (little-endian TIFF).
 * Layout: TIFF header (8) → IFD0 → [values] → GPS IFD → [values]
 */
export function makeExifJpeg(width: number, height: number, input: ExifInput): Uint8Array {
  const ifd0Tags: Array<{ tag: number; type: number; count: number; bytes: number[]; valueOffsetPlaceholder?: boolean }> = [];
  const stringValue = (s: string) => [...ascii(s), 0];

  const makeEntry = (tag: number, type: number, count: number, valueBytes: number[]) => ({ tag, type, count, bytes: valueBytes });

  if (input.make) ifd0Tags.push(makeEntry(0x010f, 2, input.make.length + 1, stringValue(input.make)));
  if (input.model) ifd0Tags.push(makeEntry(0x0110, 2, input.model.length + 1, stringValue(input.model)));
  if (input.software) ifd0Tags.push(makeEntry(0x0131, 2, input.software.length + 1, stringValue(input.software)));
  if (input.dateTime) ifd0Tags.push(makeEntry(0x0132, 2, input.dateTime.length + 1, stringValue(input.dateTime)));
  if (input.orientation !== undefined) ifd0Tags.push(makeEntry(0x0112, 3, 1, u16le(input.orientation)));
  if (input.gps) ifd0Tags.push(makeEntry(0x8825, 4, 1, u32le(0))); // pointer patched later

  const ifd0Size = 2 + ifd0Tags.length * 12 + 4;
  const valuesBase = 8 + ifd0Size;

  // Assign offsets to out-of-line values.
  let cursor = valuesBase;
  const valueOffsets: number[] = [];
  for (const t of ifd0Tags) {
    if (t.bytes.length > 4) {
      valueOffsets.push(cursor);
      cursor += t.bytes.length + (t.bytes.length % 2);
    } else {
      valueOffsets.push(-1);
    }
  }

  // GPS IFD (after IFD0 values)
  const gpsLat = input.gps?.lat ?? 0;
  const gpsLon = input.gps?.lon ?? 0;
  const degMinSec = (v: number): number[] => {
    const abs = Math.abs(v);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = Math.round(((abs - deg) * 60 - min) * 60);
    return [...u32le(deg), ...u32le(1), ...u32le(min), ...u32le(1), ...u32le(sec), ...u32le(1)];
  };
  const gpsEntriesCount = 4; // LatRef, Lat, LonRef, Lon
  const gpsIfdSize = 2 + gpsEntriesCount * 12 + 4;
  const gpsIfdOffset = cursor;
  cursor += gpsIfdSize;
  const latValuesOffset = cursor; cursor += 24;
  const lonValuesOffset = cursor; cursor += 24;

  // EXIF rule: values of 4 bytes or fewer are stored inline in the entry.
  const gpsInline = (tag: number, type: number, count: number, valueBytes: number[]): number[] => [
    tag & 0xff, (tag >> 8) & 0xff,
    type & 0xff, 0,
    ...u32le(count),
    ...[...valueBytes, 0, 0, 0, 0].slice(0, 4),
  ];
  const gpsOffset = (tag: number, type: number, count: number, offset: number): number[] => [
    tag & 0xff, (tag >> 8) & 0xff,
    type & 0xff, 0,
    ...u32le(count),
    ...u32le(offset),
  ];

  const gpsIfd = [
    ...u16le(gpsEntriesCount),
    ...gpsInline(0x0001, 2, 2, [...ascii(gpsLat >= 0 ? 'N' : 'S'), 0]),
    ...gpsOffset(0x0002, 5, 3, latValuesOffset),
    ...gpsInline(0x0003, 2, 2, [...ascii(gpsLon >= 0 ? 'E' : 'W'), 0]),
    ...gpsOffset(0x0004, 5, 3, lonValuesOffset),
    ...u32le(0),
  ];

  const gpsData = [
    ...degMinSec(gpsLat),
    ...degMinSec(gpsLon),
  ];

  // IFD0 entries
  const ifd0: number[] = [...u16le(ifd0Tags.length)];
  ifd0Tags.forEach((t, i) => {
    ifd0.push(t.tag & 0xff, (t.tag >> 8) & 0xff);
    ifd0.push(t.type & 0xff, 0);
    ifd0.push(...u32le(t.count));
    if (i === ifd0Tags.length - 1 && input.gps) {
      ifd0.push(...u32le(gpsIfdOffset));
    } else if (valueOffsets[i] === -1) {
      const padded = [...t.bytes, ...Array(4 - t.bytes.length).fill(0)];
      ifd0.push(...padded.slice(0, 4));
    } else {
      ifd0.push(...u32le(valueOffsets[i]!));
    }
  });
  ifd0.push(...u32le(0)); // next IFD

  // Value region for IFD0 strings
  const valuesRegion: number[] = [];
  for (const t of ifd0Tags) {
    if (t.bytes.length > 4) {
      valuesRegion.push(...t.bytes);
      if (t.bytes.length % 2) valuesRegion.push(0);
    }
  }

  const tiffBody = bytes(
    [0x49, 0x49, 0x2a, 0x00], u32le(8),
    new Uint8Array(ifd0),
    new Uint8Array(valuesRegion),
    new Uint8Array(gpsIfd),
    new Uint8Array(gpsData),
  );

  const app1Payload = bytes(ascii('Exif\0\0'), tiffBody);
  const app1 = bytes([0xff, 0xe1], u16be(app1Payload.length + 2), app1Payload);

  // Assemble: SOI + APP1 + SOF0 + EOI
  const sof = bytes(
    [0xff, 0xc0], u16be(17), [8], u16be(height), u16be(width),
    [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1],
  );
  return bytes([0xff, 0xd8], app1, sof, [0xff, 0xd9]);
}

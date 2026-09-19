/**
 * Metadata parsing and print-density patching. Pure byte-level functions.
 *
 * Privacy rules (enforced by design):
 * - Parsing happens locally; nothing here performs any I/O.
 * - Callers must never transmit metadata values (GPS, camera IDs, timestamps).
 */

import { EngineError } from './errors';
import type { ImageKind } from './headers';

export interface TextChunk {
  keyword: string;
  text: string;
}

export interface MetadataReport {
  hasExif: boolean;
  hasGps: boolean;
  hasXmp: boolean;
  hasIcc: boolean;
  cameraMake?: string;
  cameraModel?: string;
  software?: string;
  dateTime?: string;
  orientation?: number;
  gpsLatitude?: number;
  gpsLongitude?: number;
  pngTextChunks: TextChunk[];
  notes: string[];
}

export function emptyReport(): MetadataReport {
  return { hasExif: false, hasGps: false, hasXmp: false, hasIcc: false, pngTextChunks: [], notes: [] };
}

export function hasAnyMetadata(r: MetadataReport): boolean {
  return (
    r.hasExif || r.hasGps || r.hasXmp || r.hasIcc ||
    Boolean(r.cameraMake || r.cameraModel || r.software || r.dateTime || r.orientation !== undefined) ||
    r.pngTextChunks.length > 0
  );
}

// ---------------------------------------------------------------------------
// JPEG segment walking
// ---------------------------------------------------------------------------

interface JpegSegment {
  marker: number;
  /** Offset of the segment data (after marker + length bytes). */
  dataStart: number;
  /** Segment length as declared (includes the 2 length bytes). */
  length: number;
}

function* jpegSegments(bytes: Uint8Array, maxBytes = 512 * 1024): Generator<JpegSegment> {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return;
  let i = 2;
  const limit = Math.min(bytes.length, maxBytes);
  while (i + 4 <= limit) {
    if (bytes[i] !== 0xff) return;
    let marker = bytes[i + 1]!;
    let cursor = i;
    while (marker === 0xff && cursor + 2 < limit) {
      cursor++;
      marker = bytes[cursor + 1]!;
    }
    if (marker === 0xd9 || marker === 0xda) return; // EOI / SOS
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i = cursor + 2; continue; }
    const length = (bytes[cursor + 2]! << 8) | bytes[cursor + 3]!;
    if (length < 2) return;
    yield { marker, dataStart: cursor + 4, length };
    i = cursor + 2 + length;
  }
}

const asciiOf = (bytes: Uint8Array, start: number, length: number): string => {
  let out = '';
  for (let i = start; i < start + length && i < bytes.length; i++) out += String.fromCharCode(bytes[i]!);
  return out;
};

// ---------------------------------------------------------------------------
// EXIF (TIFF-based) parsing
// ---------------------------------------------------------------------------

interface TiffReader {
  bytes: Uint8Array;
  base: number; // offset where TIFF header starts
  little: boolean;
  u16(offset: number): number;
  u32(offset: number): number;
}

function makeTiffReader(bytes: Uint8Array, base: number): TiffReader | null {
  if (base + 8 > bytes.length) return null;
  const b0 = bytes[base]!, b1 = bytes[base + 1]!;
  let little: boolean;
  if (b0 === 0x49 && b1 === 0x49) little = true;
  else if (b0 === 0x4d && b1 === 0x4d) little = false;
  else return null;
  const u16 = (o: number) =>
    little ? bytes[base + o]! | (bytes[base + o + 1]! << 8)
           : (bytes[base + o]! << 8) | bytes[base + o + 1]!;
  const u32 = (o: number) =>
    little
      ? (bytes[base + o]! | (bytes[base + o + 1]! << 8) | (bytes[base + o + 2]! << 16) | (bytes[base + o + 3]! << 24)) >>> 0
      : ((bytes[base + o]! << 24) | (bytes[base + o + 1]! << 16) | (bytes[base + o + 2]! << 8) | bytes[base + o + 3]!) >>> 0;
  if (u16(2) !== 0x2a) return null;
  return { bytes, base, little, u16, u32 };
}

interface IfdEntry {
  tag: number;
  type: number;
  count: number;
  /** Absolute offset into `bytes` where the value lives (inline values are encoded into a temp slot). */
  valueOffset: number;
  valueLength: number;
  inline: boolean;
}

const TYPE_SIZES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 12: 8 };

function readIfd(r: TiffReader, ifdOffset: number): IfdEntry[] | null {
  const count = r.u16(ifdOffset);
  if (count === 0 || count > 512) return null;
  const entries: IfdEntry[] = [];
  for (let i = 0; i < count; i++) {
    const entry = ifdOffset + 2 + i * 12;
    if (r.base + entry + 12 > r.bytes.length) return entries;
    const tag = r.u16(entry);
    const type = r.u16(entry + 2);
    const cnt = r.u32(entry + 4);
    const sizePer = TYPE_SIZES[type] ?? 1;
    const total = sizePer * cnt;
    const inline = total <= 4;
    entries.push({
      tag,
      type,
      count: cnt,
      valueOffset: inline ? r.base + entry + 8 : r.base + r.u32(entry + 8),
      valueLength: total,
      inline,
    });
  }
  return entries;
}

function entryString(r: TiffReader, e: IfdEntry): string | undefined {
  if (e.type !== 2 || e.valueLength === 0) return undefined;
  const end = Math.min(e.valueOffset + e.valueLength, r.bytes.length);
  let s = '';
  for (let i = e.valueOffset; i < end; i++) {
    const c = r.bytes[i]!;
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s || undefined;
}

function entryShort(r: TiffReader, e: IfdEntry): number | undefined {
  if (e.type !== 3 || e.valueLength < 2) return undefined;
  const b = r.bytes;
  const v = r.little
    ? b[e.valueOffset]! | (b[e.valueOffset + 1]! << 8)
    : (b[e.valueOffset]! << 8) | b[e.valueOffset + 1]!;
  return v;
}

function entryRationals(r: TiffReader, e: IfdEntry): number[] {
  if (e.type !== 5) return [];
  const values: number[] = [];
  const n = Math.min(e.count, 8);
  for (let i = 0; i < n; i++) {
    const off = e.valueOffset + i * 8;
    if (off + 8 > r.bytes.length) break;
    const num = r.u32(off - r.base);
    const den = r.u32(off - r.base + 4);
    values.push(den === 0 ? 0 : num / den);
  }
  return values;
}

function gpsToDecimal(parts: number[], ref: string | undefined): number | undefined {
  if (parts.length < 3 || parts.some((p) => !Number.isFinite(p))) return undefined;
  const [deg = 0, min = 0, sec = 0] = parts;
  const value = deg + min / 60 + sec / 3600;
  const negative = ref === 'S' || ref === 'W';
  return Number.isFinite(value) ? (negative ? -value : value) : undefined;
}

export function readJpegMetadata(bytes: Uint8Array): MetadataReport {
  const report = emptyReport();
  const XMP_PREFIX = 'http://ns.adobe.com/xap/1.0/';
  for (const seg of jpegSegments(bytes)) {
    if (seg.marker === 0xe1) {
      const sig = asciiOf(bytes, seg.dataStart, 6);
      if (sig === 'Exif\u0000\u0000') {
        report.hasExif = true;
        const tiff = makeTiffReader(bytes, seg.dataStart + 6);
        if (tiff) {
          const ifd0Offset = tiff.u32(4);
          const entries = readIfd(tiff, ifd0Offset - 0) ?? [];
          let gpsPointer: number | undefined;
          for (const e of entries) {
            switch (e.tag) {
              case 0x010f: report.cameraMake = entryString(tiff, e) ?? report.cameraMake; break;
              case 0x0110: report.cameraModel = entryString(tiff, e) ?? report.cameraModel; break;
              case 0x0131: report.software = entryString(tiff, e) ?? report.software; break;
              case 0x0132: report.dateTime = entryString(tiff, e) ?? report.dateTime; break;
              case 0x0112: report.orientation = entryShort(tiff, e) ?? report.orientation; break;
              case 0x8825: gpsPointer = tiff.u32(e.valueOffset - tiff.base); break;
            }
          }
          if (gpsPointer && gpsPointer > 0) {
            const gpsEntries = readIfd(tiff, gpsPointer) ?? [];
            let latParts: number[] = [], latRef: string | undefined;
            let lonParts: number[] = [], lonRef: string | undefined;
            for (const e of gpsEntries) {
              switch (e.tag) {
                case 0x0001: latRef = entryString(tiff, e); break;
                case 0x0002: latParts = entryRationals(tiff, e); break;
                case 0x0003: lonRef = entryString(tiff, e); break;
                case 0x0004: lonParts = entryRationals(tiff, e); break;
              }
            }
            const lat = gpsToDecimal(latParts, latRef);
            const lon = gpsToDecimal(lonParts, lonRef);
            if (lat !== undefined || lon !== undefined) {
              report.hasGps = true;
              report.gpsLatitude = lat;
              report.gpsLongitude = lon;
            } else {
              report.hasGps = true; // GPS IFD present even if values unreadable
            }
          }
        }
      } else if (sig.startsWith('http:')) {
        const prefix = asciiOf(bytes, seg.dataStart, Math.min(28, XMP_PREFIX.length + 2));
        if (prefix.startsWith(XMP_PREFIX) || prefix.startsWith('http://ns.adobe')) report.hasXmp = true;
      }
    } else if (seg.marker === 0xe2) {
      if (asciiOf(bytes, seg.dataStart, 11) === 'ICC_PROFILE') report.hasIcc = true;
    }
  }
  return report;
}

// ---------------------------------------------------------------------------
// PNG chunk parsing (tEXt / iTXt text chunks)
// ---------------------------------------------------------------------------

export function readPngMetadata(bytes: Uint8Array): MetadataReport {
  const report = emptyReport();
  if (bytes.length < 33) return report;
  let offset = 8;
  let guard = 0;
  while (offset + 12 <= bytes.length && guard++ < 2048) {
    const length = ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!) >>> 0;
    const type = asciiOf(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    if (dataStart + length + 4 > bytes.length) break;
    if (type === 'tEXt') {
      let split = -1;
      for (let i = dataStart; i < dataStart + Math.min(length, 80); i++) {
        if (bytes[i] === 0) { split = i; break; }
      }
      if (split > -1) {
        const keyword = asciiOf(bytes, dataStart, split - dataStart);
        const text = asciiOf(bytes, split + 1, Math.min(length - (split - dataStart) - 1, 500));
        report.pngTextChunks.push({ keyword, text });
      }
    } else if (type === 'iTXt' && length > 5) {
      let split = -1;
      for (let i = dataStart; i < dataStart + Math.min(length, 80); i++) {
        if (bytes[i] === 0) { split = i; break; }
      }
      if (split > -1) {
        const keyword = asciiOf(bytes, dataStart, split - dataStart);
        report.pngTextChunks.push({ keyword, text: '(iTXt compressed/UTF-8 payload)' });
      }
    }
    if (type === 'IEND') break;
    offset = dataStart + length + 4;
  }
  if (report.pngTextChunks.length > 0) report.notes.push('PNG text chunks found (often editor or location hints).');
  return report;
}

export function inspectMetadata(bytes: Uint8Array, kind: ImageKind): MetadataReport {
  switch (kind) {
    case 'jpeg': return readJpegMetadata(bytes);
    case 'png': return readPngMetadata(bytes);
    case 'webp':
    case 'avif':
    case 'heic': {
      // Container-level EXIF/XMP detection for ISO-BMFF / RIFF formats.
      const report = emptyReport();
      const probe = bytes.subarray(0, Math.min(bytes.length, 256 * 1024));
      const hasExifMarker = containsAscii(probe, 'Exif') || containsAscii(probe, 'exif');
      const hasXmpMarker = containsAscii(probe, 'http://ns.adobe.com/xap');
      report.hasExif = hasExifMarker;
      report.hasXmp = hasXmpMarker;
      if (hasExifMarker) report.notes.push('EXIF data detected inside the container.');
      return report;
    }
    default:
      return emptyReport();
  }
}

function containsAscii(bytes: Uint8Array, needle: string): boolean {
  const first = needle.charCodeAt(0);
  const limit = bytes.length - needle.length;
  for (let i = 0; i <= limit; i++) {
    if (bytes[i] !== first) continue;
    let match = true;
    for (let j = 1; j < needle.length; j++) {
      if (bytes[i + j] !== needle.charCodeAt(j)) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Print density (DPI) metadata embedding
// ---------------------------------------------------------------------------

/**
 * Writes a JFIF APP0 density field (units = inches) into a JPEG copy.
 * If no JFIF APP0 exists, a minimal one is inserted right after SOI.
 * Pixels are untouched by THIS function (callers may have re-encoded already).
 */
export function patchJpegDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new EngineError('INVALID_INPUT', 'Not a JPEG file');
  }
  const clamped = Math.max(1, Math.min(65535, Math.round(dpi)));

  for (const seg of jpegSegments(bytes)) {
    if (seg.marker === 0xe0 && asciiOf(bytes, seg.dataStart, 5) === 'JFIF\u0000') {
      const out = bytes.slice();
      out[seg.dataStart + 7] = 1; // units: dots per inch
      out[seg.dataStart + 8] = (clamped >> 8) & 0xff;
      out[seg.dataStart + 9] = clamped & 0xff;
      out[seg.dataStart + 10] = (clamped >> 8) & 0xff;
      out[seg.dataStart + 11] = clamped & 0xff;
      return out;
    }
  }

  // Insert a minimal JFIF APP0 after SOI.
  const app0 = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00, // 'JFIF\0'
    0x01, 0x01, // version 1.1
    0x01, // units: inches
    (clamped >> 8) & 0xff, clamped & 0xff,
    (clamped >> 8) & 0xff, clamped & 0xff,
    0x00, 0x00, // no thumbnail
  ]);
  const out = new Uint8Array(bytes.length + app0.length);
  out.set(bytes.subarray(0, 2), 0);
  out.set(app0, 2);
  out.set(bytes.subarray(2), 2 + app0.length);
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Inserts a pHYs chunk (pixels per meter, unit = 1) into a PNG copy. */
export function insertPngPhys(bytes: Uint8Array, dpi: number): Uint8Array {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== sig[i]) throw new EngineError('INVALID_INPUT', 'Not a PNG file');
  }
  const ppm = Math.max(1, Math.round(dpi / 0.0254));
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // 'pHYs'
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1; // unit: metre
  const crc = crc32(chunk.subarray(4, 17));
  view.setUint32(17, crc);

  // Insert after IHDR (fixed position for valid PNGs: 8 sig + 25 IHDR block).
  const insertAt = 33;
  if (bytes.length < insertAt) throw new EngineError('CORRUPT_FILE', 'PNG structure is too short');
  const out = new Uint8Array(bytes.length + chunk.length);
  out.set(bytes.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(bytes.subarray(insertAt), insertAt + chunk.length);
  return out;
}

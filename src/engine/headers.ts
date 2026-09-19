/**
 * File header sniffing and dimension parsing.
 * Pure byte-level functions — no DOM, fully unit-testable.
 *
 * We never trust file extensions. Format decisions come from magic bytes and
 * header structure; the parse functions are defensive against malformed input.
 */

export type ImageKind =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'heic'
  | 'gif'
  | 'bmp'
  | 'svg'
  | 'tiff'
  | 'unknown';

export interface Dimensions {
  width: number;
  height: number;
}

const ascii = (bytes: Uint8Array, start: number, length: number): string => {
  let out = '';
  for (let i = start; i < start + length && i < bytes.length; i++) out += String.fromCharCode(bytes[i]!);
  return out;
};

const u16be = (b: Uint8Array, i: number): number => (b[i]! << 8) | b[i + 1]!;
const u16le = (b: Uint8Array, i: number): number => b[i]! | (b[i + 1]! << 8);
const u24le = (b: Uint8Array, i: number): number => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
const u32be = (b: Uint8Array, i: number): number =>
  (b[i]! << 24 | b[i + 1]! << 16 | b[i + 2]! << 8 | b[i + 3]!) >>> 0;
const u32le = (b: Uint8Array, i: number): number =>
  (b[i]! | b[i + 1]! << 8 | b[i + 2]! << 16 | b[i + 3]! << 24) >>> 0;

export function sniffKind(bytes: Uint8Array): ImageKind {
  if (bytes.length < 12) {
    // Small files can still be tiny valid images (e.g. 1x1 GIF is 35 bytes; guard lengths inside).
    if (bytes.length < 4) return 'unknown';
  }
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  // PNG
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'png';
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
  // BMP
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'bmp';
  // RIFF....WEBP
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp';
  // ISO-BMFF based: ftyp box with brand
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4);
    if (brand === 'avif' || brand === 'avis') return 'avif';
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis'].includes(brand)) return 'heic';
  }
  // TIFF
  if ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)) return 'tiff';
  // SVG (text based)
  const head = ascii(bytes, 0, Math.min(bytes.length, 1024)).toLowerCase();
  if (head.includes('<svg')) return 'svg';
  return 'unknown';
}

export function mimeForKind(kind: ImageKind): string | null {
  switch (kind) {
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'avif': return 'image/avif';
    case 'heic': return 'image/heic';
    case 'gif': return 'image/gif';
    case 'bmp': return 'image/bmp';
    case 'svg': return 'image/svg+xml';
    case 'tiff': return 'image/tiff';
    default: return null;
  }
}

export function kindLabel(kind: ImageKind): string {
  switch (kind) {
    case 'jpeg': return 'JPEG';
    case 'png': return 'PNG';
    case 'webp': return 'WebP';
    case 'avif': return 'AVIF';
    case 'heic': return 'HEIC/HEIF';
    case 'gif': return 'GIF';
    case 'bmp': return 'BMP';
    case 'svg': return 'SVG';
    case 'tiff': return 'TIFF';
    default: return 'Unknown';
  }
}

/** Formats this toolkit can process end-to-end (decode/transform/re-encode as raster). */
export const SUPPORTED_KINDS: ImageKind[] = ['jpeg', 'png', 'webp', 'avif', 'gif', 'bmp'];

/** Formats decodable only when the browser itself supports them. */
export const CONDITIONALLY_DECODABLE: ImageKind[] = ['heic'];

function jpegDimensions(bytes: Uint8Array): Dimensions | null {
  let i = 2;
  // Walk marker segments. Bail out if structure looks wrong (corrupt file).
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    let marker = bytes[i + 1]!;
    while (marker === 0xff && i + 2 < bytes.length) { i++; marker = bytes[i + 1]!; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    if (marker === 0xd9 || marker === 0xda) return null; // EOI / start of scan without SOF
    const segLen = u16be(bytes, i + 2);
    if (segLen < 2) return null;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      const height = u16be(bytes, i + 5);
      const width = u16be(bytes, i + 7);
      if (width > 0 && height > 0) return { width, height };
      return null;
    }
    i += 2 + segLen;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): Dimensions | null {
  const chunk = ascii(bytes, 12, 4);
  if (chunk === 'VP8X' && bytes.length >= 30) {
    const width = u24le(bytes, 24) + 1;
    const height = u24le(bytes, 27) + 1;
    return { width, height };
  }
  if (chunk === 'VP8 ' && bytes.length >= 30) {
    const start = 12 + 8;
    const sig0 = bytes[start + 3], sig1 = bytes[start + 4], sig2 = bytes[start + 5];
    if (sig0 === 0x9d && sig1 === 0x01 && sig2 === 0x2a) {
      const width = u16le(bytes, start + 6) & 0x3fff;
      const height = u16le(bytes, start + 8) & 0x3fff;
      if (width > 0 && height > 0) return { width, height };
    }
    return null;
  }
  if (chunk === 'VP8L' && bytes.length >= 25) {
    if (bytes[20] !== 0x2f) return null;
    const b = u32le(bytes, 21);
    const width = (b & 0x3fff) + 1;
    const height = ((b >> 14) & 0x3fff) + 1;
    if (width > 0 && height > 0) return { width, height };
  }
  return null;
}

function avifDimensions(bytes: Uint8Array): Dimensions | null {
  // Naive but bounded scan for an `ispe` box (image spatial extents).
  const needle = [0x69, 0x73, 0x70, 0x65]; // 'ispe'
  const limit = Math.min(bytes.length - 12, 512 * 1024);
  for (let i = 4; i < limit; i++) {
    if (bytes[i] === needle[0] && bytes[i + 1] === needle[1] && bytes[i + 2] === needle[2] && bytes[i + 3] === needle[3]) {
      const width = u32be(bytes, i + 8);
      const height = u32be(bytes, i + 12);
      if (width > 0 && width <= 65535 && height > 0 && height <= 65535) return { width, height };
    }
  }
  return null;
}

export function readDimensions(bytes: Uint8Array, kind: ImageKind): Dimensions | null {
  try {
    switch (kind) {
      case 'png':
        if (bytes.length >= 24) {
          const width = u32be(bytes, 16);
          const height = u32be(bytes, 20);
          if (width > 0 && height > 0) return { width, height };
        }
        return null;
      case 'jpeg':
        return jpegDimensions(bytes);
      case 'webp':
        return webpDimensions(bytes);
      case 'gif':
        if (bytes.length >= 10) {
          const width = u16le(bytes, 6);
          const height = u16le(bytes, 8);
          if (width > 0 && height > 0) return { width, height };
        }
        return null;
      case 'bmp':
        if (bytes.length >= 26) {
          const width = u32le(bytes, 18);
          const height = Math.abs(u32le(bytes, 22) | 0);
          if (width > 0 && height > 0) return { width, height };
        }
        return null;
      case 'avif':
        return avifDimensions(bytes);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** PNG alpha capability from IHDR color type (4 = gray+alpha, 6 = RGBA). */
export function pngMayHaveAlpha(bytes: Uint8Array): boolean {
  if (bytes.length < 26) return false;
  const colorType = bytes[25]!;
  return colorType === 4 || colorType === 6;
}

/** WebP extended-format alpha flag (VP8X, bit 4 of flags byte at offset 20). */
export function webpMayHaveAlpha(bytes: Uint8Array): boolean {
  if (ascii(bytes, 12, 4) !== 'VP8X' || bytes.length < 21) return false;
  return (bytes[20]! & 0x10) !== 0;
}

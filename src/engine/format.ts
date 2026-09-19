/**
 * Formatting, unit parsing and filename helpers. Pure functions — unit-tested.
 */

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/** Formats bytes with binary units (1 KB = 1024 B), matching file-manager conventions. */
export function formatBytes(bytes: number, opts?: { decimals?: number }): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const decimals = opts?.decimals ?? (value >= 100 ? 0 : 1);
  return `${trimZeros(value.toFixed(decimals))} ${UNITS[unit]}`;
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/**
 * Parses human size input like "50 kb", "1.5 MB", "200k", "0,5 mb" into bytes.
 * Returns null when unparseable. Uses binary units to match formatBytes.
 */
export function parseSizeToBytes(input: string): number | null {
  const cleaned = input.trim().toLowerCase().replace(/,/g, '.').replace(/\s+/g, '');
  const m = /^(\d+(?:\.\d+)?)(b|kb|k|mb|m|gb|g)?$/.exec(cleaned);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = m[2] ?? 'kb'; // bare numbers in this domain conventionally mean KB
  switch (unit) {
    case 'b': return Math.round(value);
    case 'kb': case 'k': return Math.round(value * 1024);
    case 'mb': case 'm': return Math.round(value * 1024 * 1024);
    case 'gb': case 'g': return Math.round(value * 1024 * 1024 * 1024);
    default: return null;
  }
}

export function formatPercent(ratio: number, decimals = 1): string {
  if (!Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(decimals).replace(/\.0$/, '')}%`;
}

/** Reduction from original to result (positive = smaller). */
export function reductionRatio(originalBytes: number, resultBytes: number): number {
  if (originalBytes <= 0) return 0;
  return 1 - resultBytes / originalBytes;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** Human aspect-ratio label: "3:2" or "1.91:1" for awkward ratios. */
export function formatRatio(width: number, height: number): string {
  if (width <= 0 || height <= 0) return '—';
  const g = gcd(width, height);
  const rw = Math.round(width / g);
  const rh = Math.round(height / g);
  if (rw <= 60 && rh <= 60) return `${rw}:${rh}`;
  const ratio = width / height;
  return ratio >= 1 ? `${ratio.toFixed(2)}:1` : `1:${(1 / ratio).toFixed(2)}`;
}

export function megapixels(width: number, height: number): string {
  const mp = (width * height) / 1_000_000;
  const decimals = mp < 100 ? 1 : 0;
  return `${mp.toFixed(decimals)} MP`;
}

export interface PrintSize {
  inches: { width: number; height: number };
  cm: { width: number; height: number };
}

export function printSize(width: number, height: number, dpi: number): PrintSize | null {
  if (dpi <= 0) return null;
  const inches = { width: width / dpi, height: height / dpi };
  return {
    inches,
    cm: { width: inches.width * 2.54, height: inches.height * 2.54 },
  };
}

export function formatInches(v: number): string {
  return `${v.toFixed(v < 10 ? 2 : 1)} in`;
}

export function formatCm(v: number): string {
  return `${v.toFixed(v < 10 ? 1 : 0)} cm`;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
};

export function extensionForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? 'img';
}

/** Strips a trailing file extension (image or not) for output naming. */
export function baseName(fileName: string): string {
  const clean = fileName.replace(/\\/g, '/').split('/').pop() ?? fileName;
  return clean.replace(/\.[a-z0-9]{1,5}$/i, '');
}

/** Sanitize a user filename into a safe download fragment. */
export function sanitizeName(name: string): string {
  const cleaned = baseName(name)
    .trim()
    .replace(/[^\w\-. ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return cleaned || 'image';
}

/** Builds understandable download names like "photo-compressed.jpg". */
export function outputFilename(originalName: string, suffix: string, mime: string): string {
  const base = sanitizeName(originalName);
  const ext = extensionForMime(mime);
  return `${base}-${suffix}.${ext}`;
}

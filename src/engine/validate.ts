/**
 * File-level validation — runs BEFORE any decode. Pure and unit-tested.
 * Treats every input as hostile: no trust in extensions, no unbounded work.
 */

import { EngineError } from './errors';
import {
  sniffKind, mimeForKind, readDimensions, kindLabel,
  SUPPORTED_KINDS, CONDITIONALLY_DECODABLE,
  type ImageKind, type Dimensions,
} from './headers';

export interface FileMeta {
  name: string;
  size: number;
}

export interface Limits {
  warnFileBytes: number;
  maxFileBytes: number;
  warnPixels: number;
  maxPixels: number;
}

export interface ValidationResult {
  kind: ImageKind;
  mime: string | null;
  dims: Dimensions | null;
  /** True when extension and content disagree. */
  extensionMismatch: boolean;
  warnings: string[];
}

const EXT_KIND: Record<string, ImageKind> = {
  jpg: 'jpeg', jpeg: 'jpeg', jpe: 'jpeg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  heic: 'heic', heif: 'heic',
  gif: 'gif',
  bmp: 'bmp',
  svg: 'svg',
  tif: 'tiff', tiff: 'tiff',
};

const MB = 1024 * 1024;

export function validateFileMeta(meta: FileMeta, head: Uint8Array, limits: Limits): ValidationResult {
  if (meta.size <= 0) {
    throw new EngineError('EMPTY_FILE', 'File is empty');
  }
  if (meta.size > limits.maxFileBytes) {
    throw new EngineError('FILE_TOO_LARGE', 'File exceeds the safety limit');
  }

  const kind = sniffKind(head);
  const warnings: string[] = [];

  if (kind === 'svg') {
    throw new EngineError(
      'UNSUPPORTED_FORMAT',
      'SVG is vector art',
      'This toolkit works on raster images (JPEG, PNG, WebP, AVIF, GIF, BMP). SVG is vector — resizing it is lossless by definition and it rarely needs compression.',
    );
  }
  if (kind === 'tiff') {
    throw new EngineError('UNSUPPORTED_FORMAT', 'TIFF is not supported by browser decoders', 'TIFF files are usually archival or print-scan formats. Convert the TIFF to PNG or JPEG on the device that created it, then come back.');
  }

  const supported = SUPPORTED_KINDS.includes(kind) || CONDITIONALLY_DECODABLE.includes(kind);
  if (!supported) {
    throw new EngineError('CORRUPT_FILE', 'Unknown file signature', 'The first bytes of the file do not match any image format this tool recognizes. If this is supposed to be an image, the file may be corrupted or only partially downloaded.');
  }

  const dims = readDimensions(head, kind);

  if (dims) {
    const pixels = dims.width * dims.height;
    if (pixels > limits.maxPixels) {
      throw new EngineError(
        'TOO_MANY_PIXELS',
        'Image exceeds the safe pixel budget',
        `${dims.width.toLocaleString()} x ${dims.height.toLocaleString()} px (about ${(pixels / 1_000_000).toFixed(0)} megapixels)`,
      );
    }
    if (pixels > limits.warnPixels) {
      warnings.push(`Very large image (${(pixels / 1_000_000).toFixed(0)} megapixels) — processing may take a while on this device.`);
    }
  }

  if (meta.size > limits.warnFileBytes) {
    warnings.push(`Large file (${(meta.size / MB).toFixed(0)} MB) — decoding may take a moment.`);
  }

  const extMatch = /\.([a-z0-9]+)$/i.exec(meta.name);
  const extKind = extMatch?.[1] ? EXT_KIND[extMatch[1].toLowerCase()] : undefined;
  let extensionMismatch = false;
  if (extKind && extKind !== kind && !(extKind === 'heic' && kind === 'avif')) {
    // avif/heic share the ftyp container; treat that pairing as consistent.
    extensionMismatch = true;
    warnings.push(`The file extension (.${extMatch![1]!.toLowerCase()}) does not match the actual content (${kindLabel(kind)}). The content is what matters — proceeding with ${kindLabel(kind)}.`);
  }

  return { kind, mime: mimeForKind(kind), dims, extensionMismatch, warnings };
}

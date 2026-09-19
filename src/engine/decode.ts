/**
 * Decoding layer (browser only).
 * Strategy: header validation first (cheap, safe), then createImageBitmap,
 * then an <img> fallback for older engines. Original files are never mutated.
 */

import { EngineError, toEngineError } from './errors';
import { validateFileMeta, type Limits, type ValidationResult } from './validate';
import { kindLabel } from './headers';

export const HEAD_BYTES = 512 * 1024;

export interface DecodedImage {
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  kind: ValidationResult['kind'];
  mime: string | null;
  warnings: string[];
}

export async function readHead(file: File): Promise<Uint8Array> {
  try {
    const slice = file.slice(0, HEAD_BYTES);
    return new Uint8Array(await slice.arrayBuffer());
  } catch (err) {
    throw new EngineError('READ_FAILED', 'Could not read the beginning of the file', String(err));
  }
}

async function decodeWithBitmap(file: File): Promise<ImageBitmap> {
  // imageOrientation "from-image" respects EXIF rotation; the options form is
  // not supported by very old engines, so fall back to the plain call.
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image', premultiplyAlpha: 'default' } as ImageBitmapOptions);
  } catch (err) {
    if (err instanceof TypeError) {
      return await createImageBitmap(file);
    }
    throw err;
  }
}

function decodeWithImgElement(file: File): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const revoke = () => URL.revokeObjectURL(url);
    img.onload = () => resolve({ img, revoke });
    img.onerror = () => {
      revoke();
      reject(new EngineError('DECODE_FAILED', 'The <img> decoder rejected the file'));
    };
    img.src = url;
  });
}

export async function decodeFile(file: File, limits: Limits): Promise<DecodedImage> {
  const head = await readHead(file);
  const meta = validateFileMeta({ name: file.name, size: file.size }, head, limits);

  let source: ImageBitmap | HTMLImageElement;
  let revoke: (() => void) | null = null;
  try {
    source = await decodeWithBitmap(file);
  } catch (firstErr) {
    try {
      const { img, revoke: revokeFn } = await decodeWithImgElement(file);
      source = img;
      revoke = revokeFn;
    } catch {
      if (meta.kind === 'heic') {
        throw new EngineError('HEIC_UNSUPPORTED', 'HEIC decode failed in this browser');
      }
      const e = toEngineError(firstErr);
      throw new EngineError(
        'DECODE_FAILED',
        `The browser decoder rejected this ${kindLabel(meta.kind)} file`,
        e.message,
      );
    }
  }

  const width = source.width;
  const height = source.height;
  const warnings = [...meta.warnings];

  if (meta.dims && (meta.dims.width !== width || meta.dims.height !== height)) {
    // EXIF orientation 5–8 rotates the image 90°, so decoded dimensions are
    // legitimately swapped versus the header. That is normal camera behavior —
    // not a malformed file.
    const swapped = meta.dims.width === height && meta.dims.height === width;
    if (!swapped) {
      warnings.push(
        `Header reports ${meta.dims.width}x${meta.dims.height} but decoding produced ${width}x${height}. The file may be malformed — verify the result before relying on it.`,
      );
    } else {
      warnings.push(
        `Dimensions were adjusted to match the photo's EXIF orientation (rotated to its correct upright view: ${width} × ${height} px).`,
      );
    }
  }

  // Late pixel guard for formats without header dimensions (e.g., AVIF edge cases).
  if (width * height > limits.maxPixels) {
    if (source instanceof ImageBitmap) source.close();
    revoke?.();
    throw new EngineError('TOO_MANY_PIXELS', 'Decoded image exceeds the safe pixel budget');
  }

  return { source, width, height, kind: meta.kind, mime: meta.mime, warnings };
}

/** Frees GPU/CPU memory held by a decoded image. */
export function releaseDecoded(decoded: DecodedImage | null): void {
  if (!decoded) return;
  if (decoded.source instanceof ImageBitmap) {
    try { decoded.source.close(); } catch { /* already closed */ }
  }
}

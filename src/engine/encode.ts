/**
 * Encoding layer (browser only).
 * Every offered output format is probed at runtime — nothing is advertised
 * that the current browser cannot actually write.
 */

import { EngineError, toEngineError } from './errors';
import type { AnyCanvas } from './transform';

export type OutputMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

export interface EncodeSupport {
  jpeg: boolean;
  png: boolean;
  webp: boolean;
  avif: boolean;
}

let cachedSupport: EncodeSupport | null = null;

/** Detects which encoders the browser actually provides. Cached; cheap. */
export function probeEncodeSupport(): EncodeSupport {
  if (cachedSupport) return cachedSupport;
  const support: EncodeSupport = { jpeg: true, png: true, webp: false, avif: false };
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 1, 1);
      try { support.webp = canvas.toDataURL('image/webp').startsWith('data:image/webp'); } catch { support.webp = false; }
      try { support.avif = canvas.toDataURL('image/avif').startsWith('data:image/avif'); } catch { support.avif = false; }
    }
  } catch {
    // If even the probe fails, JPEG/PNG stay as the safe defaults.
  }
  cachedSupport = support;
  return support;
}

function blobFromOffscreen(canvas: OffscreenCanvas, mime: OutputMime, quality?: number): Promise<Blob> {
  const options: ImageEncodeOptions = { type: mime };
  if (quality !== undefined && mime !== 'image/png') options.quality = quality;
  return canvas.convertToBlob(options);
}

function blobFromElement(canvas: HTMLCanvasElement, mime: OutputMime, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new EngineError('ENCODE_UNSUPPORTED', `toBlob returned null for ${mime}`))),
        mime,
        quality,
      );
    } catch (err) {
      reject(toEngineError(err));
    }
  });
}

/**
 * Encodes a canvas to a Blob in the requested format.
 * Verifies the blob's actual MIME type: browsers silently fall back (usually to PNG)
 * for unsupported types — that fallback must surface as an error, not a wrong file.
 */
export async function canvasToBlob(canvas: AnyCanvas, mime: OutputMime, quality?: number): Promise<Blob> {
  let blob: Blob;
  try {
    blob = canvas instanceof OffscreenCanvas
      ? await blobFromOffscreen(canvas, mime, quality)
      : await blobFromElement(canvas as HTMLCanvasElement, mime, quality);
  } catch (err) {
    throw toEngineError(err);
  }
  if (blob.type && blob.type !== mime) {
    throw new EngineError(
      'ENCODE_UNSUPPORTED',
      `Browser returned ${blob.type} instead of ${mime}`,
      `Your browser does not provide a ${mime.replace('image/', '').toUpperCase()} encoder. Choose JPEG, PNG or WebP instead.`,
    );
  }
  return blob;
}

export async function canvasToBytes(canvas: AnyCanvas, mime: OutputMime, quality?: number): Promise<Uint8Array> {
  const blob = await canvasToBlob(canvas, mime, quality);
  return new Uint8Array(await blob.arrayBuffer());
}

export function qualityCeilingFor(mime: OutputMime): number | null {
  switch (mime) {
    case 'image/jpeg': return 0.95;
    case 'image/webp': return 0.95;
    case 'image/avif': return 0.9;
    case 'image/png': return null; // lossless — no quality dimension
  }
}

export function mimeLabel(mime: OutputMime | string): string {
  return mime.replace('image/', '').replace('jpeg', 'JPG').toUpperCase();
}

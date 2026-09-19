/**
 * Engine error taxonomy — every failure path maps to a specific, user-facing message.
 * No generic "something went wrong" allowed here.
 */

export type EngineErrorCode =
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'HEIC_UNSUPPORTED'
  | 'CORRUPT_FILE'
  | 'DECODE_FAILED'
  | 'TOO_MANY_PIXELS'
  | 'ENCODE_UNSUPPORTED'
  | 'TARGET_UNREACHABLE'
  | 'INVALID_INPUT'
  | 'READ_FAILED'
  | 'UNKNOWN';

export class EngineError extends Error {
  readonly code: EngineErrorCode;
  readonly detail?: string;

  constructor(code: EngineErrorCode, message: string, detail?: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
    this.detail = detail;
  }
}

export interface UserFacingError {
  title: string;
  body: string;
}

const MB = 1024 * 1024;

export function toEngineError(err: unknown): EngineError {
  if (err instanceof EngineError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new EngineError('UNKNOWN', message);
}

/** Maps engine errors to precise, actionable copy. Never returns a generic fallback for known codes. */
export function userMessage(err: unknown, context?: { maxFileBytes?: number; fileName?: string }): UserFacingError {
  const e = toEngineError(err);
  const maxMB = Math.round((context?.maxFileBytes ?? 200 * MB) / MB);

  switch (e.code) {
    case 'EMPTY_FILE':
      return {
        title: 'That file is empty',
        body: 'The file contains 0 bytes, so there is no image to read. Re-export or re-download the original and try again.',
      };
    case 'FILE_TOO_LARGE':
      return {
        title: `File is larger than the ${maxMB} MB safety limit`,
        body: 'This limit protects your browser from running out of memory. Try compressing the image on the device that created it, or use a smaller source file.',
      };
    case 'TOO_MANY_PIXELS':
      return {
        title: 'Image dimensions are too large to process safely',
        body: `${e.detail ?? 'The image'} exceeds what can be reliably decoded in a browser tab. Very large images can crash the tab on memory-constrained devices, so the tool stops before trying. A desktop browser has the best chance, but the image itself may need to be resized upstream.`,
      };
    case 'HEIC_UNSUPPORTED':
      return {
        title: 'This browser cannot decode HEIC/HEIF images',
        body: 'HEIC is Apple\u2019s default camera format, and most browsers besides Safari cannot read it. Options: open this page in Safari, or set your camera to "Most Compatible" (JPEG) for future photos, or convert the HEIC file on the device that created it.',
      };
    case 'UNSUPPORTED_FORMAT':
      return {
        title: 'Unrecognized image format',
        body: 'Supported inputs are JPEG, PNG, WebP, AVIF, GIF and BMP. If this file is an image, it may use a format this browser cannot read (such as TIFF or an unusual RAW variant).',
        detail: undefined,
      } as UserFacingError;
    case 'CORRUPT_FILE':
      return {
        title: 'The file looks corrupted or is not an image',
        body: 'The file signature or structure is invalid, so decoding cannot start. This happens with truncated downloads, renamed non-image files, or damaged storage.',
      };
    case 'DECODE_FAILED':
      return {
        title: 'The browser could not decode this image',
        body: e.detail ?? 'The file may be corrupted, use an unsupported variant of the format, or require more memory than this device can spare.',
      };
    case 'ENCODE_UNSUPPORTED':
      return {
        title: 'This browser cannot write that format',
        body: e.detail ?? 'The requested output format is not supported by your browser\u2019s encoder. Choose JPEG, PNG or WebP instead.',
      };
    case 'TARGET_UNREACHABLE':
      return {
        title: 'The target size could not be reached',
        body: e.detail ?? 'Even at the lowest quality setting the file stays above your target. The report shows the smallest achievable size.',
      };
    case 'INVALID_INPUT':
      return {
        title: 'Check the entered values',
        body: e.detail ?? 'One of the input values is not valid for this operation.',
      };
    case 'READ_FAILED':
      return {
        title: 'The file could not be read',
        body: 'Your browser reported an error while reading the file. It may have been moved, deleted or locked by another application.',
      };
    default:
      return {
        title: 'The operation did not complete',
        body: e.message || 'An unexpected condition occurred while processing the image locally.',
      };
  }
}

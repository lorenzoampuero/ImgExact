/**
 * Resize/crop math (pure) + canvas rendering helpers (browser).
 * The math functions are unit-tested; canvas helpers run only in the browser.
 */

import { EngineError } from './errors';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeMode = 'fit' | 'stretch' | 'fill';

export interface ResizeRequest {
  mode: ResizeMode;
  width?: number;
  height?: number;
  percent?: number;
}

export interface ResizePlan {
  outWidth: number;
  outHeight: number;
  /** Source rectangle to draw from (full image unless filling). */
  source: Rect;
  mode: ResizeMode;
}

/** Browser canvas dimension ceiling — above this, rendering is unreliable. */
export const MAX_CANVAS_DIMENSION = 16384;

function clampDimension(value: number, label: string): number {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || rounded < 1) {
    throw new EngineError('INVALID_INPUT', `${label} must be a positive number`);
  }
  if (rounded > MAX_CANVAS_DIMENSION) {
    throw new EngineError('INVALID_INPUT', `${label} exceeds the safe canvas limit (${MAX_CANVAS_DIMENSION.toLocaleString()} px)`);
  }
  return rounded;
}

/** Parses "600" or "600px" into 600. Returns null for empty/invalid. */
export function parseDimension(input: string): number | null {
  const cleaned = input.trim().toLowerCase().replace(/px$/, '').trim();
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parsePercent(input: string): number | null {
  const cleaned = input.trim().replace(/%$/, '').trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 && value <= 1000 ? value : null;
}

/**
 * Computes the output size and source rectangle for a resize request.
 * - fit:     contain within bounds (keeps ratio; one dimension may be smaller)
 * - stretch: exactly the bounds
 * - fill:    exactly the bounds by center-cropping to the bounds' ratio
 */
export function computeResizePlan(srcW: number, srcH: number, req: ResizeRequest): ResizePlan {
  if (srcW <= 0 || srcH <= 0) throw new EngineError('INVALID_INPUT', 'Source dimensions are invalid');
  const full: Rect = { x: 0, y: 0, width: srcW, height: srcH };

  if (req.percent !== undefined) {
    const pct = req.percent / 100;
    return {
      outWidth: clampDimension(srcW * pct, 'Width'),
      outHeight: clampDimension(srcH * pct, 'Height'),
      source: full,
      mode: 'fit',
    };
  }

  const hasW = req.width !== undefined;
  const hasH = req.height !== undefined;
  if (!hasW && !hasH) throw new EngineError('INVALID_INPUT', 'Enter a width or a height');

  if (hasW && !hasH) {
    const w = clampDimension(req.width!, 'Width');
    const h = clampDimension((srcH / srcW) * w, 'Height');
    return { outWidth: w, outHeight: h, source: full, mode: 'fit' };
  }
  if (!hasW && hasH) {
    const h = clampDimension(req.height!, 'Height');
    const w = clampDimension((srcW / srcH) * h, 'Width');
    return { outWidth: w, outHeight: h, source: full, mode: 'fit' };
  }

  const w = clampDimension(req.width!, 'Width');
  const h = clampDimension(req.height!, 'Height');

  if (req.mode === 'stretch') {
    return { outWidth: w, outHeight: h, source: full, mode: 'stretch' };
  }

  if (req.mode === 'fill') {
    // Center-crop the source to the target ratio.
    const targetRatio = w / h;
    const srcRatio = srcW / srcH;
    let cropW: number;
    let cropH: number;
    if (srcRatio > targetRatio) {
      cropH = srcH;
      cropW = Math.round(srcH * targetRatio);
    } else {
      cropW = srcW;
      cropH = Math.round(srcW / targetRatio);
    }
    cropW = Math.max(1, Math.min(cropW, srcW));
    cropH = Math.max(1, Math.min(cropH, srcH));
    return {
      outWidth: w,
      outHeight: h,
      source: {
        x: Math.round((srcW - cropW) / 2),
        y: Math.round((srcH - cropH) / 2),
        width: cropW,
        height: cropH,
      },
      mode: 'fill',
    };
  }

  // fit (contain)
  const scale = Math.min(w / srcW, h / srcH);
  return {
    outWidth: clampDimension(srcW * scale, 'Width'),
    outHeight: clampDimension(srcH * scale, 'Height'),
    source: full,
    mode: 'fit',
  };
}

/** Clamps a requested crop rectangle to the source bounds. */
export function clampRect(rect: Rect, srcW: number, srcH: number): Rect {
  const x = Math.max(0, Math.min(Math.round(rect.x), srcW - 1));
  const y = Math.max(0, Math.min(Math.round(rect.y), srcH - 1));
  const width = Math.max(1, Math.min(Math.round(rect.width), srcW - x));
  const height = Math.max(1, Math.min(Math.round(rect.height), srcH - y));
  return { x, y, width, height };
}

/** Applies a ratio lock to a width-driven crop (height = width / ratio). */
export function ratioLockedHeight(width: number, ratio: number): number {
  return Math.max(1, Math.round(width / ratio));
}

export function ratioValue(width: number, height: number): number {
  return height <= 0 ? 1 : width / height;
}

// ---------------------------------------------------------------------------
// Canvas rendering (browser only)
// ---------------------------------------------------------------------------

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type AnyCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface CanvasHandle {
  canvas: AnyCanvas;
  ctx: AnyCanvasContext;
}

export function createCanvas(width: number, height: number): CanvasHandle {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new EngineError('DECODE_FAILED', 'Could not create a 2D rendering context');
    return { canvas, ctx };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new EngineError('DECODE_FAILED', 'Could not create a 2D rendering context');
  return { canvas, ctx };
}

export interface DrawOptions {
  /** When set, fills the canvas with this color first (required for flattening alpha into JPEG). */
  background?: string | null;
  /** Optional pre-drawn canvas target; a fresh canvas is created otherwise. */
  target?: CanvasHandle;
}

/** Renders a plan to a canvas. The source image is never mutated. */
export function drawPlan(source: CanvasImageSource, plan: ResizePlan, opts?: DrawOptions): CanvasHandle {
  const handle = opts?.target ?? createCanvas(plan.outWidth, plan.outHeight);
  const { ctx } = handle;

  // High-quality smoothing where supported.
  const ctxWithQuality = ctx as CanvasRenderingContext2D;
  if ('imageSmoothingEnabled' in ctxWithQuality) {
    ctxWithQuality.imageSmoothingEnabled = true;
  }
  if ('imageSmoothingQuality' in ctxWithQuality) {
    ctxWithQuality.imageSmoothingQuality = 'high';
  }

  if (opts?.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, plan.outWidth, plan.outHeight);
  }

  const { source: s } = plan;
  ctx.drawImage(source, s.x, s.y, s.width, s.height, 0, 0, plan.outWidth, plan.outHeight);
  return handle;
}

/** Renders a crop rectangle at 100% (output size = crop size). */
export function drawCrop(source: CanvasImageSource, rect: Rect, opts?: DrawOptions): CanvasHandle {
  const plan: ResizePlan = {
    outWidth: rect.width,
    outHeight: rect.height,
    source: rect,
    mode: 'stretch',
  };
  return drawPlan(source, plan, opts);
}

/**
 * Renders the image scaled to fit (contain) inside a fixed canvas, centered,
 * optionally on a solid background. Used when the output canvas must have
 * exact dimensions without cropping (e.g., signature forms) and without stretch.
 */
export function drawContainFit(
  source: CanvasImageSource,
  targetWidth: number,
  targetHeight: number,
  background?: string | null,
): CanvasHandle {
  const handle = createCanvas(targetWidth, targetHeight);
  const { ctx } = handle;
  const ctxWithQuality = ctx as CanvasRenderingContext2D;
  if ('imageSmoothingEnabled' in ctxWithQuality) ctxWithQuality.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctxWithQuality) ctxWithQuality.imageSmoothingQuality = 'high';

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  const sw = Number((source as { width?: number }).width ?? 0);
  const sh = Number((source as { height?: number }).height ?? 0);
  if (sw > 0 && sh > 0) {
    const scale = Math.min(targetWidth / sw, targetHeight / sh);
    const dw = Math.max(1, Math.round(sw * scale));
    const dh = Math.max(1, Math.round(sh * scale));
    const dx = Math.floor((targetWidth - dw) / 2);
    const dy = Math.floor((targetHeight - dh) / 2);
    ctx.drawImage(source, 0, 0, sw, sh, dx, dy, dw, dh);
  }
  return handle;
}

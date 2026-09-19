/**
 * Crop tool — visual drag frame + exact numeric controls (keyboard-friendly),
 * ratio locks, output = crop rectangle at 100%.
 */
import { decodeFile, releaseDecoded, type DecodedImage } from '../../engine/decode';
import { clampRect, drawCrop, type Rect } from '../../engine/transform';
import { canvasToBlob, probeEncodeSupport, type OutputMime } from '../../engine/encode';
import { outputFilename } from '../../engine/format';
import { userMessage } from '../../engine/errors';
import { kindLabel } from '../../engine/headers';
import { SITE } from '../../config/site';
import { initDropzone } from '../ui/dropzone';
import { renderResult } from '../ui/result';
import { qs, setStatus } from '../ui/dom';
import { relatedLinks } from '../ui/related';

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));
const HANDLE_HIT = 26; // display px

export default function init(root: HTMLElement): void {
  const slug = root.dataset.tool ?? 'crop-image';
  const resultEl = qs<HTMLElement>(root, '[data-role="result"]');
  const runBtn = qs<HTMLButtonElement>(root, '[data-role="run"]');
  const stage = qs<HTMLElement>(root, '[data-role="crop-stage"]');
  const canvas = qs<HTMLCanvasElement>(root, '[data-role="crop-canvas"]');
  const ratioSelect = qs<HTMLSelectElement>(root, '[data-field="ratio"]');
  const fields = {
    x: qs<HTMLInputElement>(root, '[data-field="crop-x"]'),
    y: qs<HTMLInputElement>(root, '[data-field="crop-y"]'),
    w: qs<HTMLInputElement>(root, '[data-field="crop-w"]'),
    h: qs<HTMLInputElement>(root, '[data-field="crop-h"]'),
  };
  if (!resultEl || !runBtn || !stage || !canvas || !fields.x || !fields.y || !fields.w || !fields.h) return;

  let decoded: DecodedImage | null = null;
  let currentFile: File | null = null;
  let rect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  let ratio: number | null = null;
  let viewScale = 1;
  let drag: { mode: string; startX: number; startY: number; startRect: Rect } | null = null;

  const ctx = canvas.getContext('2d');
  const dropzone = initDropzone(root, { onFile: (file) => void handleFile(file) });

  function setRect(next: Rect): void {
    if (!decoded) return;
    rect = clampRect(next, decoded.width, decoded.height);
    syncInputs();
    render();
  }

  function syncInputs(): void {
    fields.x!.value = String(rect.x);
    fields.y!.value = String(rect.y);
    fields.w!.value = String(rect.width);
    fields.h!.value = String(rect.height);
  }

  function render(): void {
    if (!decoded || !ctx) return;
    const dw = Math.max(1, Math.round(decoded.width * viewScale));
    const dh = Math.max(1, Math.round(decoded.height * viewScale));
    canvas.width = dw;
    canvas.height = dh;
    ctx.clearRect(0, 0, dw, dh);
    ctx.drawImage(decoded.source, 0, 0, dw, dh);

    const rx = rect.x * viewScale;
    const ry = rect.y * viewScale;
    const rw = rect.width * viewScale;
    const rh = rect.height * viewScale;

    // Dim outside the crop frame.
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(0, 0, dw, ry);
    ctx.fillRect(0, ry + rh, dw, dh - ry - rh);
    ctx.fillRect(0, ry, rx, rh);
    ctx.fillRect(rx + rw, ry, dw - rx - rw, rh);

    // Frame + corner handles.
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
    ctx.fillStyle = '#2563eb';
    const hs = 8;
    const handles: Array<[number, number]> = [
      [rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh],
    ];
    for (const [cx, cy] of handles) {
      ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
    }
  }

  function computeViewScale(): void {
    if (!decoded) return;
    const maxW = Math.min(stage!.clientWidth || 720, 760);
    const maxH = 440;
    viewScale = Math.min(1, maxW / decoded.width, maxH / decoded.height);
  }

  function applyRatio(nextRatio: number | null): void {
    ratio = nextRatio;
    if (!decoded || ratio === null) return;
    // Keep the current center; fit the locked ratio inside the image.
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    let w = rect.width;
    let h = Math.round(w / ratio);
    if (h > decoded.height) {
      h = decoded.height;
      w = Math.round(h * ratio);
    }
    setRect({ x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), width: w, height: h });
  }

  ratioSelect?.addEventListener('change', () => {
    const value = ratioSelect.value;
    if (value === 'free') {
      ratio = null;
      return;
    }
    applyRatio(Number(value));
  });

  for (const key of ['x', 'y', 'w', 'h'] as const) {
    fields[key]!.addEventListener('change', () => {
      if (!decoded) return;
      const parse = (v: string) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      let next: Rect = {
        x: parse(fields.x!.value),
        y: parse(fields.y!.value),
        width: parse(fields.w!.value),
        height: parse(fields.h!.value),
      };
      if (ratio !== null && key === 'w') next.height = Math.round(next.width / ratio);
      if (ratio !== null && key === 'h') next.width = Math.round(next.height * ratio);
      setRect(next);
    });
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!decoded) return;
    const bounds = canvas.getBoundingClientRect();
    // Map client coordinates to source-image pixels, robust against CSS scaling.
    const factorX = decoded.width / bounds.width;
    const factorY = decoded.height / bounds.height;
    const px = (event.clientX - bounds.left) * factorX;
    const py = (event.clientY - bounds.top) * factorY;
    const near = HANDLE_HIT * Math.max(factorX, factorY);
    const corners: Array<[string, number, number]> = [
      ['nw', rect.x, rect.y],
      ['ne', rect.x + rect.width, rect.y],
      ['sw', rect.x, rect.y + rect.height],
      ['se', rect.x + rect.width, rect.y + rect.height],
    ];
    let mode = 'move';
    for (const [name, cx, cy] of corners) {
      if (Math.abs(px - cx) <= near && Math.abs(py - cy) <= near) {
        mode = name;
        break;
      }
    }
    const inside = px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
    if (mode === 'move' && !inside) return;
    drag = { mode, startX: px, startY: py, startRect: { ...rect } };
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drag || !decoded) return;
    const bounds = canvas.getBoundingClientRect();
    const factorX = decoded.width / bounds.width;
    const factorY = decoded.height / bounds.height;
    const px = (event.clientX - bounds.left) * factorX;
    const py = (event.clientY - bounds.top) * factorY;
    const dx = px - drag.startX;
    const dy = py - drag.startY;
    const start = drag.startRect;
    let next: Rect;

    if (drag.mode === 'move') {
      next = { ...start, x: start.x + dx, y: start.y + dy };
    } else {
      let left = start.x;
      let top = start.y;
      let right = start.x + start.width;
      let bottom = start.y + start.height;
      if (drag.mode.includes('w')) left = Math.min(left + dx, right - 4);
      if (drag.mode.includes('e')) right = Math.max(right + dx, left + 4);
      if (drag.mode.includes('n')) top = Math.min(top + dy, bottom - 4);
      if (drag.mode.includes('s')) bottom = Math.max(bottom + dy, top + 4);

      let w = right - left;
      let h = bottom - top;
      if (ratio !== null) {
        // The dragged axis wins; derive the other from the locked ratio.
        if (drag.mode === 'n' || drag.mode === 's') w = h * ratio;
        else h = w / ratio;
        if (drag.mode.includes('n')) top = bottom - h;
        if (drag.mode.includes('w')) left = right - w;
      }
      next = { x: left, y: top, width: w, height: h };
    }
    setRect({ x: Math.round(next.x), y: Math.round(next.y), width: Math.round(next.width), height: Math.round(next.height) });
  });

  const endDrag = (event: PointerEvent) => {
    if (drag) {
      try { canvas.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
      drag = null;
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  window.addEventListener('resize', () => {
    if (!decoded) return;
    computeViewScale();
    render();
  });

  function reset(): void {
    releaseDecoded(decoded);
    decoded = null;
    currentFile = null;
    stage!.hidden = true;
    resultEl.hidden = true;
    dropzone.reset();
    setStatus(root, '');
  }

  async function handleFile(file: File): Promise<void> {
    resultEl.hidden = true;
    releaseDecoded(decoded);
    decoded = null;
    dropzone.setBusy(true);
    setStatus(root, 'Reading image…', 'busy');
    try {
      decoded = await decodeFile(file, SITE.limits);
      currentFile = file;
      rect = { x: 0, y: 0, width: decoded.width, height: decoded.height };
      stage!.hidden = false;
      computeViewScale();
      syncInputs();
      render();
      if (ratioSelect && ratioSelect.value !== 'free') applyRatio(Number(ratioSelect.value));
      setStatus(root, `Ready: ${decoded.width} × ${decoded.height} px. Drag the frame or type exact values.`);
    } catch (err) {
      const msg = userMessage(err, { maxFileBytes: SITE.limits.maxFileBytes });
      setStatus(root, `${msg.title} ${msg.body}`, 'error');
    } finally {
      dropzone.setBusy(false);
    }
  }

  async function run(): Promise<void> {
    if (!decoded || !currentFile) {
      setStatus(root, 'Add an image first — drop it onto the zone above.', 'error');
      return;
    }
    runBtn.disabled = true;
    dropzone.setBusy(true);
    setStatus(root, 'Cropping…', 'busy');
    await tick();
    try {
      const finalRect = clampRect(rect, decoded.width, decoded.height);
      const handle = drawCrop(decoded.source, finalRect);
      const support = probeEncodeSupport();
      let mime: OutputMime;
      if (decoded.mime === 'image/png') mime = 'image/png';
      else if (decoded.mime === 'image/webp') mime = 'image/webp';
      else if (decoded.mime === 'image/avif' && support.avif) mime = 'image/avif';
      else mime = 'image/jpeg';
      const quality = mime === 'image/png' ? undefined : 0.92;
      const blob = await canvasToBlob(handle.canvas, mime, quality);

      renderResult(resultEl, {
        heading: `Cropped to ${finalRect.width} × ${finalRect.height} px`,
        badge: { label: '✓ Cropped', kind: 'success' },
        before: { sizeBytes: currentFile.size, width: decoded.width, height: decoded.height, formatLabel: kindLabel(decoded.kind) },
        after: { sizeBytes: blob.size, width: finalRect.width, height: finalRect.height, formatLabel: mime.replace('image/', '').toUpperCase() },
        details: [
          ['Crop region', `x ${finalRect.x}, y ${finalRect.y}, ${finalRect.width} × ${finalRect.height} px`],
          ['Output', 'crop region at 100% (no scaling)'],
        ],
        previewBlob: blob,
        previewAlt: 'Cropped result preview',
        download: { blob, filename: outputFilename(currentFile.name, `cropped-${finalRect.width}x${finalRect.height}`, mime), label: 'Download cropped image' },
        onReset: reset,
        related: relatedLinks(slug),
      });
      setStatus(root, '');
    } catch (err) {
      const msg = userMessage(err);
      setStatus(root, `${msg.title} ${msg.body}`, 'error');
    } finally {
      runBtn.disabled = false;
      dropzone.setBusy(false);
    }
  }

  runBtn.addEventListener('click', () => void run());
}

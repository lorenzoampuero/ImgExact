/**
 * DPI tool — honest dual mode:
 * 1) Calculate print size / required pixels (pure math, live).
 * 2) Embed print-density metadata (JFIF for JPEG, pHYs for PNG) without touching pixels.
 */
import { decodeFile, releaseDecoded, type DecodedImage } from '../../engine/decode';
import { drawPlan } from '../../engine/transform';
import { canvasToBytes, type OutputMime } from '../../engine/encode';
import { patchJpegDpi, insertPngPhys } from '../../engine/metadata';
import { formatBytes, printSize, formatInches, formatCm, outputFilename } from '../../engine/format';
import { userMessage } from '../../engine/errors';
import { kindLabel } from '../../engine/headers';
import { SITE } from '../../config/site';
import { initDropzone } from '../ui/dropzone';
import { renderResult } from '../ui/result';
import { inputValue, qs, qsMaybe, radioValue, setStatus } from '../ui/dom';
import { relatedLinks } from '../ui/related';

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

export default function init(root: HTMLElement): void {
  const slug = root.dataset.tool ?? 'image-dpi';
  const resultEl = qs<HTMLElement>(root, '[data-role="result"]');
  const calcFields = qsMaybe<HTMLElement>(root, '[data-field="calc-fields"]');
  const setFields = qsMaybe<HTMLElement>(root, '[data-field="set-fields"]');
  const calcOut = qs<HTMLElement>(root, '[data-role="calc-out"]');
  const applyBtn = qs<HTMLButtonElement>(root, '[data-role="apply-dpi"]');
  if (!resultEl || !calcOut || !applyBtn) return;

  let decoded: DecodedImage | null = null;
  let currentFile: File | null = null;

  const dropzone = initDropzone(root, { onFile: (file) => void handleFile(file) });

  for (const radio of root.querySelectorAll<HTMLInputElement>('input[name="dpi-mode"]')) {
    radio.addEventListener('change', () => {
      const mode = radioValue(root, 'dpi-mode');
      if (calcFields) calcFields.hidden = mode !== 'calc';
      if (setFields) setFields.hidden = mode !== 'set';
      updateCalc();
    });
  }

  for (const field of ['dpi', 'print-width', 'print-height']) {
    qs<HTMLInputElement>(root, `[data-field="${field}"]`)?.addEventListener('input', updateCalc);
  }

  function updateCalc(): void {
    if (!decoded) {
      calcOut!.textContent = 'Add an image to see its print sizes.';
      return;
    }
    const dpi = Number(inputValue(root, 'dpi')) || 300;
    const ps = printSize(decoded.width, decoded.height, dpi);
    const parts: string[] = [];
    if (ps) {
      parts.push(`At ${dpi} DPI your image prints at ${formatInches(ps.inches.width)} × ${formatInches(ps.inches.height)} (${formatCm(ps.cm.width)} × ${formatCm(ps.cm.height)}).`);
    }
    const inW = Number(inputValue(root, 'print-width'));
    const inH = Number(inputValue(root, 'print-height'));
    if (inW > 0 && inH > 0) {
      const needW = Math.ceil(inW * dpi);
      const needH = Math.ceil(inH * dpi);
      const sufficient = decoded.width >= needW && decoded.height >= needH;
      parts.push(
        `For ${inW} × ${inH} in at ${dpi} DPI you need ${needW} × ${needH} px — your image has ${decoded.width} × ${decoded.height} px (${sufficient ? 'sufficient ✓' : 'NOT sufficient — it would be interpolated'}).`,
      );
    }
    calcOut!.textContent = parts.join(' ');
  }

  function reset(): void {
    releaseDecoded(decoded);
    decoded = null;
    currentFile = null;
    resultEl.hidden = true;
    applyBtn!.disabled = true;
    dropzone.reset();
    setStatus(root, '');
    updateCalc();
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
      const supported = decoded.kind === 'jpeg' || decoded.kind === 'png';
      applyBtn!.disabled = !supported;
      setStatus(
        root,
        supported
          ? `Ready: ${decoded.width} × ${decoded.height} px ${kindLabel(decoded.kind)} · ${formatBytes(file.size)}`
          : `File loaded (${kindLabel(decoded.kind)}), but DPI embedding works for JPEG and PNG. Convert first if you need the density field.`,
        supported ? 'idle' : 'error',
      );
      updateCalc();
    } catch (err) {
      const msg = userMessage(err, { maxFileBytes: SITE.limits.maxFileBytes });
      setStatus(root, `${msg.title} ${msg.body}`, 'error');
    } finally {
      dropzone.setBusy(false);
    }
  }

  async function apply(): Promise<void> {
    if (!decoded || !currentFile) {
      setStatus(root, 'Add an image first — drop it onto the zone above.', 'error');
      return;
    }
    const dpi = Number(inputValue(root, 'set-dpi')) || 300;
    applyBtn!.disabled = true;
    dropzone.setBusy(true);
    setStatus(root, `Embedding ${dpi} DPI metadata…`, 'busy');
    await tick();
    try {
      const plan = { outWidth: decoded.width, outHeight: decoded.height, source: { x: 0, y: 0, width: decoded.width, height: decoded.height }, mode: 'fit' as const };
      const handle = drawPlan(decoded.source, plan);
      let blob: Blob;
      let mime: OutputMime;
      if (decoded.kind === 'jpeg') {
        mime = 'image/jpeg';
        const bytes = await canvasToBytes(handle.canvas, mime, 0.95);
        const patched = patchJpegDpi(bytes, dpi);
        blob = new Blob([patched.buffer as ArrayBuffer], { type: mime });
      } else {
        mime = 'image/png';
        const bytes = await canvasToBytes(handle.canvas, mime);
        const patched = insertPngPhys(bytes, dpi);
        blob = new Blob([patched.buffer as ArrayBuffer], { type: mime });
      }

      renderResult(resultEl, {
        heading: `Density metadata set to ${dpi} DPI`,
        badge: { label: '✓ Metadata applied', kind: 'success' },
        before: { sizeBytes: currentFile.size, width: decoded.width, height: decoded.height, formatLabel: kindLabel(decoded.kind) },
        after: { sizeBytes: blob.size, width: decoded.width, height: decoded.height, formatLabel: mime.replace('image/', '').toUpperCase() },
        details: [
          ['Pixels', 'unchanged — no resampling'],
          ['Field written', mime === 'image/jpeg' ? 'JFIF density (dots per inch)' : 'PNG pHYs chunk (pixels per metre)'],
        ],
        download: { blob, filename: outputFilename(currentFile.name, `${dpi}dpi`, mime), label: `Download copy marked ${dpi} DPI` },
        note: {
          kind: 'info',
          body: 'This marks the intended print density for print workflows. It does not add image detail — a print app still sees the same pixels. If your print size needs more resolution, check the calculator above or resize the source.',
        },
        onReset: reset,
        related: relatedLinks(slug),
      });
      setStatus(root, '');
    } catch (err) {
      const msg = userMessage(err);
      setStatus(root, `${msg.title} ${msg.body}`, 'error');
    } finally {
      applyBtn!.disabled = false;
      dropzone.setBusy(false);
    }
  }

  applyBtn.addEventListener('click', () => void apply());
  updateCalc();
}

/**
 * Image resizer — explicit output contract (fit / fill / stretch), lock-aware
 * prefill, percentage mode, honest upscale warning.
 */
import { decodeFile, readHead, releaseDecoded, type DecodedImage } from '../../engine/decode';
import { computeResizePlan, drawPlan, parseDimension, parsePercent } from '../../engine/transform';
import { canvasToBlob, probeEncodeSupport, type OutputMime } from '../../engine/encode';
import { formatBytes, outputFilename } from '../../engine/format';
import { userMessage } from '../../engine/errors';
import { kindLabel, pngMayHaveAlpha, webpMayHaveAlpha } from '../../engine/headers';
import { SITE } from '../../config/site';
import { initDropzone } from '../ui/dropzone';
import { renderResult } from '../ui/result';
import { inputValue, qs, qsMaybe, setStatus } from '../ui/dom';
import { relatedLinks } from '../ui/related';
import { applyPrefs, watchPrefs } from '../ui/prefs';

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

export default function init(root: HTMLElement): void {
  const slug = root.dataset.tool ?? 'resize-image';
  const resultEl = qs<HTMLElement>(root, '[data-role="result"]');
  const runBtn = qs<HTMLButtonElement>(root, '[data-role="run"]');
  const unitSelect = qsMaybe<HTMLSelectElement>(root, '[data-field="unit"]');
  const pxFields = qsMaybe<HTMLElement>(root, '[data-field="px-fields"]');
  const percentFields = qsMaybe<HTMLElement>(root, '[data-field="percent-fields"]');
  const widthInput = qs<HTMLInputElement>(root, '[data-field="width"]');
  const heightInput = qs<HTMLInputElement>(root, '[data-field="height"]');
  const lockBox = qsMaybe<HTMLInputElement>(root, '[data-field="lock"]');
  const modeSelect = qsMaybe<HTMLSelectElement>(root, '[data-field="mode"]');
  if (!resultEl || !runBtn || !widthInput || !heightInput) return;

  let decoded: DecodedImage | null = null;
  let currentFile: File | null = null;

  const dropzone = initDropzone(root, { onFile: (file) => void handleFile(file) });

  unitSelect?.addEventListener('change', () => {
    const percent = unitSelect.value === 'percent';
    if (pxFields) pxFields.hidden = percent;
    if (percentFields) percentFields.hidden = !percent;
  });

  const syncRatio = (source: 'width' | 'height') => {
    if (!decoded || !lockBox?.checked) return;
    if (!widthInput.value || !heightInput.value) {
      if (source === 'width' && widthInput.value && !heightInput.value) {
        const w = parseDimension(widthInput.value);
        if (w) heightInput.value = String(Math.max(1, Math.round((decoded.height / decoded.width) * w)));
      } else if (source === 'height' && heightInput.value && !widthInput.value) {
        const h = parseDimension(heightInput.value);
        if (h) widthInput.value = String(Math.max(1, Math.round((decoded.width / decoded.height) * h)));
      }
      return;
    }
    if (source === 'width') {
      const w = parseDimension(widthInput.value);
      if (w) heightInput.value = String(Math.max(1, Math.round((decoded.height / decoded.width) * w)));
    } else {
      const h = parseDimension(heightInput.value);
      if (h) widthInput.value = String(Math.max(1, Math.round((decoded.width / decoded.height) * h)));
    }
  };

  widthInput.addEventListener('input', () => syncRatio('width'));
  heightInput.addEventListener('input', () => syncRatio('height'));

  function reset(): void {
    releaseDecoded(decoded);
    decoded = null;
    currentFile = null;
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
      widthInput.value = String(decoded.width);
      heightInput.value = String(decoded.height);
      setStatus(root, `Ready: ${decoded.width} × ${decoded.height} px ${kindLabel(decoded.kind)} · ${formatBytes(file.size)} — enter a target size below`);
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

    const unit = unitSelect?.value ?? 'px';
    let plan;
    try {
      if (unit === 'percent') {
        const pct = parsePercent(inputValue(root, 'percent'));
        if (!pct) throw new Error('Enter a percentage between 1 and 1000.');
        plan = computeResizePlan(decoded.width, decoded.height, { mode: 'fit', percent: pct });
      } else {
        const lock = Boolean(lockBox?.checked);
        let w = parseDimension(widthInput.value);
        let h = parseDimension(heightInput.value);
        if (lock && w && h) {
          // Width is authoritative when locked and both fields are filled.
          h = Math.max(1, Math.round((decoded.height / decoded.width) * w));
        }
        plan = computeResizePlan(decoded.width, decoded.height, {
          mode: (modeSelect?.value as 'fit' | 'fill' | 'stretch') ?? 'fit',
          width: w ?? undefined,
          height: h ?? undefined,
        });
      }
    } catch (err) {
      setStatus(root, err instanceof Error ? err.message : 'Check the entered values.', 'error');
      return;
    }

    runBtn.disabled = true;
    dropzone.setBusy(true);
    setStatus(root, 'Resizing…', 'busy');
    await tick();

    try {
      const support = probeEncodeSupport();
      let mime: OutputMime;
      if (decoded.mime === 'image/png') mime = 'image/png';
      else if (decoded.mime === 'image/webp') mime = 'image/webp';
      else if (decoded.mime === 'image/avif' && support.avif) mime = 'image/avif';
      else mime = 'image/jpeg';

      let background: string | null = null;
      if (mime === 'image/jpeg' && (decoded.kind === 'png' || decoded.kind === 'webp')) {
        const head = await readHead(currentFile);
        const mayAlpha = decoded.kind === 'png' ? pngMayHaveAlpha(head) : webpMayHaveAlpha(head);
        if (mayAlpha) background = '#ffffff';
      }

      const handle = drawPlan(decoded.source, plan, { background });
      const quality = mime === 'image/png' ? undefined : mime === 'image/webp' ? 0.9 : 0.92;
      const blob = await canvasToBlob(handle.canvas, mime, quality);

      const upscaled = plan.outWidth > decoded.width || plan.outHeight > decoded.height;

      renderResult(resultEl, {
        heading: `Resized to ${plan.outWidth} × ${plan.outHeight} px`,
        badge: { label: '✓ Resized', kind: 'success' },
        before: { sizeBytes: currentFile.size, width: decoded.width, height: decoded.height, formatLabel: kindLabel(decoded.kind) },
        after: { sizeBytes: blob.size, width: plan.outWidth, height: plan.outHeight, formatLabel: mime.replace('image/', '').toUpperCase() },
        details: [
          ['Mode', plan.mode === 'fit' ? (unit === 'percent' ? 'percentage' : 'fit within box') : plan.mode],
          ['Source region', plan.source.width === decoded.width && plan.source.height === decoded.height ? 'full image' : `${plan.source.width} × ${plan.source.height} px cropped from center`],
        ],
        previewBlob: blob,
        previewAlt: 'Resized result preview',
        beforePreviewBlob: currentFile,
        download: { blob, filename: outputFilename(currentFile.name, `resized-${plan.outWidth}x${plan.outHeight}`, mime), label: 'Download resized image' },
        note: upscaled
          ? { kind: 'warning', body: 'This output is larger than the original in pixels. Enlarging cannot create real detail — for print, use the size checker to compare what your pixels support.' }
          : background
            ? { kind: 'info', body: 'Transparent areas were flattened onto white because JPEG cannot store transparency.' }
            : undefined,
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

  // Restore last-used options for this tool (interface choices only — never file data).
  applyPrefs(root, slug);
  watchPrefs(root, slug);
}

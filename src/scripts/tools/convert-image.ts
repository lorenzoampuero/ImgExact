/**
 * Format converter — runtime-probed output formats, transparency flattening,
 * honest capability errors (HEIC etc. handled by the decode layer).
 */
import { decodeFile, releaseDecoded, type DecodedImage } from '../../engine/decode';
import { drawPlan } from '../../engine/transform';
import { canvasToBlob, probeEncodeSupport, type OutputMime } from '../../engine/encode';
import { formatBytes, outputFilename } from '../../engine/format';
import { userMessage } from '../../engine/errors';
import { kindLabel } from '../../engine/headers';
import { SITE } from '../../config/site';
import { initDropzone } from '../ui/dropzone';
import { renderResult } from '../ui/result';
import { qs, qsMaybe, setStatus } from '../ui/dom';
import { relatedLinks } from '../ui/related';

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

const MIME_LABEL: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/avif': 'AVIF',
};

export default function init(root: HTMLElement): void {
  const slug = root.dataset.tool ?? 'convert-image';
  const resultEl = qs<HTMLElement>(root, '[data-role="result"]');
  const runBtn = qs<HTMLButtonElement>(root, '[data-role="run"]');
  const formatSelect = qs<HTMLSelectElement>(root, '[data-field="format"]');
  const qualityRange = qsMaybe<HTMLInputElement>(root, '[data-field="quality"]');
  const qualityOut = qsMaybe<HTMLElement>(root, '[data-role="quality-out"]');
  const bgInput = qsMaybe<HTMLInputElement>(root, '[data-field="background"]');
  if (!resultEl || !runBtn || !formatSelect) return;

  let decoded: DecodedImage | null = null;
  let currentFile: File | null = null;

  // Probe encoders once and disable unsupported options — nothing offered that fails later.
  const support = probeEncodeSupport();
  for (const option of Array.from(formatSelect.options)) {
    const probe = option.dataset.probe as 'webp' | 'avif' | undefined;
    if (!probe) continue;
    const supported = probe === 'webp' ? support.webp : support.avif;
    if (!supported) {
      option.disabled = true;
      option.textContent += ' — not supported by this browser';
    }
  }

  const syncQualityVisibility = () => {
    const field = qualityRange?.closest('.field') as HTMLElement | null;
    if (field) field.hidden = formatSelect.value === 'image/png';
  };
  formatSelect.addEventListener('change', syncQualityVisibility);
  syncQualityVisibility();

  qualityRange?.addEventListener('input', () => {
    if (qualityOut) qualityOut.textContent = qualityRange.value;
  });

  const dropzone = initDropzone(root, { onFile: (file) => void handleFile(file) });

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
      setStatus(root, `Ready: ${kindLabel(decoded.kind)} — ${decoded.width} × ${decoded.height} px · ${formatBytes(file.size)}. Choose the output format below.`);
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
    const mime = formatSelect.value as OutputMime;
    const quality = mime === 'image/png' ? undefined : Math.min(0.95, Math.max(0.1, Number(qualityRange?.value ?? 85) / 100));

    runBtn.disabled = true;
    dropzone.setBusy(true);
    setStatus(root, 'Converting…', 'busy');
    await tick();

    try {
      const background = mime === 'image/jpeg' ? (bgInput?.value || '#ffffff') : null;
      const plan = { outWidth: decoded.width, outHeight: decoded.height, source: { x: 0, y: 0, width: decoded.width, height: decoded.height }, mode: 'fit' as const };
      const handle = drawPlan(decoded.source, plan, { background });
      const blob = await canvasToBlob(handle.canvas, mime, quality);

      const beforeSize = currentFile.size;
      const changed = beforeSize !== blob.size;

      renderResult(resultEl, {
        heading: `Converted to ${MIME_LABEL[mime] ?? mime}`,
        badge: { label: '✓ Converted', kind: 'success' },
        before: { sizeBytes: beforeSize, width: decoded.width, height: decoded.height, formatLabel: kindLabel(decoded.kind) },
        after: { sizeBytes: blob.size, width: decoded.width, height: decoded.height, formatLabel: MIME_LABEL[mime] ?? mime },
        details: [
          ['Size change', changed ? `${formatBytes(beforeSize)} → ${formatBytes(blob.size)}` : 'unchanged'],
          ['Quality', quality !== undefined ? String(Math.round(quality * 100)) : 'lossless (PNG)'],
        ],
        previewBlob: blob,
        previewAlt: 'Converted result preview',
        download: { blob, filename: outputFilename(currentFile.name, 'converted', mime), label: `Download ${MIME_LABEL[mime] ?? mime} file` },
        note: {
          kind: 'info',
          body: mime === 'image/jpeg'
            ? 'Converting to JPEG flattens any transparency onto the chosen background color and does not carry over EXIF/GPS metadata.'
            : 'Conversion re-encodes from decoded pixels, so EXIF/GPS metadata is not carried into the new file.',
        },
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

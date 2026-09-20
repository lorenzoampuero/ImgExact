/**
 * General compressor — quality modes with a clear before/after report.
 * Never returns a bigger file silently: if re-encoding grows the file, the
 * original is offered instead, with an explanation.
 */
import { decodeFile, readHead, releaseDecoded, type DecodedImage } from '../../engine/decode';
import { drawPlan } from '../../engine/transform';
import { canvasToBlob, probeEncodeSupport, type OutputMime } from '../../engine/encode';
import { formatBytes, formatPercent, outputFilename, reductionRatio } from '../../engine/format';
import { userMessage } from '../../engine/errors';
import { kindLabel, pngMayHaveAlpha, webpMayHaveAlpha } from '../../engine/headers';
import { SITE } from '../../config/site';
import { initDropzone } from '../ui/dropzone';
import { renderResult } from '../ui/result';
import { qs, qsMaybe, radioValue, setStatus } from '../ui/dom';
import { relatedLinks } from '../ui/related';
import { applyPrefs, watchPrefs } from '../ui/prefs';

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

const MODE_QUALITY: Record<string, number> = {
  light: 0.9,
  standard: 0.8,
  aggressive: 0.6,
};

export default function init(root: HTMLElement): void {
  const slug = root.dataset.tool ?? 'compress-image';
  const resultEl = qs<HTMLElement>(root, '[data-role="result"]');
  const runBtn = qs<HTMLButtonElement>(root, '[data-role="run"]');
  const qualityWrap = qsMaybe<HTMLElement>(root, '[data-field="quality-wrap"]');
  const qualityRange = qsMaybe<HTMLInputElement>(root, '[data-field="quality"]');
  const qualityOut = qsMaybe<HTMLElement>(root, '[data-role="quality-out"]');
  if (!resultEl || !runBtn) return;

  let decoded: DecodedImage | null = null;
  let currentFile: File | null = null;

  const dropzone = initDropzone(root, { onFile: (file) => void handleFile(file) });

  for (const radio of root.querySelectorAll<HTMLInputElement>('input[name="quality-mode"]')) {
    radio.addEventListener('change', () => {
      if (qualityWrap) qualityWrap.hidden = radioValue(root, 'quality-mode') !== 'custom';
    });
  }
  qualityRange?.addEventListener('input', () => {
    if (qualityOut) qualityOut.textContent = qualityRange.value;
  });

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
      setStatus(root, `Ready: ${decoded.width} × ${decoded.height} px ${kindLabel(decoded.kind)} · ${formatBytes(file.size)}${decoded.warnings.length ? ' — ' + decoded.warnings[0] : ''}`);
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
    const mode = radioValue(root, 'quality-mode') ?? 'standard';
    const quality = mode === 'custom'
      ? Math.min(0.95, Math.max(0.1, Number(qualityRange?.value ?? 80) / 100))
      : MODE_QUALITY[mode] ?? 0.8;

    runBtn.disabled = true;
    dropzone.setBusy(true);
    setStatus(root, 'Compressing…', 'busy');
    await tick();

    try {
      const support = probeEncodeSupport();
      let mime: OutputMime;
      if (decoded.mime === 'image/jpeg') mime = 'image/jpeg';
      else if (decoded.mime === 'image/webp') mime = 'image/webp';
      else if (decoded.mime === 'image/avif' && support.avif) mime = 'image/avif';
      else if (decoded.mime === 'image/png') mime = 'image/png';
      else mime = support.webp ? 'image/webp' : 'image/jpeg';

      // Flatten transparency only when the output cannot store it.
      let background: string | null = null;
      if (mime === 'image/jpeg' && (decoded.kind === 'png' || decoded.kind === 'webp')) {
        const head = await readHead(currentFile);
        const mayAlpha = decoded.kind === 'png' ? pngMayHaveAlpha(head) : webpMayHaveAlpha(head);
        if (mayAlpha) background = '#ffffff';
      }

      const plan = { outWidth: decoded.width, outHeight: decoded.height, source: { x: 0, y: 0, width: decoded.width, height: decoded.height }, mode: 'fit' as const };
      const handle = drawPlan(decoded.source, plan, { background });
      const blob = await canvasToBlob(handle.canvas, mime, mime === 'image/png' ? undefined : quality);

      const beforeSize = currentFile.size;
      const reduced = reductionRatio(beforeSize, blob.size);

      if (blob.size >= beforeSize) {
        // Never silently return a bigger file.
        renderResult(resultEl, {
          heading: 'Re-encoding would make this file larger — original kept',
          badge: { label: 'No gain', kind: 'warning' },
          before: { sizeBytes: beforeSize, width: decoded.width, height: decoded.height, formatLabel: kindLabel(decoded.kind) },
          after: { sizeBytes: blob.size, width: decoded.width, height: decoded.height, formatLabel: mime.replace('image/', '').toUpperCase() },
          note: {
            kind: 'warning',
            title: 'Why this happens',
            body: 'This image is already optimized for its format (common with PNG screenshots and previously compressed files). Re-encoding it at this quality produced a larger file, so nothing was lost — download the original below, or try the exact-size compressor with a target, or convert to WebP for a real reduction.',
          },
          download: { blob: currentFile, filename: currentFile.name, label: 'Download original (smaller)' },
          onReset: reset,
          related: relatedLinks(slug),
        });
      } else {
        renderResult(resultEl, {
          heading: `Reduced by ${formatPercent(reduced)} — ${formatBytes(beforeSize)} → ${formatBytes(blob.size)}`,
          badge: { label: '✓ Compressed', kind: 'success' },
          before: { sizeBytes: beforeSize, width: decoded.width, height: decoded.height, formatLabel: kindLabel(decoded.kind) },
          after: { sizeBytes: blob.size, width: decoded.width, height: decoded.height, formatLabel: mime.replace('image/', '').toUpperCase() },
          details: [
            ['Quality mode', mode === 'custom' ? `Custom (${Math.round(quality * 100)})` : `${mode} (≈ quality ${Math.round(quality * 100)})`],
            ['Dimensions', 'unchanged'],
          ],
          previewBlob: blob,
          previewAlt: 'Compressed result preview',
          beforePreviewBlob: currentFile,
          download: { blob, filename: outputFilename(currentFile.name, 'compressed', mime), label: 'Download compressed image' },
          note: background
            ? { kind: 'info', body: 'Transparent areas were flattened onto white because JPEG cannot store transparency.' }
            : undefined,
          onReset: reset,
          related: relatedLinks(slug),
        });
      }
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

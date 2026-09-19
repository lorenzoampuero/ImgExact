/**
 * Signature resizer — exact canvas dimensions (contain-fit, no stretch) with a
 * KB ceiling, background color and optional alpha preservation.
 */
import { decodeFile, releaseDecoded, type DecodedImage } from '../../engine/decode';
import { drawContainFit, parseDimension } from '../../engine/transform';
import { canvasToBlob, type OutputMime } from '../../engine/encode';
import { searchBestQualityUnder } from '../../engine/target-size';
import { formatBytes, parseSizeToBytes, outputFilename } from '../../engine/format';
import { userMessage } from '../../engine/errors';
import { kindLabel } from '../../engine/headers';
import { SITE } from '../../config/site';
import { initDropzone } from '../ui/dropzone';
import { renderResult } from '../ui/result';
import { checkboxValue, inputValue, qs, qsMaybe, setStatus } from '../ui/dom';
import { relatedLinks } from '../ui/related';

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

export default function init(root: HTMLElement): void {
  const slug = root.dataset.tool ?? 'signature-resizer';
  const resultEl = qs<HTMLElement>(root, '[data-role="result"]');
  const runBtn = qs<HTMLButtonElement>(root, '[data-role="run"]');
  const formatSelect = qs<HTMLSelectElement>(root, '[data-field="format"]');
  const alphaBox = qsMaybe<HTMLInputElement>(root, '[data-field="keep-alpha"]');
  if (!resultEl || !runBtn || !formatSelect) return;

  let decoded: DecodedImage | null = null;
  let currentFile: File | null = null;

  const dropzone = initDropzone(root, { onFile: (file) => void handleFile(file) });

  const syncAlphaAvailability = () => {
    if (!alphaBox) return;
    const isPng = formatSelect.value === 'image/png';
    alphaBox.disabled = !isPng;
    if (!isPng) alphaBox.checked = false;
  };
  formatSelect.addEventListener('change', syncAlphaAvailability);
  syncAlphaAvailability();

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
      setStatus(root, `Ready: ${decoded.width} × ${decoded.height} px ${kindLabel(decoded.kind)} · ${formatBytes(file.size)}. Set the form requirements below.`);
    } catch (err) {
      const msg = userMessage(err, { maxFileBytes: SITE.limits.maxFileBytes });
      setStatus(root, `${msg.title} ${msg.body}`, 'error');
    } finally {
      dropzone.setBusy(false);
    }
  }

  async function run(): Promise<void> {
    if (!decoded || !currentFile) {
      setStatus(root, 'Add an image first — drop the signature onto the zone above.', 'error');
      return;
    }
    const width = parseDimension(inputValue(root, 'width'));
    const height = parseDimension(inputValue(root, 'height'));
    const targetBytes = parseSizeToBytes(inputValue(root, 'target-kb'));
    if (!width || !height) {
      setStatus(root, 'Enter the required pixel dimensions (e.g. 140 × 60).', 'error');
      return;
    }
    if (!targetBytes) {
      setStatus(root, 'Enter the maximum size from the form (e.g. "20 KB").', 'error');
      return;
    }
    const mime = formatSelect.value as OutputMime;
    const keepAlpha = checkboxValue(root, 'keep-alpha');
    const bg = inputValue(root, 'background') || '#ffffff';

    runBtn.disabled = true;
    dropzone.setBusy(true);
    setStatus(root, 'Preparing the signature…', 'busy');
    await tick();

    try {
      const background = mime === 'image/png' && keepAlpha ? null : bg;
      const handle = drawContainFit(decoded.source, width, height, background);

      let blob: Blob;
      let qualityNote = '';
      let note = undefined as undefined | { kind: 'info' | 'success' | 'warning' | 'error'; title?: string; body: string };
      let hitTarget = true;

      if (mime === 'image/png') {
        blob = await canvasToBlob(handle.canvas, 'image/png');
        if (blob.size > targetBytes) {
          hitTarget = false;
          note = {
            kind: 'warning',
            title: 'PNG cannot compress below the limit',
            body: `The PNG result is ${formatBytes(blob.size)} — PNG is lossless and has no quality dial. Switch the output format to JPEG (recommended for forms) and run again, or allow the tool to reduce dimensions in the form values.`,
          };
        }
      } else {
        const result = await searchBestQualityUnder(
          (q) => canvasToBlob(handle.canvas, 'image/jpeg', q),
          targetBytes,
        );
        blob = result.blob;
        hitTarget = result.hitTarget;
        if (result.hitTarget) {
          qualityNote = result.quality.toFixed(2);
        } else {
          note = {
            kind: 'warning',
            title: 'Could not reach the size limit',
            body: `At the lowest useful quality the file measures ${formatBytes(result.floorBytes)} (target ≤ ${formatBytes(targetBytes)}). The smallest result is provided below. Slightly smaller dimensions usually reach very tight form limits.`,
          };
        }
      }

      const actions = [];
      if (!hitTarget) {
        actions.push({
          label: 'Download smallest result anyway',
          variant: 'secondary' as const,
          onClick: () => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = outputFilename(currentFile!.name, 'signature-smallest', mime);
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
          },
        });
      }

      renderResult(resultEl, {
        heading: hitTarget
          ? `Signature ready: ${width} × ${height} px, ${formatBytes(blob.size)} — under your ${formatBytes(targetBytes)} limit`
          : `Signature resized to ${width} × ${height} px — size limit not met`,
        badge: hitTarget ? { label: '✓ Ready to upload', kind: 'success' } : { label: 'Check the limit', kind: 'warning' },
        before: { sizeBytes: currentFile.size, width: decoded.width, height: decoded.height, formatLabel: kindLabel(decoded.kind) },
        after: { sizeBytes: blob.size, width, height, formatLabel: mime.replace('image/', '').toUpperCase() },
        details: [
          ['Output dimensions', `${width} × ${height} px (exact)`],
          ['Maximum size', `≤ ${formatBytes(targetBytes)}${hitTarget ? '' : ` — achieved ${formatBytes(blob.size)}`}`],
          ...(qualityNote ? [['Quality used', qualityNote] as [string, string]] : []),
          ['Fitted not stretched', 'the full signature is preserved; empty space is filled with the background color'],
        ],
        previewBlob: blob,
        previewAlt: 'Signature result preview',
        download: hitTarget ? { blob, filename: outputFilename(currentFile.name, `signature-${width}x${height}`, mime), label: 'Download signature' } : { blob, filename: outputFilename(currentFile.name, `signature-${width}x${height}`, mime), label: `Download anyway (${formatBytes(blob.size)})` },
        note,
        extraActions: actions,
        onReset: reset,
        related: relatedLinks(slug),
      });
      setStatus(root, hitTarget ? '' : 'The size limit was not met — see the report.', hitTarget ? 'success' : 'error');
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

/**
 * Exact file size compressor (hero tool).
 * Contract: best quality at or under the target. Dimension reduction only on
 * explicit consent. Failures are reported with the honest floor — never silent.
 */
import { decodeFile, readHead, releaseDecoded, type DecodedImage } from '../../engine/decode';
import { computeResizePlan, drawPlan } from '../../engine/transform';
import { canvasToBlob, probeEncodeSupport, type OutputMime } from '../../engine/encode';
import { optimizeToTarget, searchBestQualityUnder } from '../../engine/target-size';
import { formatBytes, formatPercent, outputFilename, reductionRatio, parseSizeToBytes } from '../../engine/format';
import { EngineError, userMessage } from '../../engine/errors';
import { kindLabel, pngMayHaveAlpha, webpMayHaveAlpha } from '../../engine/headers';
import { SITE } from '../../config/site';
import { initDropzone } from '../ui/dropzone';
import { renderResult, type ResultAction } from '../ui/result';
import { checkboxValue, inputValue, qs, qsMaybe, setStatus } from '../ui/dom';
import { relatedLinks } from '../ui/related';

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

export default function init(root: HTMLElement): void {
  const slug = root.dataset.tool ?? 'compress-image-to-size';
  const resultEl = qs<HTMLElement>(root, '[data-role="result"]');
  const runBtn = qs<HTMLButtonElement>(root, '[data-role="run"]');
  if (!resultEl || !runBtn) return;

  let decoded: DecodedImage | null = null;
  let currentFile: File | null = null;
  let head: Uint8Array | null = null;

  const dropzone = initDropzone(root, { onFile: (file) => void handleFile(file) });

  async function sourceMayHaveAlpha(): Promise<boolean> {
    if (!decoded || !currentFile) return false;
    if (decoded.kind === 'png' || decoded.kind === 'webp') {
      head = head ?? (await readHead(currentFile));
      return decoded.kind === 'png' ? pngMayHaveAlpha(head) : webpMayHaveAlpha(head);
    }
    return false;
  }

  function reset(): void {
    releaseDecoded(decoded);
    decoded = null;
    currentFile = null;
    head = null;
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
      head = null;
      const warnings = decoded.warnings;
      setStatus(
        root,
        `Ready: ${decoded.width} × ${decoded.height} px ${kindLabel(decoded.kind)} · ${formatBytes(file.size)}${warnings.length ? ' — ' + warnings[0] : ''}`,
      );
    } catch (err) {
      showError(err);
    } finally {
      dropzone.setBusy(false);
    }
  }

  function showError(err: unknown): void {
    const msg = userMessage(err, { maxFileBytes: SITE.limits.maxFileBytes });
    setStatus(root, `${msg.title} ${msg.body}`, 'error');
  }

  function resolveMime(pref: string): OutputMime {
    const support = probeEncodeSupport();
    const src = decoded?.mime ?? null;
    if (pref === 'jpeg') return 'image/jpeg';
    if (pref === 'png') return 'image/png';
    if (pref === 'webp') {
      if (!support.webp) {
        throw new EngineError('ENCODE_UNSUPPORTED', 'WebP encoding unavailable', 'This browser cannot write WebP files. Choose JPEG or PNG instead.');
      }
      return 'image/webp';
    }
    // auto: prefer keeping the source format when it is size-tunable
    if (src === 'image/jpeg') return 'image/jpeg';
    if (src === 'image/webp') return 'image/webp';
    if (src === 'image/avif') return support.avif ? 'image/avif' : 'image/jpeg';
    if (src === 'image/png') return support.webp ? 'image/webp' : 'image/png';
    return support.webp ? 'image/webp' : 'image/jpeg';
  }

  async function run(): Promise<void> {
    if (!decoded || !currentFile) {
      setStatus(root, 'Add an image first — drop it onto the zone above.', 'error');
      return;
    }
    const targetBytes = parseSizeToBytes(inputValue(root, 'target-size'));
    if (!targetBytes) {
      setStatus(root, 'Enter a valid target like "50 KB", "200 KB" or "1 MB".', 'error');
      return;
    }
    const allowScale = checkboxValue(root, 'allow-scale');
    const pref = inputValue(root, 'format') || 'auto';

    runBtn.disabled = true;
    dropzone.setBusy(true);
    setStatus(root, 'Searching the best quality that fits…', 'busy');
    await tick();

    try {
      const mime = resolveMime(pref);
      const flatten = mime === 'image/jpeg' && (await sourceMayHaveAlpha());
      const background = flatten ? '#ffffff' : null;
      const qualityCapable = mime !== 'image/png';

      const searchAtScale = (scale: number) => {
        const plan = computeResizePlan(decoded!.width, decoded!.height, { mode: 'fit', percent: scale * 100 });
        const handle = drawPlan(decoded!.source, plan, { background });
        const encode = (q: number) => canvasToBlob(handle.canvas, mime, q);
        return searchBestQualityUnder(encode, targetBytes);
      };

      const outcome = await optimizeToTarget({ targetBytes, allowDimensionReduction: allowScale, searchAtScale });
      const beforeSize = currentFile.size;

      if (outcome.hitTarget) {
        const blob = outcome.blob;
        const scale = outcome.scale;
        const outW = Math.round(decoded.width * scale);
        const outH = Math.round(decoded.height * scale);
        const reduced = reductionRatio(beforeSize, blob.size);

        const details: Array<[string, string]> = [
          ['Target', `≤ ${formatBytes(targetBytes)}`],
          ['Achieved', `${formatBytes(blob.size)} (${formatPercent(reduced)} smaller than the original)`],
          ['Output dimensions', `${outW} × ${outH} px${scale < 1 ? ` (${Math.round(scale * 100)}% of original — you allowed dimension reduction)` : ''}`],
        ];
        if (qualityCapable) details.push(['Quality setting used', outcome.quality.toFixed(2)]);
        details.push(['Encode passes', String(outcome.attemptsTotal)]);

        renderResult(resultEl, {
          heading: `Compressed to ${formatBytes(blob.size)} — at or under your ${formatBytes(targetBytes)} target`,
          badge: { label: '✓ Target met', kind: 'success' },
          before: { sizeBytes: beforeSize, width: decoded.width, height: decoded.height, formatLabel: kindLabel(decoded.kind) },
          after: { sizeBytes: blob.size, width: outW, height: outH, formatLabel: mime.replace('image/', '').toUpperCase() },
          details,
          previewBlob: blob,
          previewAlt: 'Compressed result preview',
          download: { blob, filename: outputFilename(currentFile.name, 'compressed', mime), label: 'Download compressed image' },
          note: flatten
            ? { kind: 'info', body: 'Transparent areas were flattened onto white because JPEG cannot store transparency.' }
            : undefined,
          onReset: reset,
          related: relatedLinks(slug),
        });
        setStatus(root, '');
      } else {
        // Honest failure: the floor is reported; recovery actions offered.
        const floorBlob = outcome.blob;
        const support = probeEncodeSupport();
        const scaleNote =
          outcome.floorScale < 1
            ? ` Even at ${Math.round(outcome.floorScale * 100)}% dimensions the smallest result was ${formatBytes(outcome.floorBytes)}.`
            : '';
        const pngNote =
          mime === 'image/png'
            ? ' PNG is lossless — it has no quality dial, so it can only shrink by reducing dimensions.'
            : '';

        const actions: ResultAction[] = [
          {
            label: 'Allow dimension reduction & retry',
            variant: 'primary',
            onClick: () => {
              const box = qsMaybe<HTMLInputElement>(root, '[data-field="allow-scale"]');
              if (box) box.checked = true;
              void run();
            },
          },
        ];

        if (mime !== 'image/webp' && support.webp) {
          actions.push({
            label: 'Retry as WebP (usually much smaller)',
            variant: 'secondary',
            onClick: () => {
              const select = qsMaybe<HTMLSelectElement>(root, '[data-field="format"]');
              if (select) select.value = 'webp';
              void run();
            },
          });
        }

        renderResult(resultEl, {
          heading: `Could not reach ${formatBytes(targetBytes)} without shrinking the image`,
          badge: { label: 'Target not reached', kind: 'warning' },
          before: { sizeBytes: beforeSize, width: decoded.width, height: decoded.height, formatLabel: kindLabel(decoded.kind) },
          after: { sizeBytes: outcome.floorBytes, width: decoded.width, height: decoded.height, formatLabel: mime.replace('image/', '').toUpperCase() },
          details: [
            ['Smallest at minimum quality', formatBytes(outcome.floorBytes)],
            ['Target', `≤ ${formatBytes(targetBytes)}`],
          ],
          note: {
            kind: 'warning',
            title: 'What happened',
            body: `At the lowest quality setting the file still measures ${formatBytes(outcome.floorBytes)}.${pngNote}${scaleNote} You can allow dimension reduction, switch format, or download the smallest result below.`,
          },
          download: { blob: floorBlob, filename: outputFilename(currentFile.name, 'smallest', mime), label: `Download smallest result (${formatBytes(floorBlob.size)})` },
          extraActions: actions,
          onReset: reset,
          related: relatedLinks(slug),
        });
        setStatus(root, 'Target not reached — see the report for your options.', 'error');
      }
    } catch (err) {
      showError(err);
    } finally {
      runBtn.disabled = false;
      dropzone.setBusy(false);
    }
  }

  runBtn.addEventListener('click', () => void run());
}

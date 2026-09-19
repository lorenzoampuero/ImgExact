/**
 * Social media resizer — versioned presets, center-crop to exact platform size,
 * optional KB ceiling. Preset source and review date always disclosed.
 */
import { decodeFile, readHead, releaseDecoded, type DecodedImage } from '../../engine/decode';
import { computeResizePlan, drawPlan } from '../../engine/transform';
import { canvasToBlob, type OutputMime } from '../../engine/encode';
import { searchBestQualityUnder } from '../../engine/target-size';
import { formatBytes, parseSizeToBytes, outputFilename } from '../../engine/format';
import { userMessage } from '../../engine/errors';
import { kindLabel, pngMayHaveAlpha, webpMayHaveAlpha } from '../../engine/headers';
import { SITE } from '../../config/site';
import { SOCIAL_PRESETS, PRESETS_REVIEWED_AT } from '../../config/social-presets';
import { initDropzone } from '../ui/dropzone';
import { renderResult } from '../ui/result';
import { inputValue, qs, setStatus } from '../ui/dom';
import { relatedLinks } from '../ui/related';

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

export default function init(root: HTMLElement): void {
  const slug = root.dataset.tool ?? 'social-image-resizer';
  const resultEl = qs<HTMLElement>(root, '[data-role="result"]');
  const runBtn = qs<HTMLButtonElement>(root, '[data-role="run"]');
  const presetSelect = qs<HTMLSelectElement>(root, '[data-field="preset"]');
  if (!resultEl || !runBtn || !presetSelect) return;

  let decoded: DecodedImage | null = null;
  let currentFile: File | null = null;

  const dropzone = initDropzone(root, { onFile: (file) => void handleFile(file) });

  presetSelect.value = SOCIAL_PRESETS[0]?.id ?? '';

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
      setStatus(root, `Ready: ${decoded.width} × ${decoded.height} px ${kindLabel(decoded.kind)} · ${formatBytes(file.size)}. Pick the platform placement below.`);
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
    const preset = SOCIAL_PRESETS.find((p) => p.id === presetSelect.value);
    if (!preset) {
      setStatus(root, 'Choose a platform placement.', 'error');
      return;
    }
    const maxKbRaw = inputValue(root, 'max-kb').trim();
    const targetBytes = maxKbRaw ? parseSizeToBytes(maxKbRaw) : null;
    if (maxKbRaw && !targetBytes) {
      setStatus(root, 'The maximum size is not valid — use e.g. "2 MB" or leave it empty.', 'error');
      return;
    }

    runBtn.disabled = true;
    dropzone.setBusy(true);
    setStatus(root, 'Cropping and resizing…', 'busy');
    await tick();

    try {
      // Platforms accept JPEG universally; keep PNG output only when the user
      // asked for no KB ceiling (lossless graphics with transparency).
      const mime: OutputMime = decoded.mime === 'image/png' && !targetBytes ? 'image/png' : 'image/jpeg';
      let background: string | null = null;
      if (mime === 'image/jpeg' && (decoded.kind === 'png' || decoded.kind === 'webp')) {
        const head = await readHead(currentFile);
        const mayAlpha = decoded.kind === 'png' ? pngMayHaveAlpha(head) : webpMayHaveAlpha(head);
        if (mayAlpha) background = '#ffffff';
      }

      const plan = computeResizePlan(decoded.width, decoded.height, { mode: 'fill', width: preset.width, height: preset.height });
      const handle = drawPlan(decoded.source, plan, { background });

      let blob: Blob;
      let qualityNote = 'high (0.90)';
      let note = undefined as undefined | { kind: 'info' | 'warning'; title?: string; body: string };
      let hitTarget = true;

      if (targetBytes && mime !== 'image/png') {
        const result = await searchBestQualityUnder((q) => canvasToBlob(handle.canvas, mime, q), targetBytes);
        blob = result.blob;
        qualityNote = result.quality.toFixed(2);
        hitTarget = result.hitTarget;
        if (!hitTarget) {
          note = {
            kind: 'warning',
            title: 'Size limit not met',
            body: `The smallest result at ${preset.width} × ${preset.height} is ${formatBytes(result.floorBytes)} (limit ≤ ${formatBytes(targetBytes)}). The image is still provided — reduce further with the exact-size compressor if the platform enforces the limit.`,
          };
        }
      } else {
        blob = await canvasToBlob(handle.canvas, mime, mime === 'image/png' ? undefined : 0.9);
      }

      const sourceNote = `Preset source: ${preset.sourceUrl} (last reviewed ${PRESETS_REVIEWED_AT}, confidence: ${preset.confidence}). Platforms change sizes occasionally — check the source if this is critical.`;

      renderResult(resultEl, {
        heading: `${preset.platform} — ${preset.label} · ${preset.width} × ${preset.height} px`,
        badge: hitTarget ? { label: '✓ Ready to post', kind: 'success' } : { label: 'Size limit not met', kind: 'warning' },
        before: { sizeBytes: currentFile.size, width: decoded.width, height: decoded.height, formatLabel: kindLabel(decoded.kind) },
        after: { sizeBytes: blob.size, width: preset.width, height: preset.height, formatLabel: mime.replace('image/', '').toUpperCase() },
        details: [
          ['Placement', `${preset.label} (${preset.ratioLabel})`],
          ['Crop', 'centered fill — reposition with the crop tool if the subject is off-center'],
          ['Quality', qualityNote],
        ],
        previewBlob: blob,
        previewAlt: 'Resized social image preview',
        download: { blob, filename: outputFilename(currentFile.name, `${preset.platform.toLowerCase()}-${preset.width}x${preset.height}`, mime), label: 'Download for upload' },
        note: note ?? { kind: 'info', body: sourceNote },
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

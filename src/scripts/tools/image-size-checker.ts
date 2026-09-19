/**
 * Image size checker — read-only report. Auto-runs on file selection.
 * Everything is computed locally; metadata values are shown to the user only.
 */
import { decodeFile, readHead, releaseDecoded, type DecodedImage } from '../../engine/decode';
import { inspectMetadata, hasAnyMetadata } from '../../engine/metadata';
import { formatBytes, formatRatio, megapixels, printSize, formatInches, formatCm } from '../../engine/format';
import { kindLabel, mimeForKind, pngMayHaveAlpha, webpMayHaveAlpha } from '../../engine/headers';
import { userMessage } from '../../engine/errors';
import { SITE } from '../../config/site';
import { initDropzone } from '../ui/dropzone';
import { h, qs, setStatus } from '../ui/dom';
import { relatedLinks } from '../ui/related';

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

export default function init(root: HTMLElement): void {
  const slug = root.dataset.tool ?? 'image-size-checker';
  const resultEl = qs<HTMLElement>(root, '[data-role="result"]');
  if (!resultEl) return;

  let decoded: DecodedImage | null = null;

  const dropzone = initDropzone(root, { onFile: (file) => void analyze(file) });

  function reset(): void {
    releaseDecoded(decoded);
    decoded = null;
    resultEl.hidden = true;
    dropzone.reset();
    setStatus(root, '');
  }

  function row(dl: HTMLElement, term: string, value: string | Node): void {
    const dd = h('dd');
    if (typeof value === 'string') dd.textContent = value;
    else dd.append(value);
    dl.append(h('div', {}, [h('dt', { text: term }), dd]));
  }

  async function analyze(file: File): Promise<void> {
    resultEl.hidden = true;
    releaseDecoded(decoded);
    decoded = null;
    dropzone.setBusy(true);
    setStatus(root, 'Reading image…', 'busy');
    await tick();
    try {
      decoded = await decodeFile(file, SITE.limits);
      const head = await readHead(file);
      const meta = inspectMetadata(head, decoded.kind);

      const transparency =
        decoded.kind === 'png' ? (pngMayHaveAlpha(head) ? 'possible (RGBA palette detected)' : 'none detected')
        : decoded.kind === 'webp' ? (webpMayHaveAlpha(head) ? 'possible (alpha flag set)' : 'none detected')
        : decoded.kind === 'gif' ? 'possible (GIF supports 1-bit transparency)'
        : 'none (format has no alpha channel)';

      const rows = h('dl', { class: 'result__dl', style: 'padding: var(--sp-2) 0 0;' });
      row(rows, 'File size', `${formatBytes(file.size)} (${file.size.toLocaleString()} bytes)`);
      row(rows, 'Pixel dimensions', `${decoded.width.toLocaleString()} × ${decoded.height.toLocaleString()} px`);
      row(rows, 'Aspect ratio', formatRatio(decoded.width, decoded.height));
      row(rows, 'Megapixels', megapixels(decoded.width, decoded.height));
      row(rows, 'Format', `${kindLabel(decoded.kind)} · ${mimeForKind(decoded.kind) ?? 'unknown MIME'}`);
      row(rows, 'Transparency', transparency);

      const print300 = printSize(decoded.width, decoded.height, 300);
      const print150 = printSize(decoded.width, decoded.height, 150);
      if (print300 && print150) {
        row(rows, 'Print size at 300 DPI', `${formatInches(print300.inches.width)} × ${formatInches(print300.inches.height)} (${formatCm(print300.cm.width)} × ${formatCm(print300.cm.height)})`);
        row(rows, 'At 150 DPI', `${formatInches(print150.inches.width)} × ${formatInches(print150.inches.height)}`);
      }

      if (hasAnyMetadata(meta)) {
        const details: string[] = [];
        if (meta.cameraMake || meta.cameraModel) details.push([meta.cameraMake, meta.cameraModel].filter(Boolean).join(' '));
        if (meta.software) details.push(`software: ${meta.software}`);
        if (meta.dateTime) details.push(`date: ${meta.dateTime}`);
        if (meta.orientation !== undefined) details.push(`orientation tag: ${meta.orientation}`);
        if (meta.hasGps) details.push('GPS location: PRESENT');
        if (meta.hasXmp) details.push('XMP block present');
        if (meta.hasIcc) details.push('ICC color profile present');
        if (meta.pngTextChunks.length) details.push(`${meta.pngTextChunks.length} PNG text chunk(s)`);
        row(rows, 'Metadata', details.join(' · ') || 'present');
      } else {
        row(rows, 'Metadata', 'none detected (no EXIF/GPS/XMP)');
      }

      if (decoded.warnings.length > 0) {
        row(rows, 'Warnings', decoded.warnings.join(' '));
      }

      const result = h('div', { class: 'result' });
      result.append(
        h('div', { class: 'result__head' }, [
          h('span', { class: 'badge badge--accent', text: 'Analysis complete' }),
          h('strong', { text: `${file.name} — ${formatBytes(file.size)}` }),
        ]),
      );
      result.append(h('div', { style: 'padding: 0 var(--sp-5) var(--sp-4);' }, [rows]));

      const actions = h('div', { class: 'result__actions' });
      for (const link of relatedLinks(slug)) {
        actions.append(h('a', { class: 'btn btn--secondary', href: link.href, text: link.label }));
      }
      actions.append(h('button', { class: 'btn btn--ghost', type: 'button', text: 'Check another image', onclick: reset }));
      result.append(actions);

      resultEl.innerHTML = '';
      resultEl.append(result);
      resultEl.hidden = false;
      setStatus(root, '');
    } catch (err) {
      const msg = userMessage(err, { maxFileBytes: SITE.limits.maxFileBytes });
      setStatus(root, `${msg.title} ${msg.body}`, 'error');
    } finally {
      dropzone.setBusy(false);
    }
  }
}

/**
 * Metadata viewer & remover.
 * Viewer parses locally; removal re-encodes from pixels and VERIFIES the
 * result in-page (before/after), which most competing tools skip.
 */
import { decodeFile, readHead, releaseDecoded, type DecodedImage } from '../../engine/decode';
import { inspectMetadata, hasAnyMetadata, type MetadataReport } from '../../engine/metadata';
import { drawPlan } from '../../engine/transform';
import { canvasToBlob, probeEncodeSupport, type OutputMime } from '../../engine/encode';
import { formatBytes, outputFilename } from '../../engine/format';
import { userMessage } from '../../engine/errors';
import { kindLabel, type ImageKind } from '../../engine/headers';
import { SITE } from '../../config/site';
import { initDropzone } from '../ui/dropzone';
import { renderResult } from '../ui/result';
import { h, qs, setStatus } from '../ui/dom';
import { relatedLinks } from '../ui/related';

const tick = () => new Promise((resolve) => setTimeout(resolve, 30));

function mimeToKind(mime: string): ImageKind {
  switch (mime) {
    case 'image/jpeg': return 'jpeg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/avif': return 'avif';
    default: return 'unknown';
  }
}

function reportLines(meta: MetadataReport): string[] {
  const lines: string[] = [];
  if (meta.cameraMake || meta.cameraModel) lines.push(`Camera: ${[meta.cameraMake, meta.cameraModel].filter(Boolean).join(' ')}`);
  if (meta.software) lines.push(`Software: ${meta.software}`);
  if (meta.dateTime) lines.push(`Date/time: ${meta.dateTime}`);
  if (meta.orientation !== undefined) lines.push(`Orientation tag: ${meta.orientation}`);
  if (meta.hasGps) {
    lines.push(
      meta.gpsLatitude !== undefined && meta.gpsLongitude !== undefined
        ? `GPS location: ${meta.gpsLatitude.toFixed(5)}, ${meta.gpsLongitude.toFixed(5)}`
        : 'GPS block present',
    );
  }
  if (meta.hasXmp) lines.push('XMP metadata block present');
  if (meta.hasIcc) lines.push('ICC color profile present');
  for (const chunk of meta.pngTextChunks) lines.push(`PNG text chunk: ${chunk.keyword} = ${chunk.text.slice(0, 80)}`);
  return lines;
}

export default function init(root: HTMLElement): void {
  const slug = root.dataset.tool ?? 'image-metadata';
  const resultEl = qs<HTMLElement>(root, '[data-role="result"]');
  const stripBtn = qs<HTMLButtonElement>(root, '[data-role="strip"]');
  if (!resultEl || !stripBtn) return;

  let decoded: DecodedImage | null = null;
  let currentFile: File | null = null;
  let meta: MetadataReport | null = null;

  const dropzone = initDropzone(root, { onFile: (file) => void handleFile(file) });

  function reset(): void {
    releaseDecoded(decoded);
    decoded = null;
    currentFile = null;
    meta = null;
    resultEl.hidden = true;
    stripBtn.disabled = true;
    dropzone.reset();
    setStatus(root, '');
  }

  function renderReport(file: File): void {
    const found = meta ? reportLines(meta) : [];
    const has = meta ? hasAnyMetadata(meta) : false;

    const result = h('div', { class: 'result' });
    result.append(
      h('div', { class: 'result__head' }, [
        h('span', {
          class: `badge badge--${has ? 'warning' : 'success'}`,
          text: has ? 'Metadata found' : 'No metadata detected',
        }),
        h('strong', { text: `${file.name} — ${formatBytes(file.size)} (${kindLabel(decoded!.kind)}, ${decoded!.width} × ${decoded!.height} px)` }),
      ]),
    );
    const body = h('div', { style: 'padding: var(--sp-3) var(--sp-5) var(--sp-4);' });
    if (has) {
      const list = h('ul', { style: 'margin:0; padding-left: 1.2em;' });
      for (const line of found) list.append(h('li', { text: line }));
      body.append(h('p', { class: 'small', text: 'The values above were parsed locally — nothing was sent anywhere. Use the button below to rebuild the file without this data.' }));
      body.append(list);
    } else {
      body.append(h('p', { class: 'small', style: 'margin:0;', text: 'This file carries no EXIF/GPS/XMP blocks that this tool can detect — there is nothing to remove. (Some editors embed data in non-standard ways; this check covers the common formats.)' }));
    }
    result.append(body);
    resultEl.innerHTML = '';
    resultEl.append(result);
    resultEl.hidden = false;
  }

  async function handleFile(file: File): Promise<void> {
    resultEl.hidden = true;
    stripBtn.disabled = true;
    releaseDecoded(decoded);
    decoded = null;
    meta = null;
    dropzone.setBusy(true);
    setStatus(root, 'Reading image and metadata…', 'busy');
    try {
      decoded = await decodeFile(file, SITE.limits);
      currentFile = file;
      const head = await readHead(file);
      meta = inspectMetadata(head, decoded.kind);
      stripBtn.disabled = !hasAnyMetadata(meta);
      renderReport(file);
      setStatus(root, '');
    } catch (err) {
      const msg = userMessage(err, { maxFileBytes: SITE.limits.maxFileBytes });
      setStatus(root, `${msg.title} ${msg.body}`, 'error');
    } finally {
      dropzone.setBusy(false);
    }
  }

  async function strip(): Promise<void> {
    if (!decoded || !currentFile || !meta) return;
    stripBtn.disabled = true;
    dropzone.setBusy(true);
    setStatus(root, 'Rebuilding the image without metadata…', 'busy');
    await tick();
    try {
      const support = probeEncodeSupport();
      let mime: OutputMime;
      if (decoded.mime === 'image/png') mime = 'image/png';
      else if (decoded.mime === 'image/webp') mime = 'image/webp';
      else if (decoded.mime === 'image/avif' && support.avif) mime = 'image/avif';
      else mime = 'image/jpeg';

      const plan = { outWidth: decoded.width, outHeight: decoded.height, source: { x: 0, y: 0, width: decoded.width, height: decoded.height }, mode: 'fit' as const };
      const needsFlatten = mime === 'image/jpeg' && decoded.kind !== 'jpeg';
      const handle = drawPlan(decoded.source, plan, { background: needsFlatten ? '#ffffff' : null });
      const quality = mime === 'image/jpeg' ? 0.95 : mime === 'image/png' ? undefined : 0.92;
      const blob = await canvasToBlob(handle.canvas, mime, quality);

      // Verify: parse the produced bytes again.
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const after = inspectMetadata(bytes, mimeToKind(mime));
      const stillHas = hasAnyMetadata(after);

      renderResult(resultEl, {
        heading: stillHas ? 'Metadata partially removed — verify the details' : 'Metadata removed and verified',
        badge: stillHas
          ? { label: 'Review needed', kind: 'warning' }
          : { label: '✓ Verified clean', kind: 'success' },
        before: { sizeBytes: currentFile.size, width: decoded.width, height: decoded.height, formatLabel: kindLabel(decoded.kind) },
        after: { sizeBytes: blob.size, width: decoded.width, height: decoded.height, formatLabel: mime.replace('image/', '').toUpperCase() },
        details: [
          ['EXIF before', meta.hasExif ? 'present' : 'not detected'],
          ['EXIF after', after.hasExif ? 'STILL PRESENT — review' : 'removed'],
          ['GPS before', meta.hasGps ? 'present' : 'not detected'],
          ['GPS after', after.hasGps ? 'STILL PRESENT — review' : 'removed'],
        ],
        previewBlob: blob,
        previewAlt: 'Cleaned image preview',
        download: { blob, filename: outputFilename(currentFile.name, 'no-metadata', mime), label: 'Download clean copy' },
        note: {
          kind: stillHas ? 'warning' : 'info',
          body: stillHas
            ? 'The rebuild left some data behind that the checker can still detect. For strongest privacy, convert to another format before sharing.'
            : 'The clean copy was re-encoded from pixels and re-checked in your browser. Colors: re-encoding reads the decoded pixels; wide-gamut profiles are dropped along with metadata, so a slight color shift is possible in rare cases — compare the preview before sharing.',
        },
        onReset: reset,
        related: relatedLinks(slug),
      });
      setStatus(root, '');
    } catch (err) {
      const msg = userMessage(err);
      setStatus(root, `${msg.title} ${msg.body}`, 'error');
    } finally {
      stripBtn.disabled = false;
      dropzone.setBusy(false);
    }
  }

  stripBtn.addEventListener('click', () => void strip());
}

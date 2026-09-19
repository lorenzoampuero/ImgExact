/**
 * Image → Base64. Fully local; copy-ready output with exact size math.
 */
import { bytesToBase64, bytesToDataUri, base64SizeInfo } from '../../engine/base64';
import { formatBytes } from '../../engine/format';
import { userMessage } from '../../engine/errors';
import { kindLabel, mimeForKind, sniffKind } from '../../engine/headers';
import { initDropzone } from '../ui/dropzone';
import { qs, qsMaybe, setStatus } from '../ui/dom';

const INLINE_WARN_BYTES = 5 * 1024 * 1024;

export default function init(root: HTMLElement): void {
  const output = qs<HTMLTextAreaElement>(root, '[data-role="output"]');
  const outputWrap = qs<HTMLElement>(root, '[data-role="b64-output"]');
  const statsEl = qs<HTMLElement>(root, '[data-role="b64-stats"]');
  const copyB64 = qsMaybe<HTMLButtonElement>(root, '[data-role="copy-b64"]');
  const copyUri = qsMaybe<HTMLButtonElement>(root, '[data-role="copy-uri"]');
  if (!output || !outputWrap) return;

  let base64 = '';
  let dataUri = '';

  const dropzone = initDropzone(root, { onFile: (file) => void handleFile(file) });

  async function copyText(text: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(root, `${label} copied to the clipboard.`, 'success');
    } catch {
      // Clipboard API unavailable (non-secure context or permission denied): select the text so
      // a single keypress copies it — no deprecated copy APIs involved.
      output!.focus();
      output!.select();
      setStatus(root, `${label} is selected — press Ctrl+C (⌘C on Mac) to copy it.`);
    }
  }

  copyB64?.addEventListener('click', () => void copyText(base64, 'Base64'));
  copyUri?.addEventListener('click', () => void copyText(dataUri, 'Data URI'));

  async function handleFile(file: File): Promise<void> {
    dropzone.setBusy(true);
    setStatus(root, 'Encoding…', 'busy');
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const kind = sniffKind(buffer);
      const mime = mimeForKind(kind) ?? 'application/octet-stream';
      base64 = bytesToBase64(buffer);
      dataUri = bytesToDataUri(buffer, mime);

      const info = base64SizeInfo(file.size, mime);
      if (statsEl) {
        statsEl.textContent = `— original ${formatBytes(file.size)} · Base64 +${Math.round(info.overheadRatio * 100)}% larger · ${info.base64Chars.toLocaleString()} characters`;
      }
      output!.value = dataUri;
      outputWrap!.hidden = false;

      if (file.size > INLINE_WARN_BYTES) {
        setStatus(root, `Done — note: this file is ${formatBytes(file.size)}; inlining large images makes HTML/CSS heavy. Prefer a normal file for anything above ~20 KB.`, 'idle');
      } else {
        setStatus(root, `Done: ${file.name} detected as ${kindLabel(kind)}. The textarea holds the data URI; use the buttons for raw Base64.`);
      }
    } catch (err) {
      const msg = userMessage(err);
      setStatus(root, `${msg.title} ${msg.body}`, 'error');
    } finally {
      dropzone.setBusy(false);
    }
  }
}

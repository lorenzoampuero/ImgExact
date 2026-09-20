/**
 * Homepage quick start: analyze a dropped file from headers only (fast, safe),
 * then point the user at the right tool. No file is stored or transferred.
 */
import { readHead } from '../engine/decode';
import { sniffKind, readDimensions, kindLabel, mimeForKind } from '../engine/headers';
import { formatBytes, formatRatio } from '../engine/format';
import { h } from './ui/dom';
import { createPageDropTarget } from './ui/dropzone';

export default function initHome(): void {
  const zone = document.querySelector<HTMLElement>('[data-home-dropzone]');
  const input = document.querySelector<HTMLInputElement>('[data-home-input]');
  const output = document.querySelector<HTMLElement>('[data-home-output]');
  if (!zone || !input || !output) return;

  const actions: Array<{ href: string; label: string }> = [
    { href: '/compress-image-to-size', label: 'Compress to a size' },
    { href: '/resize-image', label: 'Resize' },
    { href: '/convert-image', label: 'Convert' },
    { href: '/crop-image', label: 'Crop' },
  ];

  const render = (file: File, summary: string, ok: boolean) => {
    output.hidden = false;
    output.innerHTML = '';
    output.append(
      h('p', { class: 'small', style: 'margin-bottom: var(--sp-2);' }, [
        h('span', { class: `badge badge--${ok ? 'accent' : 'error'}`, text: ok ? 'Detected' : 'Unreadable' }),
        document.createTextNode(` ${file.name} — ${summary}`),
      ]),
    );
    if (ok) {
      const row = h('div', { style: 'display:flex; gap: var(--sp-2); flex-wrap: wrap;' });
      for (const action of actions) {
        row.append(h('a', { class: 'btn btn--secondary small', href: action.href, text: action.label }));
      }
      output.append(h('p', { class: 'xsmall muted', style: 'margin: var(--sp-2) 0 0;', text: 'Open a tool and drop the file again — it stays on your device at every step.' }));
      output.append(row);
    }
  };

  const analyze = async (file: File) => {
    try {
      const head = await readHead(file);
      const kind = sniffKind(head);
      const mime = mimeForKind(kind);
      if (!mime || (kind !== 'jpeg' && kind !== 'png' && kind !== 'webp' && kind !== 'avif' && kind !== 'gif' && kind !== 'bmp' && kind !== 'heic')) {
        render(file, 'this does not look like a supported image format (JPEG, PNG, WebP, AVIF, GIF, BMP).', false);
        return;
      }
      const dims = readDimensions(head, kind);
      const size = formatBytes(file.size);
      const parts = [kindLabel(kind), size];
      if (dims) parts.splice(1, 0, `${dims.width} × ${dims.height} px`, formatRatio(dims.width, dims.height));
      if (kind === 'heic') parts.push('— HEIC opens only in browsers that decode it (Safari)');
      render(file, parts.join(' · '), true);
    } catch {
      render(file, 'the file could not be read.', false);
    }
  };

  const pick = () => input.click();
  zone.addEventListener('click', pick);
  zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pick();
    }
  });
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) void analyze(file);
    input.value = '';
  });
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('is-dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
  zone.addEventListener('drop', (event) => {
    // Delivery is handled by the page-wide drop target below.
    event.preventDefault();
    zone.classList.remove('is-dragover');
  });

  // Same conveniences as the tool pages: drop anywhere, or paste from the clipboard.
  createPageDropTarget((file) => void analyze(file));

  document.addEventListener('paste', (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          void analyze(file);
        }
        return;
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHome);
} else {
  initHome();
}

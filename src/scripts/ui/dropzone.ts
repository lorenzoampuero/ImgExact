/**
 * Dropzone wiring: click, drag & drop, paste, keyboard. One dropzone per page.
 */

import { h, qs, qsMaybe, setStatus } from './dom';

export interface DropzoneOptions {
  onFile: (file: File) => void;
  /** Called when the user pastes/drops something unusable. */
  onReject?: (message: string) => void;
}

export interface DropzoneHandle {
  setBusy(busy: boolean): void;
  /** Re-enables the zone and clears any busy state (after "start over"). */
  reset(): void;
}

export function initDropzone(root: HTMLElement, opts: DropzoneOptions): DropzoneHandle {
  const input = qs<HTMLInputElement>(root, '[data-role="file-input"]');
  const zone = qs<HTMLLabelElement>(root, '[data-role="dropzone"]');
  if (!input || !zone) {
    throw new Error('Dropzone markup missing');
  }

  let busy = false;
  let dragDepth = 0;

  const handleFiles = (files: FileList | null | undefined) => {
    if (busy) return;
    const file = files?.[0];
    if (!file) return;
    opts.onFile(file);
  };

  input.addEventListener('change', () => {
    handleFiles(input.files);
    input.value = '';
  });

  zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });

  zone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dragDepth++;
    zone.classList.add('is-dragover');
  });
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });
  zone.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) zone.classList.remove('is-dragover');
  });
  zone.addEventListener('drop', (event) => {
    // File delivery is handled by the page-wide drop target below; here we only
    // reset the zone styling and keep the browser from opening the file.
    event.preventDefault();
    dragDepth = 0;
    zone.classList.remove('is-dragover');
  });

  // Dropping anywhere on the page loads the file (with an explanatory overlay).
  const pageDrop = createPageDropTarget((file) => opts.onFile(file), {
    enabled: () => !busy,
  });

  // Clipboard paste (images copied from editors/screenshots).
  document.addEventListener('paste', (event) => {
    if (busy) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          opts.onFile(file);
        }
        return;
      }
    }
  });

  const setBusy = (value: boolean) => {
    busy = value;
    zone.classList.toggle('is-busy', value);
    zone.setAttribute('aria-disabled', value ? 'true' : 'false');
    const runBtn = qsMaybe<HTMLButtonElement>(root, '[data-role="run"]');
    if (runBtn) {
      if (value) runBtn.setAttribute('aria-busy', 'true');
      else runBtn.removeAttribute('aria-busy');
    }
    if (value) pageDrop.dismiss();
  };

  return {
    setBusy,
    reset: () => {
      setBusy(false);
      zone.classList.remove('is-dragover');
      setStatus(root, '');
    },
  };
}

/** One overlay per page, created lazily on the first file drag. */
function ensurePageOverlay(): HTMLElement {
  let overlay = document.querySelector<HTMLElement>('[data-page-drop]');
  if (!overlay) {
    overlay = h('div', { class: 'drop-overlay', 'data-page-drop': '' }, [
      h('div', { class: 'drop-overlay__panel' }, [
        h('p', { class: 'drop-overlay__title', text: 'Drop your image anywhere' }),
        h('p', {
          class: 'small',
          text: 'It is processed locally on this device — nothing is uploaded.',
        }),
      ]),
    ]);
    document.body.append(overlay);
  }
  return overlay;
}

/**
 * Page-wide drop target: a file dropped anywhere on the page is delivered to
 * `onFile`, with an overlay that explains what is about to happen.
 * `enabled` lets a caller suppress the target while a tool is busy.
 */
export function createPageDropTarget(
  onFile: (file: File) => void,
  options: { enabled?: () => boolean } = {},
): { dismiss(): void } {
  const enabled = options.enabled ?? (() => true);
  const overlay = ensurePageOverlay();
  let depth = 0;

  const isFileDrag = (event: DragEvent): boolean =>
    Array.from(event.dataTransfer?.types ?? []).includes('Files');

  const dismiss = (): void => {
    depth = 0;
    overlay.classList.remove('is-active');
  };

  window.addEventListener('dragenter', (event) => {
    if (!isFileDrag(event) || !enabled()) return;
    depth += 1;
    overlay.classList.add('is-active');
  });
  window.addEventListener('dragover', (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('dragleave', () => {
    // No dataTransfer check here on purpose: some browsers deliver the final
    // dragleave without it, and a stuck overlay is worse than a missed event.
    if (depth === 0) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) overlay.classList.remove('is-active');
  });
  window.addEventListener('drop', (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dismiss();
    if (!enabled()) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) onFile(file);
  });

  return { dismiss };
}

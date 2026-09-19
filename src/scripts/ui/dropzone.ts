/**
 * Dropzone wiring: click, drag & drop, paste, keyboard. One dropzone per page.
 */

import { qs, setStatus } from './dom';

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
    event.preventDefault();
    dragDepth = 0;
    zone.classList.remove('is-dragover');
    handleFiles(event.dataTransfer?.files);
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

/**
 * Result panel renderer — the "always show meaningful result information" contract.
 * Before/after stats, honest notes, download, optional next actions, start-over.
 */

import { formatBytes } from '../../engine/format';
import { h } from './dom';
import { renderCompare } from './compare';
import { objectUrl, revokePrevious } from './urls';

export interface SideStats {
  sizeBytes?: number;
  width?: number;
  height?: number;
  formatLabel?: string;
}

export interface ResultNote {
  kind: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  body: string;
}

export interface ResultAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface ResultData {
  heading: string;
  badge: { label: string; kind: 'success' | 'warning' | 'error' | 'accent' };
  before?: SideStats;
  after?: SideStats;
  details?: Array<[string, string]>;
  note?: ResultNote;
  previewBlob?: Blob | null;
  previewAlt?: string;
  /**
   * The original file. When its dimensions match the result, the panel renders
   * an interactive before/after comparison instead of a plain preview.
   */
  beforePreviewBlob?: Blob | null;
  beforePreviewAlt?: string;
  download?: { blob: Blob; filename: string; label?: string } | null;
  extraActions?: ResultAction[];
  onReset?: () => void;
  related?: Array<{ href: string; label: string }>;
}

function sideColumn(title: string, stats: SideStats | undefined): HTMLElement {
  const col = h('div', { class: 'result__col' }, [h('h3', { text: title })]);
  if (stats?.sizeBytes !== undefined) {
    col.append(h('div', { class: 'result__figure', text: formatBytes(stats.sizeBytes) }));
  }
  const rows: Array<[string, string]> = [];
  if (stats?.width !== undefined && stats.height !== undefined) {
    rows.push(['Dimensions', `${stats.width} × ${stats.height} px`]);
  }
  if (stats?.formatLabel) rows.push(['Format', stats.formatLabel]);
  if (rows.length > 0) {
    const dl = h('dl', { class: 'result__dl' });
    for (const [term, value] of rows) {
      dl.append(h('div', {}, [h('dt', { text: term }), h('dd', { text: value })]));
    }
    col.append(dl);
  }
  return col;
}

export function renderResult(container: HTMLElement, data: ResultData): void {
  revokePrevious();
  container.innerHTML = '';
  container.hidden = false;

  const root = h('div', { class: 'result' });

  root.append(
    h('div', { class: 'result__head' }, [
      h('span', { class: `badge badge--${data.badge.kind}`, text: data.badge.label }),
      h('strong', { text: data.heading }),
    ]),
  );

  if (data.before || data.after) {
    root.append(
      h('div', { class: 'result__grid' }, [
        sideColumn('Before', data.before),
        sideColumn('After', data.after),
      ]),
    );
  }

  const preview = previewBlock(data);
  if (preview) root.append(preview);

  if (data.details && data.details.length > 0) {
    const dl = h('dl', { class: 'result__dl', style: 'padding: 0 var(--sp-5) var(--sp-3);' });
    for (const [term, value] of data.details) {
      dl.append(h('div', {}, [h('dt', { text: term }), h('dd', { text: value })]));
    }
    root.append(dl);
  }

  if (data.note) {
    const note = h('div', { class: `note note--${data.note.kind}`, style: 'margin: var(--sp-3) var(--sp-5);' });
    if (data.note.title) note.append(h('p', { class: 'note__title', text: data.note.title }));
    note.append(h('p', { class: 'small', text: data.note.body }));
    root.append(note);
  }

  const actions = h('div', { class: 'result__actions' });

  if (data.download) {
    const url = objectUrl(data.download.blob);
    const a = h('a', {
      class: 'btn btn--primary',
      href: url,
      download: data.download.filename,
      text: data.download.label ?? 'Download result',
      'data-role': 'download',
    });
    actions.append(a);
  }

  for (const action of data.extraActions ?? []) {
    actions.append(
      h('button', {
        class: `btn btn--${action.variant ?? 'secondary'}`,
        type: 'button',
        text: action.label,
        onclick: action.onClick,
      }),
    );
  }

  if (data.onReset) {
    actions.append(
      h('button', {
        class: 'btn btn--ghost',
        type: 'button',
        text: 'Start over',
        onclick: data.onReset,
        'data-role': 'reset',
      }),
    );
  }

  root.append(actions);

  if (data.related && data.related.length > 0) {
    const related = h('div', { style: 'padding: 0 var(--sp-5) var(--sp-4);' }, [
      h('p', { class: 'small muted', text: 'You may also need:' }),
    ]);
    const links = h('div', { style: 'display:flex; gap: var(--sp-3); flex-wrap:wrap;' });
    for (const item of data.related.slice(0, 3)) {
      links.append(h('a', { class: 'btn btn--secondary small', href: item.href, text: item.label }));
    }
    related.append(links);
    root.append(related);
  }

  container.append(root);
}

/** Maximum pixel count for which a live comparison is rendered (memory guard). */
const COMPARE_MAX_PIXELS = 32_000_000;

/**
 * A comparison only makes sense when the result keeps the original dimensions
 * (compression, conversion). Resize and crop change geometry, so they keep the
 * plain preview.
 */
function compareBlock(data: ResultData): HTMLElement | null {
  const afterBlob = data.previewBlob;
  const beforeBlob = data.beforePreviewBlob;
  if (!afterBlob || !beforeBlob) return null;

  const width = data.after?.width;
  const height = data.after?.height;
  if (width === undefined || height === undefined) return null;
  if (data.before?.width !== width || data.before?.height !== height) return null;
  if (width * height > COMPARE_MAX_PIXELS) return null;

  return renderCompare({
    beforeUrl: objectUrl(beforeBlob),
    afterUrl: objectUrl(afterBlob),
    width,
    height,
    beforeAlt: data.beforePreviewAlt ?? 'Original image (before)',
    afterAlt: data.previewAlt ?? 'Result image (after)',
  });
}

function previewBlock(data: ResultData): HTMLElement | null {
  if (!data.previewBlob) return null;
  return (
    compareBlock(data) ??
    h('div', { class: 'result__preview' }, [
      h('img', {
        src: objectUrl(data.previewBlob),
        alt: data.previewAlt ?? 'Result preview',
        loading: 'eager',
      }),
    ])
  );
}

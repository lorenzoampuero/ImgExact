/**
 * Before/after comparison.
 * A native range control drives a CSS custom property, so pointer, touch and
 * keyboard interaction all work without bespoke drag handling.
 */
import { h } from './dom';

export interface CompareOptions {
  beforeUrl: string;
  afterUrl: string;
  width: number;
  height: number;
  beforeAlt?: string;
  afterAlt?: string;
}

export function renderCompare(opts: CompareOptions): HTMLElement {
  const stage = h('div', {
    class: 'compare__stage',
    style: `--compare: 50%; aspect-ratio: ${opts.width} / ${opts.height};`,
  });

  stage.append(
    h('img', {
      class: 'compare__after',
      src: opts.afterUrl,
      alt: opts.afterAlt ?? 'Result image',
      draggable: false,
    }),
    h('span', { class: 'compare__before' }, [
      h('img', { src: opts.beforeUrl, alt: opts.beforeAlt ?? 'Original image (before)', draggable: false }),
    ]),
    h('span', { class: 'compare__divider', 'aria-hidden': 'true' }),
  );

  const range = h('input', {
    class: 'compare__range',
    type: 'range',
    min: 0,
    max: 100,
    step: 1,
    value: 50,
    'aria-label': 'Comparison position — move right to reveal more of the result',
  });
  range.addEventListener('input', () => {
    stage.style.setProperty('--compare', `${range.value}%`);
  });

  return h('div', { class: 'compare' }, [
    stage,
    h('div', { class: 'compare__controls' }, [
      h('span', { text: 'Before' }),
      range,
      h('span', { text: 'After' }),
    ]),
  ]);
}

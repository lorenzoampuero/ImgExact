/**
 * Tiny DOM helpers for the client-side controllers.
 */

type Props = Record<string, unknown>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props,
  children?: Array<Node | string | null | undefined>,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null) continue;
      if (key === 'class') el.className = String(value);
      else if (key === 'text') el.textContent = String(value);
      else if (key.startsWith('data-') || key.startsWith('aria-')) el.setAttribute(key, String(value));
      else (el as unknown as Record<string, unknown>)[key] = value;
    }
  }
  for (const child of children ?? []) {
    if (child === null || child === undefined) continue;
    el.append(child);
  }
  return el;
}

/**
 * Strict query: returns a non-null element or throws with a clear message.
 * Required tool markup missing = programming error, fail fast and loud.
 */
export function qs<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`toolkit: required element not found: ${selector}`);
  return el;
}

/** Optional query for elements that may legitimately be absent. */
export function qsMaybe<T extends Element>(root: ParentNode, selector: string): T | null {
  return root.querySelector<T>(selector);
}

export function qsa<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function show(el: HTMLElement, visible: boolean): void {
  el.hidden = !visible;
}

export function inputValue(root: ParentNode, field: string): string {
  const el = qs<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(root, `[data-field="${field}"]`);
  return el?.value ?? '';
}

export function checkboxValue(root: ParentNode, field: string): boolean {
  const el = qs<HTMLInputElement>(root, `[data-field="${field}"]`);
  return Boolean(el?.checked);
}

export function radioValue(root: ParentNode, name: string): string | null {
  const el = qs<HTMLInputElement>(root, `input[name="${name}"]:checked`);
  return el?.value ?? null;
}

export function setStatus(root: ParentNode, message: string, kind: 'idle' | 'busy' | 'error' | 'success' = 'idle'): void {
  const status = qsMaybe<HTMLElement>(root, '[data-role="status"]');
  if (!status) return;
  status.textContent = '';
  status.classList.remove('is-error');
  if (kind === 'busy') {
    const spinner = h('span', { class: 'spinner', 'aria-hidden': 'true' });
    status.append(spinner);
  }
  status.append(document.createTextNode(message));
  if (kind === 'error') status.style.color = 'var(--error)';
  else if (kind === 'success') status.style.color = 'var(--success)';
  else status.style.color = '';
}

/**
 * Per-tool interface preferences (last-used options) kept in localStorage.
 * Only interface choices are stored — never file data, filenames, metadata or
 * results. Storage failures (private mode, quota) are silently ignored: the
 * tools must work identically without preferences.
 */

const STORAGE_KEY = 'imgexact.prefs.v1';

type PrefStore = Record<string, Record<string, string>>;

function readStore(): PrefStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as PrefStore;
    }
    return {};
  } catch {
    return {};
  }
}

function writeStore(store: PrefStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* Preferences are optional by design. */
  }
}

export function loadPrefs(slug: string): Record<string, string> {
  return readStore()[slug] ?? {};
}

export function savePrefs(slug: string, patch: Record<string, string>): void {
  const store = readStore();
  store[slug] = { ...(store[slug] ?? {}), ...patch };
  writeStore(store);
}

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function fieldSelector(key: string): string {
  return key.startsWith('radio:')
    ? `input[type="radio"][name="${key.slice(6)}"]`
    : `[data-field="${key}"]`;
}

function dispatchChange(el: Field): void {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Applies stored preferences to the panel and notifies the controller's own handlers. */
export function applyPrefs(root: HTMLElement, slug: string): void {
  const prefs = loadPrefs(slug);
  for (const [key, value] of Object.entries(prefs)) {
    if (key.startsWith('radio:')) {
      const group = Array.from(root.querySelectorAll<HTMLInputElement>(fieldSelector(key)));
      const match = group.find((radio) => radio.value === value);
      if (match && !match.checked) {
        match.checked = true;
        dispatchChange(match);
      }
      continue;
    }
    const el = root.querySelector<Field>(fieldSelector(key));
    if (!el) continue;
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      if (el.checked !== (value === '1')) {
        el.checked = value === '1';
        dispatchChange(el);
      }
    } else if (el.value !== value) {
      el.value = value;
      dispatchChange(el);
    }
  }
}

/** Persists the panel's options as the visitor changes them. */
export function watchPrefs(root: HTMLElement, slug: string): void {
  const persist = (el: Field): void => {
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      const name = el.getAttribute('name');
      if (name && el.checked) savePrefs(slug, { [`radio:${name}`]: el.value });
      return;
    }
    const field = (el as HTMLInputElement).dataset?.field;
    if (!field) return;
    const value =
      el instanceof HTMLInputElement && el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
    savePrefs(slug, { [field]: value });
  };

  for (const el of Array.from(root.querySelectorAll<Field>('input, select, textarea'))) {
    el.addEventListener('change', () => persist(el));
  }
}

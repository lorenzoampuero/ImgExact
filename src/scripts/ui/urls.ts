/**
 * Object-URL lifecycle: every URL we create is revoked when results are
 * replaced or when the page unloads. No URLs leak.
 */

let active: string[] = [];

export function objectUrl(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  active.push(url);
  return url;
}

/** Revokes all outstanding preview URLs (call before rendering a new result). */
export function revokePrevious(): void {
  for (const url of active) {
    try { URL.revokeObjectURL(url); } catch { /* already revoked */ }
  }
  active = [];
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', revokePrevious);
}

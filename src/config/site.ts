/**
 * Single source of truth for site-level configuration.
 * Rebranding = edit `name` + `url` here (see research/BRAND_OPTIONS.md).
 */

export const SITE = {
  /** Working brand — final trademark/domain verification pending (research/BRAND_OPTIONS.md). */
  name: 'ImgExact',
  /** Short positioning line used in meta and hero contexts. */
  tagline: 'Make any image fit the exact requirement.',
  description:
    'Resize, compress, convert and prepare any image to an exact requirement — directly in your browser. Free, no signup, and your images never leave your device.',
  /**
   * DEPLOY BLOCKER: placeholder origin used for canonical URLs, sitemap and robots.txt.
   * Replace with the real production origin (protocol + host, no trailing slash) before deploying.
   */
  url: 'https://imgexact.com',
  locale: 'en',
  /** Ads stay disabled until explicitly enabled after launch review (docs/ADSENSE_READINESS.md). */
  adsEnabled: false,
  social: {
    /** No social accounts exist yet; do not fabricate handles. */
    x: null as string | null,
  },
  /** Safety limits for local processing (bytes and decoded pixels). */
  limits: {
    warnFileBytes: 50 * 1024 * 1024, // 50 MB — warn
    maxFileBytes: 200 * 1024 * 1024, // 200 MB — reject
    warnPixels: 40_000_000, // 40 MP — warn
    maxPixels: 100_000_000, // 100 MP — reject before decode (decompression-bomb guard)
  },
} as const;

export function absoluteUrl(pathOrUrl: string): string {
  const url = new URL(SITE.url);
  const base = url.href.endsWith('/') ? url.href : `${url.href}/`;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl.slice(1) : pathOrUrl;
  return new URL(path, base).href;
}

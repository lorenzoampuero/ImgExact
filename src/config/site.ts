/**
 * Single source of truth for site-level configuration.
 * Rebranding = edit `name` + `url` here (see research/BRAND_OPTIONS.md).
 */

/**
 * DEPLOY BLOCKER — placeholder origin: canonical URLs, sitemap.xml and robots.txt all derive from it.
 * Preferred fix: set `PUBLIC_SITE_URL` in the build environment (no code change, see docs/DEPLOYMENT.md).
 */
const PLACEHOLDER_ORIGIN = 'https://imgexact.com';

/** True only while this module is evaluated by the build server (i.e., during `astro build`). */
const isBuildServer = import.meta.env.PROD && import.meta.env.SSR;

/** Resolve the production origin: `PUBLIC_SITE_URL` (build-time env) wins over the placeholder. */
function resolveOrigin(): string {
  const raw = import.meta.env?.PUBLIC_SITE_URL;
  const candidate = typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : '';
  if (candidate === '') return PLACEHOLDER_ORIGIN;
  if (/^https?:\/\/[^/]+$/.test(candidate)) return candidate;
  if (isBuildServer) {
    console.warn(
      `[ImgExact] Ignoring invalid PUBLIC_SITE_URL (expected an origin like https://example.com): ${raw}`,
    );
  }
  return PLACEHOLDER_ORIGIN;
}

const ORIGIN = resolveOrigin();

export const SITE = {
  /** Working brand — final trademark/domain verification pending (research/BRAND_OPTIONS.md). */
  name: 'ImgExact',
  /** Short positioning line used in meta and hero contexts. */
  tagline: 'Make any image fit the exact requirement.',
  description:
    'Resize, compress, convert and prepare any image to an exact requirement — directly in your browser. Free, no signup, and your images never leave your device.',
  /** Real origin from `PUBLIC_SITE_URL` (see resolveOrigin above); falls back to the placeholder. */
  url: ORIGIN,
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

// Build-time guard: never ship a build whose canonicals point at the placeholder domain.
// Runs only while the build server evaluates this module (client bundles see SSR=false).
if (isBuildServer && ORIGIN === PLACEHOLDER_ORIGIN) {
  console.warn(
    '[ImgExact] Site origin is still the placeholder https://imgexact.com — set PUBLIC_SITE_URL ' +
      'in the build environment (or edit src/config/site.ts) before deploying. Canonical URLs, ' +
      'sitemap.xml and robots.txt all derive from it. See docs/DEPLOYMENT.md.',
  );
}

export function absoluteUrl(pathOrUrl: string): string {
  const url = new URL(SITE.url);
  const base = url.href.endsWith('/') ? url.href : `${url.href}/`;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl.slice(1) : pathOrUrl;
  return new URL(path, base).href;
}

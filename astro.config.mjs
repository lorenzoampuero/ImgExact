// @ts-check
import { defineConfig } from 'astro/config';

// IMPORTANT: `site` must be the real production origin (canonical URLs, sitemap, robots).
// Preferred: set PUBLIC_SITE_URL in the build environment — no code change (docs/DEPLOYMENT.md).
// Fallback below is the placeholder — never deploy with it. Brand decision: research/BRAND_OPTIONS.md
const SITE_ORIGIN =
  (process.env.PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '') || 'https://imgexact.com';

export default defineConfig({
  site: SITE_ORIGIN,
  output: 'static',
  compressHTML: true,
  devToolbar: { enabled: false },
  build: {
    inlineStylesheets: 'auto',
  },
});

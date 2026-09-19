// @ts-check
import { defineConfig } from 'astro/config';

// `site` = production origin (canonical URLs, sitemap, robots). `PUBLIC_SITE_URL` overrides it for
// staging/preview builds. Domain decided 2026-09-19 (research/BRAND_OPTIONS.md).
const SITE_ORIGIN =
  (process.env.PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '') || 'https://www.imgexact.site';

export default defineConfig({
  site: SITE_ORIGIN,
  output: 'static',
  compressHTML: true,
  devToolbar: { enabled: false },
  build: {
    inlineStylesheets: 'auto',
  },
});

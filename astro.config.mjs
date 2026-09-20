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
  vite: {
    build: {
      // Script chunks stay external on purpose: the strict CSP (`script-src 'self'`,
      // vercel.json) blocks inline executable scripts, and the first-party
      // analytics loader must run. Inline *styles* are still allowed by the CSP.
      assetsInlineLimit: 0,
    },
  },
});

// @ts-check
import { defineConfig } from 'astro/config';

// IMPORTANT (deploy blocker): `site` is the placeholder origin for canonical URLs,
// sitemap and robots. Replace it with the real production origin before deploying.
// Brand decision + alternatives: research/BRAND_OPTIONS.md
export default defineConfig({
  site: 'https://imgexact.com',
  output: 'static',
  compressHTML: true,
  devToolbar: { enabled: false },
  build: {
    inlineStylesheets: 'auto',
  },
});

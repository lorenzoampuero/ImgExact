# ImgExact — Exact Image Toolkit

**Make any image fit the exact requirement.** Resize, compress, convert, crop and prepare
images to an exact KB, an exact pixel size, or a platform-specific format — entirely inside the
browser. No uploads, no signup, no limits, no watermarks.

This repository is a **static-first utility site** (research-driven, SEO-first) built with
Astro + TypeScript + a shared, tested image engine.

---

## Principles (enforced, not aspirational)

- **Local processing.** Every tool decodes, transforms and re-encodes in the browser. The network
  audit (`docs/PRIVACY_NETWORK_AUDIT.md`) verified zero image bytes, filenames or metadata leave
  the device.
- **Exact outcomes with honesty.** Targets are "≤ X", never fake-exact. Convergence is reported;
  impossible targets surface with the honest floor and recovery options — and dimension
  reduction only happens with explicit consent.
- **Sources for specs.** Platform sizes live in a versioned config with source URLs and review
  dates (`src/config/social-presets.ts`).
- **No doorway pages.** Numeric values (50 KB, 600×600, 20 KB signatures) are tool inputs —
  the slug policy is unit-tested.

## Toolset

| Tool | Route | Core problem |
|---|---|---|
| Compress to exact size | `/compress-image-to-size` | "Portal rejects files over 50 KB" |
| Image resizer | `/resize-image` | "Must be exactly 600×600" |
| Format converter | `/convert-image` | "Must be JPG/PNG/WebP — incl. HEIC where the browser reads it" |
| Cropper | `/crop-image` | "Must be 1:1 / 4:5 / 16:9" |
| Compressor | `/compress-image` | "Just make it smaller, good quality" |
| Size checker | `/image-size-checker` | "Check before I upload" |
| Signature resizer | `/signature-resizer` | "Signature: 140×60 px, ≤20 KB" |
| Social resizer | `/social-image-resizer` | "Current platform sizes, sourced" |
| Metadata viewer/remover | `/image-metadata` | "Remove GPS before sharing" |
| DPI tool | `/image-dpi` | "300 DPI — honestly explained and applied" |
| Base64 encoder | `/image-to-base64` | "Inline a small image" |

## Commands

```bash
npm ci            # clean install (Node >= 20.19; pinned in .nvmrc + package.json)
npm run dev       # dev server
npm test          # 102 unit tests (engine, validation, target-size convergence, registry policies)
npm run check     # astro check — typecheck, 0 errors required
npm run build     # static production build → dist/
npm run preview   # serve the built site (astro preview start/stop/status)
npm run fixtures  # regenerate local test fixtures + OG image (Windows PowerShell)
```

## Structure

```
src/engine/     framework-free image engine (headers, EXIF, transform math, target-size search…)
src/scripts/    client controllers per tool (lazy-loaded per slug) + shared UI helpers
src/data/       tool registry (the single source of truth for pages, SEO metadata, FAQs)
src/config/     site config + versioned social presets (sources + review dates)
src/pages/      static pages incl. robots.txt + sitemap.xml endpoints
research/       market validation, keyword map, competitor matrix, brand options (Gate 0)
docs/           project status, SEO registry, deployment, Search Console, Bing/IndexNow, AdSense, privacy audit
tests/          unit tests + synthetic fixtures (no copyrighted material)
```

## Status & going live

See `docs/PROJECT_STATUS.md` for the verified gate board. The production origin
(`https://imgexact.site`) is built in; deploying needs no origin configuration (`PUBLIC_SITE_URL`
is a staging override only) — see `docs/DEPLOYMENT.md` and the launch runbook `docs/LAUNCH_GATE.md`.
Then follow `docs/SEARCH_CONSOLE_SETUP.md` and `docs/BING_SETUP.md`.

Nothing in this repository is deployed, no analytics or ads are active, and no external service
is referenced at build time.

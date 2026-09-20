# PRIVACY NETWORK AUDIT — ImgExact

**Date executed:** 2026-09-19 · **Build audited:** production `dist/` served by `astro preview` at `http://localhost:4321`
**Method:** automated browser session (Chromium engine, VS Code integrated browser via Playwright) with a request listener capturing **every** network request (URL, method, whether a request body existed) during complete tool flows. Zero requests were filtered out of the log; the summary below covers the full capture.

---

## Flows executed under audit

| # | Flow | Tool |
|---|---|---|
| 1 | Upload 2000×1500 JPEG → compressor target 50 KB → result | `/compress-image-to-size` |
| 2 | Upload → resize to 800×600 → result | `/resize-image` |
| 3 | Upload → convert to PNG → result | `/convert-image` |
| 4 | Upload → ratio-locked crop → result | `/crop-image` |
| 5 | Upload EXIF-rotated JPEG → full inspection report | `/image-size-checker` |
| 6 | Navigation + asset loads across the above pages | site-wide |

Additional verified flows outside the instrumented capture (same build, same session): signature resizer, social resizer, metadata viewer+strip, DPI embed, Base64 encoder, homepage detection, four error paths.

## Results

| Metric | Value | Interpretation |
|---|---|---|
| Total requests observed | 58 | static site + fonts + per-tool JS chunks + previews |
| POST requests | **0** | no upload attempts of any kind |
| Requests to non-local origins | **0** real network requests | only `blob:` URLs, which are local in-memory object references — not network |
| Requests whose URL contained the fixture filename | **0** | filenames never used in requests |
| Requests containing image bytes (checked via body presence on all methods) | **0** | no request carried a body derived from the file |
| Console errors during audited flows | 0 | — |

**Conclusion:** the architectural promise holds in the built site. Images are decoded, transformed, encoded and previewed entirely inside the browser; the only artifacts produced are local `blob:` object URLs that never leave the device (they are revoked on the next run and on page unload).

## What the requests actually were

- The HTML document per navigation.
- Hashed static assets (`_astro/*.css`, `_astro/*.js` chunks, Inter font subsets).
- `favicon.svg`, `og-default.png` (referenced in head; fetched only when needed).
- `blob:` object URLs created by the result renderer for preview images and download links.

No third-party origins appear at all: fonts are self-hosted (Fontsource), scripts are self-hosted, and no analytics, ads, or external CDNs are loaded in this build.

## How to re-run (any machine with the repo)

1. `npm ci && npm run build && npm run preview` (server: `astro preview start`).
2. Open the site in any browser, open DevTools → Network, enable "Preserve log".
3. Upload a local image in any tool and complete a run + download.
4. Confirm: zero XHR/fetch to your origin or others carrying the image; no `POST` entries; only static asset + document requests.

## Scope and limitations (stated honestly)

- Executed in a Chromium-based engine only. Firefox and Safari were not available in this environment; the code uses standard, broadly supported APIs (`createImageBitmap`, canvas, `toBlob`/`convertToBlob`, `URL.createObjectURL`) with a fallback decode path, and **no** network APIs at all in the engines.
- No service worker is registered in this build.
- The audit covers the current build; any future feature that adds network calls (e.g., an optional cloud feature) must be audited again before shipping, and this document updated.

## Addendum — 2026-09-20: first-party page statistics added

The build audited above contained no analytics. On 2026-09-20 the site gained **Vercel Web Analytics** (cookieless, no cross-site identifiers — full description in `docs/ANALYTICS.md`). The properties this audit cares about were re-verified on the new build (local preview, Chromium):

- The analytics script is requested from **this origin** (`/_vercel/insights/script.js`) and the beacon posts to `/_vercel/insights/view` — both same-origin; no cookie, no third-party host.
- A tool page load produced **12 requests, 0 to non-local origins**; the only new request compared with the audited build is that same-origin script.
- Unchanged and re-checkable: no request carries image bytes, no request URL contains the fixture filename, and no request derives from tool input. The beacon fires only from the analytics script, never from tool code — the tools have no network APIs in them at all.
- Locally the beacon does not fire because the `/_vercel/insights/*` routes exist only on Vercel deployments; the script request is captured and asserted same-origin instead.

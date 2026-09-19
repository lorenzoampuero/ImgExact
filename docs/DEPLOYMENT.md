# DEPLOYMENT — prepared instructions (nothing deployed)

**Current state:** production build works (`npm run build` → `dist/`, 16 pages, exit 0). Deployment is **blocked on explicit user approval**, which per project rules is required before anything goes public. This document is the exact procedure for that moment.

---

## 0. The one code-side blocker

`src/config/site.ts` → `SITE.url` currently holds the placeholder origin `https://imgexact.com`.
Replace it with the real production origin (`https://` + host, no trailing slash), then rebuild.
Everything user-visible on the machine side derives from this value: canonicals, Open Graph URLs, sitemap, robots, JSON-LD.

**Checklist before rebuild:**

- [ ] Domain chosen + purchased by the operator (with brand/trademark checks from `research/BRAND_OPTIONS.md` completed).
- [ ] `SITE.name` updated if the brand changed (one-line change; the name appears via the config everywhere).
- [ ] `SITE.url` updated.
- [ ] `npm test && npm run check && npm run build` re-run green.

## 1. Build artifact

```powershell
npm ci
npm run build
```

Output: `dist/` — fully static (HTML, hashed `_astro/` assets, fonts, favicon, OG image). No server runtime, no database, no environment variables, no secrets.

## 2. Hosting options (any static host works)

| Option | Notes |
|---|---|
| Cloudflare Pages | Connect repo or upload `dist/`; free TLS; set build command `npm run build`, output `dist` |
| Netlify / Vercel | Same shape; build `npm run build`, publish `dist` |
| Any nginx/Apache host | Serve `dist/` as document root |

**Recommended headers (host config):**

- `_astro/*` (content-hashed): `Cache-Control: public, max-age=31536000, immutable`
- `*.html`: `Cache-Control: public, max-age=0, must-revalidate`
- Security: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a conservative `Content-Security-Policy` (script-src 'self'; img-src 'self' blob: data: — the `blob:` allowance is required for preview images; no external origins are needed at all).

## 3. DNS

1. Create the site at the host first; get the target (CNAME or A records).
2. At the registrar: add the records the host specifies; apex + `www` as preferred (redirect one to the other — pick `www` as canonical or apex consistently with `SITE.url`).
3. Enable HTTPS (automatic on the hosts above; Let's Encrypt elsewhere). Verify both protocols redirect to the canonical origin.

## 4. Post-deploy verification (do all of these, in order)

1. `https://<domain>/` loads; drop a test image through two tools end-to-end.
2. `https://<domain>/robots.txt` → contains the sitemap URL on the **final** domain.
3. `https://<domain>/sitemap.xml` → 200, 15 URLs, all on the final domain.
4. Open a tool page → view source: canonical = own URL; title/description unique; JSON-LD present.
5. `https://<domain>/404` path tests: an unknown URL returns the styled 404 page with `noindex`.
6. Cache headers spot-check (`_astro/*` immutable; HTML revalidate).
7. Then, and only then: complete `docs/SEARCH_CONSOLE_SETUP.md` and `docs/BING_SETUP.md` (with IndexNow key creation).

## 5. Rollback

Static hosting rollbacks are trivial: keep the previous `dist/` (or the host's previous deployment) and re-point. No data migrations exist, so rollback is lossless.

## 6. Explicit non-actions (project rules)

- Nothing has been deployed.
- No domain purchased, no DNS touched, no accounts created, no costs incurred.
- No `wrangler`/`netlify`/`vercel` CLIs invoked; no `.env` files or secrets exist in this repo.

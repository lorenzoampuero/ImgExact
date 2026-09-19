# DEPLOYMENT — prepared instructions (nothing deployed)

**Current state:** **deployed** by the operator on Vercel (2026-09-19); serving at `https://www.imgexact.site` — the canonical host (apex `imgexact.site` 308-redirects to it, consistent with canonicals/sitemap/robots; aligned 2026-09-19). This document covers deployment mechanics; the step-by-step sequence and the `VERIFIED PROD` definition live in `docs/LAUNCH_GATE.md`.

---

## 0. The production origin

The site origin is **`https://www.imgexact.site`** (canonical host — the apex 308-redirects to it; aligned 2026-09-19) — built into `src/config/site.ts` as the default; `PUBLIC_SITE_URL` can override it for staging/preview builds only.
Everything user-visible on the machine side derives from this value: canonicals, Open Graph URLs, sitemap, robots, JSON-LD. The default build therefore already carries the production origin — no code change or env variable is required for a standard deploy.

**Sequencing (recommended):** launch once on the definitive domain — a temporary-subdomain launch would later force canonical/sitemap rewrites and a Search Console property change. Full runbook: `docs/LAUNCH_GATE.md`.

**Checklist before rebuild:**

- [ ] Domain `imgexact.site` owned by the operator (registrar WHOIS + trademark checks from `research/BRAND_OPTIONS.md` completed at purchase).
- [ ] `SITE.name` updated if the brand changed (one-line change; the name appears via the config everywhere).
- [ ] `npm test && npm run check && npm run build` re-run green — sanity check: first `<loc>` in `dist/sitemap.xml` is `https://www.imgexact.site/`.
- [ ] (Staging/preview only) `PUBLIC_SITE_URL` set where needed; never point a production deploy at it.

## 1. Build artifact

```powershell
npm ci
npm run build
```

Output: `dist/` — fully static (HTML, hashed `_astro/` assets, fonts, favicon, OG image). No server runtime, no database, no secrets; the only build-time variable is the optional `PUBLIC_SITE_URL` origin override.

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

## 6. Project rules — what the assistant never does

- The assistant never deploys, buys domains, or touches DNS — the 2026-09-19 production deployment on Vercel was performed by the operator.
- No `wrangler`/`netlify`/`vercel` CLIs invoked by the assistant; no `.env` files or secrets exist in this repo.

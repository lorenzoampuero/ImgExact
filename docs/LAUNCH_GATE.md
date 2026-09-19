# PRODUCTION LAUNCH GATE — ImgExact (the exact launch sequence)

**Purpose:** the single sequence to execute when going live, and the definition of `VERIFIED PROD`.
**Rules:** deploying requires **explicit user authorization** (project rule). Declare `VERIFIED PROD` only when every item in the final checklist is checked with recorded evidence.

**Current state:** nothing deployed; no domain purchased; ads disabled (`SITE.adsEnabled: false`). Blocked on: (1) domain decision + purchase, (2) explicit deploy authorization.

---

## 0. Preconditions

- [ ] Domain chosen + purchased (brand/trademark checks per `research/BRAND_OPTIONS.md` completed).
- [ ] Explicit authorization to deploy given.

**Why domain-first:** launching on a temporary host subdomain would later force canonical/origin/sitemap rewrites and a Search Console property change. One launch, definitive URLs.

## 1. Set the production origin

Preferred (no code change): set `PUBLIC_SITE_URL=https://<domain>` in the host's build settings.
Alternative: edit the `url` fallback in `src/config/site.ts`.
No `.env` files are committed; this project has no secrets.

## 2. Clean build — must be warning-free

```
npm ci
npm test        # expected: 102 tests passed
npm run check   # expected: 0 errors, 0 warnings, 0 hints
npm run build   # expected: 16 pages; must NOT print the [ImgExact] placeholder warning
```

If the placeholder warning appears, the origin is not set — stop and fix step 1.

## 3. Deploy

Any static host (Cloudflare Pages / Netlify / Vercel / plain nginx — see `docs/DEPLOYMENT.md` §2 for recommended headers). Serve `dist/`. HTTPS required everywhere.

## 4. Production verification (automated + manual)

- [ ] `node scripts/prod-check.mjs --origin https://<domain>` → **exit 0**, all checks PASS
  (verifies: 200s; self-referencing canonicals on the real origin; exactly one H1 per page; JSON-LD present; robots Sitemap line; 15 sitemap URLs, all on-origin).
- [ ] Manual: run a real image through `/compress-image-to-size` and `/resize-image`; downloads work.
- [ ] Manual: `https://<domain>/definitely-not-a-page` → styled 404.
- [ ] Spot-check one tool page's source: canonical + JSON-LD present.

## 5. Lighthouse on production — mobile form factor

```
npx lighthouse https://<domain> --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo --view
```

- Record the scores + date in `docs/PROJECT_STATUS.md` (this replaces the "Lighthouse not run" caveat).
- Investigate anything below 90 as a bug, not a nicety.

## 6. Real-device smoke

- Open `https://<domain>` on a physical phone (Safari or Chrome), run one tool end-to-end (upload → process → download). Confirm no layout breakage.

## 7. Google Search Console

Follow `docs/SEARCH_CONSOLE_SETUP.md` in order: domain property → DNS verification → submit `sitemap.xml` (expect 15 URLs) → inspect `/` and the main tools → start the watchlist loop.

## 8. Bing Webmaster Tools + IndexNow

Follow `docs/BING_SETUP.md`: add the site (fastest: import from GSC), confirm the sitemap, and — only for URLs that actually changed — submit via `scripts/indexnow.mjs` with the deploy-time key file.

## 9. Request indexing (Google)

- `/` plus the 4–6 main tools, **spaced out** (not a bulk request).

## 10. Ads remain OFF

`SITE.adsEnabled` stays `false`. Monetization is not part of this gate — indexation and real query data come first (`docs/ADSENSE_READINESS.md` remains the future gate).

## 11. Monitoring cadence

- Weekly, then settle: Queries / Pages+CTR / Countries / Core Web Vitals / Indexing per `docs/SEARCH_CONSOLE_SETUP.md` §5 + the launch watchlist.
- Record material findings in `docs/PROJECT_STATUS.md`.

---

## VERIFIED PROD — declaration checklist

Declare only when **all** items below hold, with evidence pasted into `docs/PROJECT_STATUS.md` (Gate 12):

- [ ] Production build log shows **no placeholder warning**; `PUBLIC_SITE_URL` was used.
- [ ] `prod-check` exit 0 (paste the PASS summary).
- [ ] Lighthouse mobile scores recorded (all four categories).
- [ ] Real-phone smoke passed.
- [ ] GSC property verified; sitemap processed with 15 URLs.
- [ ] Bing site added; first IndexNow submission (if applicable) returned 200.
- [ ] 404 page + one tool flow verified by hand on production.

**Rollback:** keep the previous `dist/` or the host's previous deployment — static hosting rollbacks are lossless (`docs/DEPLOYMENT.md` §5).

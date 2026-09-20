# PRODUCTION LAUNCH GATE — ImgExact (the exact launch sequence)

**Purpose:** the single sequence to execute when going live, and the definition of `VERIFIED PROD`.
**Rules:** deploying requires **explicit user authorization** (project rule). Declare `VERIFIED PROD` only when every item in the final checklist is checked with recorded evidence.

**Current state:** **DEPLOYED** by the operator on Vercel (2026-09-19). Serving at `https://www.imgexact.site` — the canonical host: canonicals, sitemap and robots all use it, and the apex `imgexact.site` 308-redirects to it (aligned 2026-09-19). Automated verification: `prod-check` PASS on both hosts (9/9 live, before the FAQPage + analytics checks existed; **11/11 dry-run** on the 2026-09-20 build); 404 styled with status 404; assets immutable-cached; HSTS present. Ads disabled (`SITE.adsEnabled: false`); first-party cookieless analytics **live and verified 2026-09-20** — `GET /_vercel/insights/script.js` 200 and `POST /_vercel/insights/view` 200 observed in a real browser (`docs/ANALYTICS.md`). Remaining for `VERIFIED PROD`: Lighthouse mobile, real-phone smoke, Search Console + Bing, indexing requests.

---

## 0. Preconditions

- [x] Domain `imgexact.site` registered by the operator + DNS control (live since 2026-09-19).
- [x] Deploy executed by the operator (Vercel, 2026-09-19).

**Why domain-first:** launching on a temporary host subdomain would later force canonical/origin/sitemap rewrites and a Search Console property change. One launch, definitive URLs.

## 1. Production origin — nothing to configure

The build already defaults to **`https://www.imgexact.site`** (`src/config/site.ts`). A standard deploy needs no environment variable: canonicals, sitemap and robots come out on the right origin.
`PUBLIC_SITE_URL` exists only to override the origin for staging/preview builds — never point a production deploy at it. No `.env` files are committed; this project has no secrets.

## 2. Clean build — must be warning-free

```
npm ci
npm test        # expected: 102 tests passed
npm run check   # expected: 0 errors, 0 warnings, 0 hints
npm run build   # expected: 16 pages; check: first <loc> in dist/sitemap.xml is https://www.imgexact.site/
```

If the sitemap shows a different origin, an override is in effect — stop and fix step 1.

## 3. Deploy

Any static host (Cloudflare Pages / Netlify / Vercel / plain nginx — see `docs/DEPLOYMENT.md` §2 for recommended headers). Serve `dist/`. HTTPS required everywhere.

## 4. Production verification (automated + manual)

- [ ] `node scripts/prod-check.mjs --origin https://www.imgexact.site` → **exit 0**, all checks PASS
  (verifies: 200s; self-referencing canonicals on the real origin; exactly one H1 per page; JSON-LD present incl. FAQPage whose questions/answers are visible; robots Sitemap line; 15 sitemap URLs, all on-origin; analytics component in the HTML).
- [ ] Analytics: *Enable* in the Vercel dashboard, then confirm the same-origin beacon (`/_vercel/insights/view`) on a production page — the `Web Analytics script route` check must go from WARN to PASS (`docs/ANALYTICS.md`). **Done 2026-09-20:** both PASS, beacon observed 200.
- [ ] Manual: run a real image through `/compress-image-to-size` and `/resize-image`; downloads work.
- [ ] Manual: `https://<domain>/definitely-not-a-page` → styled 404.
- [ ] Spot-check one tool page's source: canonical + JSON-LD present.

## 5. Lighthouse on production — mobile form factor

```
npx lighthouse https://www.imgexact.site --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo --view
```

- Record the scores + date in `docs/PROJECT_STATUS.md` (this replaces the "Lighthouse not run" caveat).
- Investigate anything below 90 as a bug, not a nicety.

## 6. Real-device smoke

- Open `https://www.imgexact.site` on a physical phone (Safari or Chrome), run one tool end-to-end (upload → process → download). Confirm no layout breakage.

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

- [ ] Default build carried the production origin (first `<loc>` = `https://www.imgexact.site/`; prod-check PASS).
- [ ] `prod-check` exit 0 (paste the PASS summary).
- [ ] Lighthouse mobile scores recorded (all four categories).
- [ ] Real-phone smoke passed.
- [ ] GSC property verified; sitemap processed with 15 URLs.
- [x] Web Analytics enabled in the Vercel dashboard; beacon observed on production (same-origin).
- [ ] Bing site added; first IndexNow submission (if applicable) returned 200.
- [ ] 404 page + one tool flow verified by hand on production.

**Rollback:** keep the previous `dist/` or the host's previous deployment — static hosting rollbacks are lossless (`docs/DEPLOYMENT.md` §5).

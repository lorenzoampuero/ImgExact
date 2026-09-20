# WEB ANALYTICS — ImgExact

**Status:** integrated and **verified live 2026-09-20** (`@vercel/analytics@2`; loader in `src/scripts/analytics.ts`). Ads remain off (`SITE.adsEnabled: false`).
**Rule:** the privacy page documents every data path. Nothing analytics-related ships before `/privacy` and this file agree — they were updated in the same change.

---

## What is collected

Vercel Web Analytics, injected by the official Astro component:

| Collected | Examples |
|---|---|
| Page path + dynamic path | `/compress-image-to-size` |
| Referrer | `https://news.ycombinator.com/` |
| Coarse location | country, region, city |
| Client class | browser + OS + device type (mobile/desktop/tablet) |
| Timestamp | per page view |

- **No cookies.** Visitors are identified by a hash derived from the request, and that session is discarded after 24 hours (Vercel's published behaviour — see the link below).
- **No cross-site identifiers**, no advertising use, aggregate reporting only.
- **Nothing about your files**: the tool code never calls `track()` or sends filenames, image bytes, metadata or processing results. That is the property the network audit re-verifies (`docs/PRIVACY_NETWORK_AUDIT.md`).

Reference: Vercel Web Analytics privacy and compliance documentation (`https://vercel.com/docs/analytics/privacy-policy`), linked from `/privacy`.

## How it is loaded (and why not the Astro component)

The official `@vercel/analytics/astro` component cannot be used here: it emits its loader as an **inline** `<script type="module">`, and the production CSP (`script-src 'self'`, `vercel.json`) correctly blocks inline scripts. That failure is silent in development (the CSP header only exists on Vercel) and was caught by a browser check on production on 2026-09-20 — no page views were being recorded.

Instead, `src/layouts/BaseLayout.astro` imports `src/scripts/analytics.ts`, which calls the package's `inject()` and is emitted by Astro as an **external, same-origin `_astro/*.js`** bundle. `vite.build.assetsInlineLimit: 0` in `astro.config.mjs` guarantees that script chunks are never inlined (inline *styles* remain allowed by the CSP).

| Request | URL | Note |
|---|---|---|
| Loader bundle | `/_astro/BaseLayout.*.js` | external, same-origin, CSP-safe |
| Script | `/_vercel/insights/script.js` | **same origin** — served by the Vercel deployment once Analytics is enabled |
| Beacon (page view) | `/_vercel/insights/view` | **same origin**, POST |

Consequences:

- The strict CSP needs **no exception** (`script-src 'self'`), and the "zero third-party origins" posture holds.
- `astro dev` loads the package's debug script from `va.vercel-scripts.com` (development only; the production path is baked in at build time).
- On the Vercel build the package may pick up a randomized intake path (v2 "Resilient Intake") — still same-origin.

## Enable, verify, disable

1. **Enable:** Vercel dashboard → project → *Analytics* → **Enable** (done). The intake routes are added on the next deployment.
2. **Verify:** `node scripts/prod-check.mjs --origin https://www.imgexact.site` runs three analytics-related checks — `Web Analytics loader (CSP-safe)` (hard), `Web Analytics script route` (warning until the dashboard toggle + redeploy land) and `CSP: no inline executable scripts` (hard, the regression guard for the bug above). In a browser, confirm the same-origin beacon in DevTools → Network on a production page.
3. **Data:** dashboard → project → *Analytics*. First page views appear within ~30 seconds of the next visit; content blockers may hide some visitors, and that is acceptable.
4. **Disable:** remove the `<script>import '../scripts/analytics'</script>` block from `src/layouts/BaseLayout.astro` (or rebuild without the package) and update `/privacy` in the same change.

## Deliberate limits

- **Page views only.** Custom events require a Pro/Enterprise dashboard feature and are intentionally out of scope.
- **No Speed Insights** (field Core Web Vitals) yet; add only if field data becomes a requirement.
- **No user-level data, ever.** If an aggregate tool event is ever added (for example "compression completed"), it must be a non-identifying category, documented on `/privacy` first.

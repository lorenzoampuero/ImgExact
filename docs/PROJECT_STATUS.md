# PROJECT STATUS — ImgExact (Exact Image Toolkit)

**Last updated:** 2026-09-22 (SEO keyword-rendering pass + guide content layer + brand refresh) · **Status vocabulary:** DONE (implemented) · TESTED (verified by execution) · PARTIAL · BLOCKED · NOT STARTED
**Rule applied:** nothing below says TESTED unless it was actually executed and observed in this session.

---

## Gate board

| Gate | Scope | State | Evidence |
|---|---|---|---|
| **0 — Market validation** | `research/MARKET_VALIDATION.md`, `KEYWORD_MAP.md`, `COMPETITOR_MATRIX.md`, `BRAND_OPTIONS.md` | **DONE** (research artifacts) · **PARTIAL** (no live SERP/volume API) | 4 artifacts with 24 query clusters, 12 competitors, sourced evidence; volume data explicitly labeled unverified. |
| **1 — Foundation** | Isolation, pins, Astro/TS, layout, design tokens, SEO helpers, tests, error boundaries | **TESTED** | `npm ci` ✓ (288 pkgs, 0 vulnerabilities), `astro check` 0 errors, 102 unit tests pass, 16-page production build. Node 24.13.1 / npm 11.8.0 pinned via `.nvmrc` + `packageManager`; `engines` set to `>=22.12.0` to match the Vite 8 toolchain floor (hardening pass — was `>=20.19.0`, which allowed unsupported 21.x / 22.0–22.11); `@types/node` added for the config typecheck; TypeScript pinned to major 6 (astro check compatibility). |
| **2 — Core engine** | Validation, decode, resize, crop, encode, target-size optimization, download, memory cleanup | **TESTED** | 102 unit tests (headers/EXIF/target-search convergence/transform math/validation/Base64/registry) + 11 browser-executed tool flows. |
| **3 — First high-value tools** | Exact File Size Compressor, Resizer, Converter, Crop | **TESTED** | Browser flows: 84 KB→49 KB @ ≤50 KB target; resize 2000×1500→800×600; JPEG→PNG conversion; crop 800×600→640×480 and 600×600 via ratio lock. |
| **4 — Secondary tools** | Compress, Size Checker, Signature, Social, Metadata, DPI, Base64 | **TESTED** (HEIC: conditional by browser, see limits) | All seven exercised in the built site, including metadata strip with before/after verification and DPI JFIF embed (`-300dpi.jpg`). |
| **5 — Design/UX** | Desktop/mobile layouts, keyboard, drag/drop, empty/error states | **TESTED (core + automated a11y)** · **PARTIAL (screen-reader + other engines)** | Hardening pass: axe-core WCAG 2.1 A/AA — **0 violations across all 16 pages**; two findings fixed (homepage file input now labeled; `visually-hidden` file inputs removed from the tab order — they were invisible focus stops); dropzone keyboard path functionally verified (synthetic Enter opens the file chooser on home + tool pages); no horizontal overflow at a true 390 px viewport (scrollWidth = clientWidth on home/crop; earlier 390/430/768 pass stands); crop numeric alternative; focus-visible; reduced-motion. **Redesign pass (2026-09-20):** automatic dark mode (`prefers-color-scheme`), homepage hero + "how it works" + FAQ, tool cards with icons, before/after comparison in results, page-wide drag & drop; axe-core WCAG 2.1 A/AA **0 violations in light *and* dark** (home + tool page; one serious dark-mode finding fixed — inline links underlined). Screen-reader pass + Firefox/Safari: **pending** (one Chromium engine here). |
| **6 — SEO** | Unique intent/title/meta/H1/canonical, schema, sitemap, robots, internal links | **TESTED** | Registry tests enforce uniqueness + symmetric internal-link graph + anti-doorway slug policy; live checks: canonical `https://www.imgexact.site/...`, 2 JSON-LD blocks/tool page, `robots.txt` 200 + sitemap reference, `sitemap.xml` 200 with 15 `<loc>`. **2026-09-20:** FAQPage schema added on tool pages + homepage from visible Q&A (unit-tested; `prod-check` asserts question/answer visibility), and optional Google/Bing verification meta tags wired to env vars. **2026-09-22 (keyword pass):** each tool declares target phrases (`keywords`), a long-form `taskGuide` and concrete `requirementPresets`, all rendered server-side; `tests/seo-content.test.ts` fails if any declared phrase is missing from rendered text or claimed by two tools; prose linkification adds contextual internal links; 5 guide URLs added (20 in the sitemap); `prod-check` extended to 21 checks including served-HTML keyword guards, brand assets and trailing-slash normalisation. |
| **7 — AI discovery** | OAI-SearchBot access, crawlable HTML, methodology content | **DONE (setup)** | `robots.txt` explicitly allows OAI-SearchBot and GPTBot per current OpenAI docs; all content server-rendered HTML; `docs/` methodology + dated sources. Verification of actual crawler behavior happens post-deploy (search console + server logs). |
| **8 — Security/privacy** | Malformed/oversized/MIME-spoofed inputs, network audit | **TESTED** | Fixture matrix: corrupt JPEG, text file as .jpg, PNG-as-.jpg, fake 900 MP header (blocked pre-decode), EXIF-rotated photo. Network audit: 58 requests across six flows — **0 POST requests, 0 external-origin requests, 0 URLs derived from fixture names**; only local `blob:` preview URLs. See `docs/PRIVACY_NETWORK_AUDIT.md`. |
| **9 — Performance** | Load metrics + processing benchmarks | **PARTIAL** | Measured: DOM ready 21 ms, load 68 ms (cached), CSS 16.3 KB, largest JS chunk ~31 KB raw (shared registry chunk), fonts subset ~48 KB latin woff2. Processing: 140 ms (64×64), 520 ms (synthetic 20 MP → ≤500 KB target). Lighthouse/field data: **not run** (no Lighthouse available in this environment + no deployed origin). See caveats below. |
| **10 — AdSense readiness** | Policy/UX readiness, no ads shipped | **DONE** (documentation) · No application filed (per rules) | `docs/ADSENSE_READINESS.md`; ads disabled in `src/config/site.ts`; `AdSlot` renders nothing; placement rules documented (no slots near download); first-party cookieless page statistics are the only traffic data (`docs/ANALYTICS.md`). |
| **11 — Deployment readiness** | Static build + instructions | **TESTED (deployed)** | **Live since 2026-09-19** at `https://www.imgexact.site` (operator-deployed on Vercel; canonical host = www, apex 308→www — consistent since the alignment pass); deployed build matches the latest commit (a11y fingerprints verified in the live HTML); automated `prod-check` PASS (9/9) on www and via the apex redirect chain. |
| **12 — Production Launch Gate** | Launch sequence (domain → origin → build → deploy → verify → index) | **IN PROGRESS — deployed, automated verification PASSED** | Live review: canonicals/H1/JSON-LD correct, 404 = styled 404 (status 404), `_astro/*` immutable caching, HTML revalidate, HSTS present. Remaining for `VERIFIED PROD`: Lighthouse mobile (PSI API quota-blocked here — run at pagespeed.web.dev), real-phone smoke, GSC + Bing setup, indexing requests (`docs/LAUNCH_GATE.md`). |

---

## Launch-ready definition check

| Criterion | Result |
|---|---|
| ≥ 4 strong tools fully working | ✅ 11 tools, all browser-verified |
| Clean install passes | ✅ `npm ci` exit 0 |
| Typecheck passes | ✅ `astro check` 0 errors |
| All tests pass | ✅ 102/102 |
| Production build passes | ✅ 16 pages |
| Browser testing passes | ✅ Chromium engine (all flows) — ⏳ Firefox/Safari pending |
| Mobile testing passes | ✅ 390/430/768 px checks + mobile tool flow |
| Privacy audit passes | ✅ zero image data transmitted |
| Security fixtures pass | ✅ incl. decompression-bomb guard |
| SEO audit passes | ✅ unique metadata; canonicals; sitemap; robots; schema |
| Sitemap valid / robots valid / canonicals valid | ✅ final origin `https://www.imgexact.site` in the default build (verified) |
| Structured data valid where used | ✅ only supported types; free `offers.price: 0`; no fake ratings |
| No placeholder content | ✅ origin is the final domain (`https://www.imgexact.site`) by default — no placeholder remains |
| No fake statistics | ✅ none shipped |
| No broken buttons | ✅ all primary actions exercised |
| Pre-launch intent audit | ✅ 15 indexable pages + 404 audited; no competing intents (`docs/SEO_PAGE_REGISTRY.md`) |
| Production verifier (dry-run) | ✅ `prod-check` exit 0 on dry-run build; exit 1 on mismatched origin (both executed) |
| No unrelated project changes | ✅ single project workspace; scoped commits only (see `git log`) |

---

## Verified measurements (this session)

**Pipeline:** `npm ci` → `astro check` (0 errors) → `vitest run` (102 tests) → `astro build` (16 pages) — all exit 0 on 2026-09-19.

**Privacy (browser, built site):** 58 requests / 0 POST / 0 external / 0 fixture-derived URLs during six complete tool flows.

**Processing:** compress tiny 64×64 → 2.4 KB in ~140 ms UI time; synthetic 20 MP JPEG → ≤500 KB target in ~520 ms encode-search time; largest fixture (4032×3024, 264 KB) processed in the size-checker flow without warnings.

**Delivery (built site, cache-warm):** DOMContentLoaded 21 ms · load 68 ms · page transfer ≈ 0 KB after cache; CSS 16.3 KB; largest JS chunk 31 KB raw (deliberately not optimized — see Known limits); OG image 17 KB.

**Release hardening (hardening pass):** `npm ci` → 102/102 tests → `astro check` 0 errors / 0 warnings / **0 hints** (the deprecation hint is gone) → 16-page build, all exit 0. a11y: axe-core WCAG 2.1 A/AA — 0 violations across 16 pages. Copy UX: clipboard success (`Base64 copied…`) + forced-failure fallback (`…is selected — press Ctrl+C`) verified in-browser with focus + full-selection asserted. Network re-check (Base64 flow): 6 requests / 0 POST / 0 bodies / 0 external — the privacy-audit statement is unchanged. Build guard: placeholder build warns; `PUBLIC_SITE_URL=https://test.invalid` build changes canonical, OG, JSON-LD, robots and sitemap in `dist/` (verified).

**Launch-gate prep (launch-gate pass):** pre-launch intent audit across the 15 indexable pages + 404 — no competing intents (verdicts in `docs/SEO_PAGE_REGISTRY.md`); `scripts/prod-check.mjs` dry-run: exit 0 against a local preview built for `https://launch-dryrun.invalid`; negative test (mismatched `--origin`) fails as designed (exit 1).

**Domain adoption (domain pass):** `imgexact.site` adopted as the production domain; default build emits final-domain canonicals/sitemap/robots with no warning; `prod-check` dry-run PASS (9/9) against the local preview; DNS check: no records on `imgexact.site` or `imgexact.com` (strong signal of registrability; registrar WHOIS at purchase pending).

**Production deployment (live review, 2026-09-19):** deployed by the operator on Vercel. Automated: `prod-check` 9/9 PASS on `https://www.imgexact.site` and via the apex redirect chain; `/definitely-not-a-page` → 404 (styled); `_astro/*.css` → `max-age=31536000, immutable`; HTML → `max-age=0, must-revalidate`; HSTS `max-age=63072000`; HTTPS on both hosts. Content fingerprints = latest build (home input `aria-label` + `tabindex="-1"`, canonical apex, 2 JSON-LD blocks; resize page: canonical + exactly one H1). **Finding (resolved):** apex 308-redirects to www while canonicals referenced the apex — resolved same day by aligning the canonical origin to `https://www.imgexact.site` (code + auto-deploy), making redirection and canonicals consistent; live re-verification recorded in the alignment pass below. Lighthouse mobile: to be run by the operator at pagespeed.web.dev (PSI API rate-limited from this environment, HTTP 429).

**Canonical alignment (alignment pass, 2026-09-19):** canonical origin aligned to `https://www.imgexact.site` to match the serving host (apex 308→www) — code + docs updated; local chain green (102/102 tests, 0/0/0 check, 16 pages, canonicals/sitemap/robots on www, `prod-check` dry-run 9/9). Live re-verification: `prod-check` 9/9 PASS against `https://www.imgexact.site` directly and via the `https://imgexact.site` redirect chain; live canonical now `https://www.imgexact.site/`.

**Web analytics + redesign pass (2026-09-20):** Vercel Web Analytics integrated in `src/layouts/BaseLayout.astro` (`@vercel/analytics@2`; production script `/_vercel/insights/script.js` — same origin, so the CSP needed no exception; verified in `dist/index.html` that the production path is baked in). `/privacy` and `docs/ANALYTICS.md` document the data paths in the same change. QA on the built site (Chromium): tool run 83.9 KB → 49 KB @ ≤50 KB target with the new before/after comparison (clip `50%` → `75%` when the slider moves to 25, aspect 2000/1500); target-size preference restored after reload (`{"compress-image-to-size":{"target-size":"50 KB"}}`); page-wide drag overlay appears on a file drag and clears on dragleave; dark-mode tokens applied (`rgb(11, 17, 32)` background, `rgb(231, 237, 249)` text, card `rgb(18, 26, 43)`); no horizontal overflow at 390 px (scrollWidth = clientWidth); axe-core WCAG 2.1 A/AA 0 violations on home + `/convert-image` + `/crop-image` in both colour schemes after underlining inline links; network: 12 requests / 0 external on a tool-page load, the analytics script request same-origin. Pipeline: `astro check` 0/0/0, 106 tests, 16-page build. Operator step pending: *Enable* Analytics in the Vercel dashboard (routes appear after the next deploy).

**SEO keyword + content + brand pass (2026-09-22):** every tool page now renders a keyword-bearing task section, a "Common requirements" list and problem-query FAQs (`keywords` / `taskGuide` / `requirementPresets` in `src/data/tools.ts`; rendered by `ToolLayout.astro`). Prose is linkified internally (`src/seo/linkify.ts`). Five informational URLs added (`/guides` + four guides, `src/data/guides.ts`), sitemap now 20 URLs. Titles/metas rewritten where a secondary phrase was missing (e.g. "Compress image to 50 KB…", "Convert PNG to JPG…"), `Organization.logo`, `og:locale`/`og:image:alt`, apple-touch-icon and web manifest added, `/about` placeholder copy replaced with the real issue tracker, `trailingSlash: false` in `vercel.json`. Brand accent moved from the default `#2563eb` blue to ink teal `#0b6e63` (dark ramp `#5ed3c4`/`#0e7a6e`), with a new hero example built from a real sample file (110 KB → 16 KB, measured at build time). Pipeline (executed): 127 vitest tests pass (9 files, incl. new `tests/seo-content.test.ts` and `tests/guides.test.ts`), `astro check` 0 errors / 0 warnings / 0 hints, build **21 pages**, `npm run contrast` PASS (26 WCAG pairs), `prod-check` **21/21 PASS** against a local preview with 2 expected warnings (trailing-slash redirect and the analytics route only exist on Vercel). Browser QA (Chromium, 1280 px): hero example renders with real numbers, tool pages show the new sections (6 presets, 7 H2s), FAQ linkification live (`/compress-image` → `/compress-image-to-size`); axe-core WCAG 2.1 A/AA **0 violations** on `/`, `/compress-image-to-size`, `/guides`, `/guides/image-compression-explained` and `/social-image-resizer`, in light **and** dark. Live re-verification and indexing requests: see the operator checklist in `docs/SEO_GROWTH_LOG.md`.

**Analytics go-live fix (2026-09-20, second deploy):** production deploy #1 shipped the official Astro component, whose loader is an **inline** module script — blocked by `script-src 'self'` (“Executing inline script violates … Content Security Policy”), so `window.va` stayed undefined and **no page views were recorded**. Found by a browser check on the live site (the CSP header only exists in production, so local builds could not catch it). Fix: `src/scripts/analytics.ts` calls the package's `inject()` and is emitted as an external same-origin `_astro/*.js` bundle, with `vite.build.assetsInlineLimit: 0` keeping script chunks out of the HTML. `prod-check` gained two guards: `Web Analytics loader (CSP-safe)` (fetches the page bundles and looks for the insights endpoint) and `CSP: no inline executable scripts`. Naming: the page reports now 13 checks. **Verified live after deploy #2:** 0 inline module scripts in the HTML; loader bundle 200 containing the insights endpoint; `GET /_vercel/insights/script.js` → 200; `POST /_vercel/insights/view` → **200** (page view recorded); 0 console errors; `window.va` = function.

---

## Known limits / risks carried forward

1. **In-browser processing ceiling:** hard safety limits (200 MB file / 100 MP) reject rather than crash; animated formats use first frame only (stated in every relevant tool page).
2. **HEIC:** decode depends on the browser (Safari yes, most others no); the UX states this precisely. Untestable in this environment (no Safari).
3. **Exact size claims:** tools say "at or under"; convergence reported; impossibility surfaced with recovery options.
4. **31 KB shared client chunk** — deliberately not optimized (post-review decision: not a bottleneck at this stage; revisit only if field data shows a problem).
5. **Lighthouse not run** here; it is measured on production at the launch gate (`docs/LAUNCH_GATE.md` §5). Expected strong scores given static output, but **not claimed** until measured.
6. **Firefox/Safari + screen reader = validation debt, not launch blockers** (post-review). Capability handling is precise (`probeEncodeSupport()` gates AVIF/WebP; HEIC messaging is browser-accurate) and no untested compatibility is promised anywhere on the site. Re-prioritize if Safari traffic becomes significant.
7. **Embedded-browser harness limits (hardening pass):** Tab key events are not delivered to the page and native Playwright click actionability was flaky below the fold, so keyboard/click checks used DOM dispatch + `filechooser` interception (handlers and branches verified; a real Tab-order walk is still owed to a desktop browser pass).
8. **Domain-reputation false positives (2026-09-19):** the fresh `.site` domain can trigger antivirus / browser-protection "possible malware" warnings even though the site loads zero third-party scripts (verified live: 0 external scripts, 0 `onclick`, 0 `javascript:`, 0 `eval`; deployed files are HTML/CSS/JS/fonts/images only). Response headers were hardened the same day via `vercel.json` (nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, strict CSP — see `DEPLOYMENT.md`). Mitigation: submit false-positive reports to the specific vendor (Google Safe Browsing, Microsoft SmartScreen, etc.); reputation builds with domain age, indexing and traffic.
9. **Per-page social cards not shipped (2026-09-22):** all 20 pages share one OG image plus a per-page `og:image:alt`. Per-page cards need a rasteriser in the build (satori/resvg-class dependency), which was rejected for now to keep the dependency surface at three packages. Revisit if social click-through data justifies it; the hook (`ogImagePath` prop in `BaseLayout.astro`) is already in place.
10. **Organic traffic expectations (2026-09-22):** the domain is days old with zero backlinks, so on-page work (keyword rendering, guides) will not produce visible traffic on its own. The bottleneck is off-page: Search Console/Bing verification, indexing requests and the link plan are operator tasks tracked in `docs/SEO_GROWTH_LOG.md`.

## Commands

```
npm ci            # clean install
npm test          # 102 unit tests
npm run check     # astro check (typecheck)
npm run build     # static production build → dist/
npm run preview   # serve dist/ (astro preview start/stop/status/logs)
npm run fixtures  # regenerate ../tests/fixtures + public/og-default.png
npm run brand     # regenerate apple-touch-icon + hero sample images (PowerShell)
npm run contrast  # WCAG contrast guard for the design tokens
node scripts/prod-check.mjs --origin https://<domain>   # verify a deployment (launch gate step 4)
```

## Repository memory

Committed history: research → scaffold → engine+tests → full site → fixes → docs → hardening → launch-gate prep → domain adoption → production deployment review → canonical alignment (www; live re-verified) → response-header hardening → web analytics + redesign/functionality pass. No secrets, no env files, no external services, no ads; the only analytics is first-party and cookieless (`docs/ANALYTICS.md`); the site is live (operator-deployed on Vercel, 2026-09-19).

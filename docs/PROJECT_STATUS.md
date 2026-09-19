# PROJECT STATUS — ImgExact (Exact Image Toolkit)

**Last updated:** 2026-09-19 · **Status vocabulary:** DONE (implemented) · TESTED (verified by execution) · PARTIAL · BLOCKED · NOT STARTED
**Rule applied:** nothing below says TESTED unless it was actually executed and observed in this session.

---

## Gate board

| Gate | Scope | State | Evidence |
|---|---|---|---|
| **0 — Market validation** | `research/MARKET_VALIDATION.md`, `KEYWORD_MAP.md`, `COMPETITOR_MATRIX.md`, `BRAND_OPTIONS.md` | **DONE** (research artifacts) · **PARTIAL** (no live SERP/volume API) | 4 artifacts with 24 query clusters, 12 competitors, sourced evidence; volume data explicitly labeled unverified. |
| **1 — Foundation** | Isolation, pins, Astro/TS, layout, design tokens, SEO helpers, tests, error boundaries | **TESTED** | `npm ci` ✓ (288 pkgs, 0 vulnerabilities), `astro check` 0 errors, 102 unit tests pass, 16-page production build. Node 24.13.1 / npm 11.8.0 pinned via `.nvmrc` + `engines` + `packageManager`; TypeScript pinned to major 6 (astro check compatibility). |
| **2 — Core engine** | Validation, decode, resize, crop, encode, target-size optimization, download, memory cleanup | **TESTED** | 102 unit tests (headers/EXIF/target-search convergence/transform math/validation/Base64/registry) + 11 browser-executed tool flows. |
| **3 — First high-value tools** | Exact File Size Compressor, Resizer, Converter, Crop | **TESTED** | Browser flows: 84 KB→49 KB @ ≤50 KB target; resize 2000×1500→800×600; JPEG→PNG conversion; crop 800×600→640×480 and 600×600 via ratio lock. |
| **4 — Secondary tools** | Compress, Size Checker, Signature, Social, Metadata, DPI, Base64 | **TESTED** (HEIC: conditional by browser, see limits) | All seven exercised in the built site, including metadata strip with before/after verification and DPI JFIF embed (`-300dpi.jpg`). |
| **5 — Design/UX** | Desktop/mobile layouts, keyboard, drag/drop, empty/error states | **TESTED (core)** · **PARTIAL (a11y deep audit)** | No horizontal overflow at 390/430/768 px across 5 representative pages; dropzone keyboard path present; crop has full numeric alternative; focus-visible styles; reduced-motion support. Full screen-reader pass + Firefox/Safari runtime testing: **pending** (environment had one Chromium engine). |
| **6 — SEO** | Unique intent/title/meta/H1/canonical, schema, sitemap, robots, internal links | **TESTED** | Registry tests enforce uniqueness + symmetric internal-link graph + anti-doorway slug policy; live checks: canonical `https://imgexact.com/...` (placeholder origin), 2 JSON-LD blocks/tool page, `robots.txt` 200 + sitemap reference, `sitemap.xml` 200 with 15 `<loc>`. |
| **7 — AI discovery** | OAI-SearchBot access, crawlable HTML, methodology content | **DONE (setup)** | `robots.txt` explicitly allows OAI-SearchBot and GPTBot per current OpenAI docs; all content server-rendered HTML; `docs/` methodology + dated sources. Verification of actual crawler behavior happens post-deploy (search console + server logs). |
| **8 — Security/privacy** | Malformed/oversized/MIME-spoofed inputs, network audit | **TESTED** | Fixture matrix: corrupt JPEG, text file as .jpg, PNG-as-.jpg, fake 900 MP header (blocked pre-decode), EXIF-rotated photo. Network audit: 58 requests across six flows — **0 POST requests, 0 external-origin requests, 0 URLs derived from fixture names**; only local `blob:` preview URLs. See `docs/PRIVACY_NETWORK_AUDIT.md`. |
| **9 — Performance** | Load metrics + processing benchmarks | **PARTIAL** | Measured: DOM ready 21 ms, load 68 ms (cached), CSS 16.3 KB, largest JS chunk ~31 KB raw (shared registry chunk), fonts subset ~48 KB latin woff2. Processing: 140 ms (64×64), 520 ms (synthetic 20 MP → ≤500 KB target). Lighthouse/field data: **not run** (no Lighthouse available in this environment + no deployed origin). See caveats below. |
| **10 — AdSense readiness** | Policy/UX readiness, no ads shipped | **DONE** (documentation) · No application filed (per rules) | `docs/ADSENSE_READINESS.md`; ads disabled in `src/config/site.ts`; `AdSlot` renders nothing; placement rules documented (no slots near download). |
| **11 — Deployment readiness** | Static build + instructions | **DONE (prepared)** · **BLOCKED on user approval + domain** | `docs/DEPLOYMENT.md`; the single code-side blocker is `SITE.url` placeholder. Nothing was deployed; no DNS touched; no spend. |

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
| Sitemap valid / robots valid / canonicals valid | ✅ (placeholder origin — replace before deploy) |
| Structured data valid where used | ✅ only supported types; free `offers.price: 0`; no fake ratings |
| No placeholder content | ⚠️ exception: `SITE.url` (documented deploy blocker, intentional) |
| No fake statistics | ✅ none shipped |
| No broken buttons | ✅ all primary actions exercised |
| No unrelated project changes | ✅ single project workspace; 5 scoped commits |

---

## Verified measurements (this session)

**Pipeline:** `npm ci` → `astro check` (0 errors) → `vitest run` (102 tests) → `astro build` (16 pages) — all exit 0 on 2026-09-19.

**Privacy (browser, built site):** 58 requests / 0 POST / 0 external / 0 fixture-derived URLs during six complete tool flows.

**Processing:** compress tiny 64×64 → 2.4 KB in ~140 ms UI time; synthetic 20 MP JPEG → ≤500 KB target in ~520 ms encode-search time; largest fixture (4032×3024, 264 KB) processed in the size-checker flow without warnings.

**Delivery (built site, cache-warm):** DOMContentLoaded 21 ms · load 68 ms · page transfer ≈ 0 KB after cache; CSS 16.3 KB; largest JS chunk 31 KB raw (⚠ improvement candidate — see below); OG image 17 KB.

---

## Known limits / risks carried forward

1. **In-browser processing ceiling:** hard safety limits (200 MB file / 100 MP) reject rather than crash; animated formats use first frame only (stated in every relevant tool page).
2. **HEIC:** decode depends on the browser (Safari yes, most others no); the UX states this precisely. Untestable in this environment (no Safari).
3. **Exact size claims:** tools say "at or under"; convergence reported; impossibility surfaced with recovery options.
4. **31 KB shared client chunk** includes the tool registry content (FAQ/methodology strings not needed by controllers). Improvement: pass related-links via data attribute to slim the chunk. Documented, not yet applied.
5. **Lighthouse not run** here; run locally against the deployed origin. Expected strong scores given static output, but **not claimed** until measured.
6. **Firefox/Safari runtime** untested in this session; `probeEncodeSupport()` gates AVIF/WebP and errors are precise, so the risk is contained and stated.

## Commands

```
npm ci            # clean install
npm test          # 102 unit tests
npm run check     # astro check (typecheck)
npm run build     # static production build → dist/
npm run preview   # serve dist/ (astro preview start/stop/status/logs)
npm run fixtures  # regenerate ../tests/fixtures + public/og-default.png
```

## Repository memory

Committed history (5 commits): research → scaffold → engine+tests → full site → docs (this commit). No secrets, no env files, no external services, no analytics, no ads, nothing deployed.

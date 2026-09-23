# GOOGLE SEARCH CONSOLE SETUP — manual steps after deploy

**Precondition:** the site is deployed on the final domain `https://www.imgexact.site` (the built-in canonical origin) and the deployed build carries it in every canonical, sitemap entry and robots reference — verify with `node scripts/prod-check.mjs --origin https://www.imgexact.site` (`docs/LAUNCH_GATE.md`).

## 1. Verify the property

1. Open Google Search Console → *Add property* → **Domain** property (recommended; covers all subdomains + both protocols).
2. Copy the DNS TXT token and add it at the domain registrar.
3. Wait for propagation (minutes to hours), then click *Verify*.
4. Alternative if DNS access is limited: **URL-prefix** property with an HTML file at the root, or the meta-tag path: set `PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel → Settings → Environment Variables and redeploy — `src/layouts/BaseLayout.astro` then emits `<meta name="google-site-verification">` automatically (nothing is emitted while the variable is empty).

## 2. Submit the sitemap

1. In Search Console → *Sitemaps* → enter `sitemap.xml` (the generated file, 15 URLs at launch).
2. Confirm status *Success* and a discovered-URL count of 15.
3. Re-submit only when the URL set materially changes (not on content edits).

## 3. Inspect the homepage

1. *URL Inspection* → homepage → *Test live URL*.
2. Confirm: indexable, canonical = itself, mobile-friendly render, no blocked resources.
3. *Request indexing* once.

> **2026-09-22:** the sitemap now contains **20 URLs** (11 tools + homepage + 4 guides + `/guides` + 3 trust pages). After any content push, request indexing for the *changed* URLs only — in this pass that means `/guides` and the four guide pages — and run the IndexNow ping (`docs/SEO_GROWTH_LOG.md`, operator checklist).

## 4. Inspect major tools (one by one)

For `/compress-image-to-size`, `/resize-image`, `/convert-image`, `/crop-image`, plus the top secondary tools:

- Canonical points to itself (not an alias).
- Title/description unique (compare against `docs/SEO_PAGE_REGISTRY.md`).
- Structured data detected (`SoftwareApplication` + `BreadcrumbList` + `FAQPage`; the FAQ block is also verified against the visible page text by `node scripts/prod-check.mjs`).
- *Request indexing* for each — spaced out, not all at once.

## 5. Ongoing monitoring (the feedback loop)

Weekly after launch, then settle into a cadence:

| Report | Watch for | Action |
|---|---|---|
| **Queries** | Constraint phrases ("50 kb", "600x600", "signature 20kb") — landing page mapping | Map newcomer queries to existing tools; only create a *new* page per `docs/SEO_PAGE_REGISTRY.md` governance |
| **Pages / CTR** | Pages with impressions but low CTR | Rewrite title/description; keep uniqueness constraints (tests) |
| **Countries** | Where demand clusters (expect IN/ID/BR/US per market research) | Prioritize localization *later*, based on data not guesses |
| **Core Web Vitals** | LCP/INP/CLS in the field | Compare against local measurements in `PROJECT_STATUS.md`; treat regressions as bugs |
| **Indexing** | Unexpected `noindex`/blocked pages, sitemap drift | Fix immediately; check `robots.txt` output |

### Launch watchlist (first 30–60 days)

Filter *Queries* by these exact strings (derived from `research/KEYWORD_MAP.md`) and confirm each maps to its page — a query consistently landing on the wrong page is an internal-linking or copy problem to fix before anything new is created:

| Watch query | Must map to |
|---|---|
| `compress image to 50kb` | `/compress-image-to-size` |
| `compress image to 20kb` | `/compress-image-to-size` |
| `make image under 50kb` | `/compress-image-to-size` |
| `resize image to 600x600` | `/resize-image` |
| `convert png to jpg` | `/convert-image` |
| `crop image to 1:1` | `/crop-image` |
| `image size checker` | `/image-size-checker` |
| `signature 140x60` | `/signature-resizer` |
| `instagram post size` | `/social-image-resizer` |
| `remove exif data` | `/image-metadata` |
| `300 dpi converter` | `/image-dpi` |
| `image to base64` | `/image-to-base64` |
| `compress image without losing quality` | `/compress-image` |
| `image too large to upload` | `/compress-image-to-size` |
| `how image compression works` | `/guides/image-compression-explained` |
| `webp vs jpeg` | `/guides/best-image-format-for-web` |
| `free image compressor alternatives` | `/guides/free-image-compressor-alternatives` |
| `image size vs dimensions` | `/guides/image-size-vs-dimensions-explained` |

## 6. Change discipline

- Any URL added/removed/renamed must update: `docs/SEO_PAGE_REGISTRY.md`, the sitemap (automatic — driven by the registry data), and trigger one IndexNow submission (`docs/BING_SETUP.md`).
- Record material title/description changes with dates in the registry change log to distinguish experiments from accidents.

## 7. What NOT to do

- No bulk "request indexing" spamming.
- No keyword-stuffed doorway pages (enforced by the registry rules + unit-tested slug policy).
- No artificial page generation for numeric variants — those are tool inputs by design.

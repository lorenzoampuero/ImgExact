# GOOGLE SEARCH CONSOLE SETUP — manual steps after deploy

**Precondition:** the site is deployed on the final domain, and `SITE.url` in `src/config/site.ts` has been updated to that exact origin (protocol + host, no trailing slash), followed by a rebuild. Do not skip that step — every canonical, sitemap entry and robots reference derives from it.

## 1. Verify the property

1. Open Google Search Console → *Add property* → **Domain** property (recommended; covers all subdomains + both protocols).
2. Copy the DNS TXT token and add it at the domain registrar.
3. Wait for propagation (minutes to hours), then click *Verify*.
4. Alternative if DNS access is limited: **URL-prefix** property with an HTML file at the root or a meta tag in `src/layouts/BaseLayout.astro`.

## 2. Submit the sitemap

1. In Search Console → *Sitemaps* → enter `sitemap.xml` (the generated file, 15 URLs at launch).
2. Confirm status *Success* and a discovered-URL count of 15.
3. Re-submit only when the URL set materially changes (not on content edits).

## 3. Inspect the homepage

1. *URL Inspection* → homepage → *Test live URL*.
2. Confirm: indexable, canonical = itself, mobile-friendly render, no blocked resources.
3. *Request indexing* once.

## 4. Inspect major tools (one by one)

For `/compress-image-to-size`, `/resize-image`, `/convert-image`, `/crop-image`, plus the top secondary tools:

- Canonical points to itself (not an alias).
- Title/description unique (compare against `docs/SEO_PAGE_REGISTRY.md`).
- Structured data detected (`SoftwareApplication` + `BreadcrumbList`).
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

## 6. Change discipline

- Any URL added/removed/renamed must update: `docs/SEO_PAGE_REGISTRY.md`, the sitemap (automatic — driven by the registry data), and trigger one IndexNow submission (`docs/BING_SETUP.md`).
- Record material title/description changes with dates in the registry change log to distinguish experiments from accidents.

## 7. What NOT to do

- No bulk "request indexing" spamming.
- No keyword-stuffed doorway pages (enforced by the registry rules + unit-tested slug policy).
- No artificial page generation for numeric variants — those are tool inputs by design.

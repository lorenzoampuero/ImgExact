# SEO GROWTH LOG — ImgExact

**Purpose:** track what was changed for organic growth, when, and what it produced. Two rules:
1. Every entry is a *dated experiment*, not an opinion. "We rewrote the title" is not an entry; "we rewrote the title on 2026-09-22, CTR before/after in Search Console" is.
2. Nothing here claims a ranking or a volume that was not observed in Search Console or Vercel Analytics.

Related: `docs/SEARCH_CONSOLE_SETUP.md` (setup + watchlist), `docs/SEO_PAGE_REGISTRY.md` (URL governance), `research/KEYWORD_MAP.md` (intent map).

---

## The honest state of play (2026-09-22)

| Fact | Consequence |
|---|---|
| Domain launched 2026-09-19, live on Vercel | Google needs days-to-weeks before a new domain is crawled, indexed and trusted |
| 15 → 20 indexable URLs (guides added 2026-09-22) | More surface, still no authority |
| Zero backlinks | The real bottleneck: no amount of on-page work outranks established sites without links |
| Search Console / Bing not yet verified (operator step) | Without it there is no query data, no indexing requests and no feedback loop |
| Competitors: imagecompressor.com, iLoveIMG, 11zon, TinyPNG (`research/COMPETITOR_MATRIX.md`) | Head terms ("compress image") are not winnable in month one; the constraint phrases ("compress image to 50 kb") are |

**Realistic expectations:** indexing in 3–14 days; first impressions in 2–4 weeks; measurable
organic traffic in 8–12 weeks, and only with links. Anyone promising faster for a new domain is
guessing.

---

## Work already done (on-site, 2026-09-22)

| Change | Why | Evidence |
|---|---|---|
| Keyword-bearing content on all 11 tool pages (`keywords`, `taskGuide`, `requirementPresets` in `src/data/tools.ts`, rendered by `ToolLayout.astro`) | The phrases in `research/KEYWORD_MAP.md` existed in planning but not in the HTML | `tests/seo-content.test.ts` asserts every phrase appears verbatim in rendered text; `prod-check` asserts 6 phrases in the *served* HTML |
| Problem-query FAQs ("the portal says my file is too large", "remove EXIF data before selling") | People search the symptom, not the tool | Rendered on-page + in FAQPage schema |
| Internal links woven into existing prose (`src/seo/linkify.ts`) | Every tool mention becomes a real link instead of plain text | Unit-tested (escaping, cap of 2 links per string, no self-links) |
| 5 new informational URLs (`/guides` + 4 guides) | The site had zero content for research-intent queries | Registered in `docs/SEO_PAGE_REGISTRY.md` with intent + cannibalization rationale |
| Brand accent moved off default blue to ink teal; logo, apple-touch-icon, web manifest, hero sample image | CTR and recognition; the palette was literally Tailwind's default | `npm run contrast` (26 pairs pass WCAG AA), axe-core clean light + dark |
| `trailingSlash: false`, `og:locale`, `og:image:alt`, Organization `logo`, real contact channel on `/about` | Technical hygiene and entity signals | `scripts/prod-check.mjs` (21 checks) |

---

## Operator checklist — do these in order (all external, none of it is code)

1. **Google Search Console** (`docs/SEARCH_CONSOLE_SETUP.md`): verify the property, submit
   `sitemap.xml`, then *URL Inspection → Request indexing* for `/guides` and the four guide URLs.
   Space the requests out; do not spam.
2. **Bing Webmaster Tools** (`docs/BING_SETUP.md`): same, plus the IndexNow ping below.
3. **IndexNow ping for the new URLs** (the key file is already live):
   `npm run indexnow -- --host www.imgexact.site --key ffd3028e54d261a7ec9ebfb0667673b2 --key-file https://www.imgexact.site/ffd3028e54d261a7ec9ebfb0667673b2.txt --urls /guides,/guides/image-compression-explained,/guides/best-image-format-for-web,/guides/free-image-compressor-alternatives,/guides/image-size-vs-dimensions-explained`
4. **Confirm the live build**: `node scripts/prod-check.mjs --origin https://www.imgexact.site`
   (expect PASS with no trailing-slash warning — that warning only appears against local previews).

---

## Off-page plan (the part that actually moves rankings)

Ordered by effort-to-value. None of these require a budget.

| # | Action | Why it fits this site | Notes |
|---|---|---|---|
| 1 | **Show HN: "Image tools that never upload the file"** | The local-processing architecture is a genuinely interesting engineering story, and HN rewards that | Link the guide on compression mechanics, not the homepage; answer questions honestly; do not ask for upvotes |
| 2 | **Technical article on dev.to / Hashnode**: the bounded binary-search quality optimizer (14 encode passes, 2% convergence, explicit dimension opt-in) | Developers link to real engineering write-ups; the article is the link magnet, the tool is the payoff | Republish on your own `/guides` page later with a canonical to the original |
| 3 | **Answer real questions on Stack Overflow / Super User / Photography SE** where the correct answer is "use a local tool" | A useful, non-spammy answer with a working link is the most durable link a tool site can get | Only answer where the tool genuinely solves the question; disclose affiliation |
| 4 | **Subreddits**: r/webdev (the encoder story), r/SideProject, r/photography, r/DataHoarder | Read each subreddit's self-promotion rules first; several require participation before links | Post the *finding*, not the product |
| 5 | **AlternativeTo + tool directories** (submit as an alternative to upload-based compressors) | People actively search "alternatives to X"; these pages rank and pass traffic | Use the same description as the site's meta description |
| 6 | **Product Hunt launch** | One-day spike, lasting backlink, brand search demand afterwards | Prepare the OG card and a short demo GIF |
| 7 | **Public repository issues** (`github.com/lorenzoampuero/ImgExact`) | Every fixed bug becomes a citable page; developers browse repos | Link the fix in the issue when a preset or claim is corrected |

**Link velocity rule:** five real links from relevant pages beat five hundred directory listings.
Anything that promises "1000 backlinks for $5" is a liability, not an asset.

---

## Measurement loop

| Cadence | Check | Where |
|---|---|---|
| Weekly for 8 weeks | Queries → landing page mapping against the watchlist in `docs/SEARCH_CONSOLE_SETUP.md` | Search Console → Performance |
| Weekly | Pages with impressions but CTR < 1% → rewrite title/description (record it here) | Search Console → Pages |
| Weekly | Which guide gets impressions but no clicks → check the snippet, not the content | Search Console |
| Monthly | Indexed-page count vs sitemap count (20) | Search Console → Pages → Indexed |
| Monthly | Referrers that are not search engines | Vercel Analytics |
| On every change | Re-run `prod-check` and update the change log in `docs/SEO_PAGE_REGISTRY.md` | local |

### Experiment log

| Date | Change | Hypothesis | Result |
|---|---|---|---|
| 2026-09-22 | Added keyword sections + problem-query FAQs to all 11 tool pages | Long-tail constraint queries ("compress image to 50 kb") start producing impressions before head terms | Pending — check after indexing |
| 2026-09-22 | Published 4 guides + `/guides` hub | Informational queries feed the tools and earn the first links | Pending |
| 2026-09-22 | Rewrote titles/metas to include the constraint phrasing | Higher CTR on the impressions that do arrive | Pending |

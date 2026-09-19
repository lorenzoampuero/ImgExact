# MARKET VALIDATION — Exact Image Toolkit

**Status:** Gate 0 artifact · **Last updated:** 2026-09-19
**Scope:** Browser-first image utility tools (resize / compress / convert / crop / inspect / prepare).

---

## 1. Method and sources

Evidence was collected on **2026-09-19** from:

1. **Direct product inspection** (pages fetched and read): `tinypng.com`, `iloveimg.com`, `squoosh.app`, `imagecompressor.com`, `redketchup.io`, `11zon.com`. Blocked or unreliable renders: `freeconvert.com` (redirected through ad-tech), `resizeimage.net` (no extractable content — ad-heavy render), `picresize.com` (DNS unresolved from this environment).
2. **Third-party traffic estimators:** HypeStat (which republishes SEMrush/SimilarWeb estimates). Estimator numbers vary 2–3× between providers and are **signals, not facts**.
3. **Official documentation:** Instagram Help Center (photo resolution), YouTube Help (thumbnails), Google Search Central (SoftwareApplication structured data), OpenAI crawler documentation, IndexNow (Bing), caniuse (AVIF support).
4. **Domain availability screening (DNS-level):** `Resolve-DnsName` checks for candidate brand domains (see `BRAND_OPTIONS.md`). DNS absence is a strong but not authoritative signal of registrability.

### Evidence limitations (explicit)

- **No live Google SERP audit was possible** from this environment. Statements about SERP composition are qualitative and flagged as such.
- **No keyword-tool API** (Google Keyword Planner, Ahrefs, Semrush) was available. **No numeric search volume in this document is presented as verified.** Signal columns are labeled `estimator`, `official`, or `knowledge-based`.
- Competitor pages are read as rendered/English defaults; dynamic UI may differ per region.
- `resizeimage.net`'s estimator figure (~31.7M/mo) is unusually high and inconsistent with other sources; it is kept with a caution flag.

---

## 2. Market size signals

Estimator snapshot (HypeStat republishing SEMrush/SimilarWeb, retrieved 2026-09-19; both providers mark values as estimates):

| Property | Category | Est. monthly visits | Search share | Top countries | Processing model | Monetization observed |
|---|---|---|---|---|---|---|
| iloveimg.com | Full image suite (+PDF sibling) | ~35.5M | ~52% | IN, ID, BR, RU, JP | Server-side; freemium | Premium subscriptions + ads ecosystem |
| resizeimage.net | Resize / crop / compress | ~31.7M ⚠ caution | ~76% | — | Server-side (Apache, no HTTP/2 per probe) | AdSense |
| freeconvert.com (image section) | Converters | ~30M (est. 1M daily) | — | — | Server-side; freemium | Freemium + ad-tech |
| 11zon.com | Multi-tool network (image/PDF/text) | ~9.4M | ~45% | IN (~60%), ID, RU | Server-side | AdSense-heavy |
| imageresizer.com | Resize | ~5.1M (171K daily est.) | — | — | Server-side; freemium | Freemium |
| reduceimages.com | Compress/resize | ~4.1M (137K daily est.) | — | — | Server-side | Ads |
| img2go.com | Multi-tool | ~2.5M | — | — | Server-side; freemium | Freemium |
| tinypng.com / tinyjpg.com (Tinify) | Compress (+convert, API, CDN, WP plugin) | ~2.5M+ (tinyjpg alone ~680K) | ~34% (tinyjpg) | US, IN, PL, GB, JP | Server-side API; freemium | Pro tiers + API |
| imagecompressor.com | Compress (client-side) | ~1.5M | ~48% | IN 38%, US 14%, UK | **Client-side WASM** | AdSense |
| compressjpeg.com / compresspng.com / png2jpg.com / jpg2png.com / imageconverter.com | Single-purpose compressors/converters (same hosting cluster as imagecompressor.com) | ~0.5–1.8M each (58K/36K/60K/39K daily est.) | — | — | Mostly client-side cluster | AdSense |

**What this tells us (directional):**

- The category has **multiple independent properties in the millions of monthly visits**, with search as the primary acquisition channel (~45–76% of visits). The long-term 100K+/month ambition is credible; promise nothing, but the ceiling is proven by market reality.
- **Traffic geography is heavily international and mobile-first in nature** (IN, ID, BR, RU prominent), yet the top incumbents' traffic skews desktop (~71–85% est.). A fast, competent **mobile** workflow is an underserved wedge.
- Engagement patterns are classic utility: bounce 30–66%, ~1.7–3.2 pages/visit. **Cross-tool flows** (compress → resize → convert) are how repeat use compounds — our internal-linking and "next useful action" design target exactly this.
- **Client-side processing is now a proven model** (imagecompressor.com; Squoosh historically), but the biggest players are server-based with freemium limits. "No upload, no limits, no signup" remains a strong differentiator message.

### Feature-gap observations (from direct inspection)

- **Squoosh** (Google Chrome Labs): excellent local processing; repo shows no commits for ~2 years — **effectively in maintenance**; no exact-target-size workflow; developer-oriented UX. (Opportunity: inherit the trust of local processing, offer consumer workflows it lacks.)
- **TinyPNG/Tinify**: uploads to servers; free tier limited (20 files, 5 MB each); strong brand for "smaller images", **no exact KB targeting, no resize/crop**.
- **iLoveIMG**: breadth + batch, but server-side and premium-gated for scale; ads/CMP friction.
- **imagecompressor.com**: sharpest direct rival on client-side compression; **already publishes "How to Compress an Image to an Exact File Size"** — direct proof of the exact-size demand and our closest competitor to out-execute (postage: no per-requirement workflow, no form/social prep tools, no metadata/DPI utilities in the same destination).
- **11zon / resizeimage.net**: ad-dense, server-based, weaker UX; their traffic is real and indicates users tolerate friction — a fast, clean alternative wins on quality alone.
- Nobody inspected owns the **"requirement-prescribed image"** workflow end-to-end (upload limit in KB + pixel dimensions + format + background, in one pass).

---

## 3. Query clusters (24)

Legend — **Difficulty**: qualitative (no volume API available); reflects known incumbent strength per observation. **Cost**: engineering+dependency cost for MVP. **Repeat**: probability of return use. **Monetization**: ad-value estimate for the intent (form/visa/social searchers convert better than developers).

| # | Query cluster (representative) | User problem | Intent | Market signal | Main competitors | Difficulty | Our differentiator | Cost | Repeat | Monetization |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | "compress image to 50 kb / 100 kb / 200 kb" | Upload portals reject oversized files | Transactional | Thousands of variants exist in the wild; direct-rival blog page on this topic; form-portal demand | imagecompressor.com, 11zon, tinypng | High | Target-size engine w/ quality search + explicit "couldn't reach" honesty + dimension-reduction consent | Med | High | High |
| 2 | "compress image online free" | Big files slow to share/upload | Transactional | Category leaders each 1–35M visits (est.) | All | High | Zero-upload local processing; no limits; fastest shell (static HTML) | Med | High | High |
| 3 | "reduce image size without losing quality" | Fear of quality loss | Informational→Tool | Guides + tools both rank | tinywow, optimizilla | Med | Quality-first algorithm + visible quality/iteration report | Med | Med | Med |
| 4 | "resize image to 600x600 / exact pixels" | Platform demands exact dimensions | Transactional | resizeimage.net's core promise ("exact pixels") draws ~31M/mo (est., caution) | resizeimage.net, imageresizer, 11zon | High | Exact-dimension workflow with explicit stretch vs fit vs crop-to-ratio choice | Med | High | High |
| 5 | "resize image by percentage" | Quick proportional scaling | Transactional | Present in all suites | imageresizer, iloveimg | Med | Percent input + live target px display + preview | Low | Med | Med |
| 6 | "instagram post size / youtube thumbnail size" | Sizes keep changing; fear of crop | Informational→Tool | Buffer's guide (updated 2026-05) gets large traffic; IG official docs exist | Canva, Buffer, Adobe, iloveimg | Med–High | Versioned presets w/ source + reviewed date; one-click crop+resize; **no brand-impersonation** | Low–Med | High | Med |
| 7 | "convert png to jpg / jpg to png" | Compatibility/transparency needs | Transactional | Multi-million-visit single-purpose sites exist (png2jpg.com et al.) | convertio, iloveimg, per-site tools | High | Convert **+ resize + target-size** in one flow (incumbents fragment it) | Med | High | High |
| 8 | "heic to jpg" | iPhone photos won't open | Transactional | Very large demand; incumbent server tools do it reliably | iloveimg, heic-specific sites | Med volume / High trust barrier | Honest capability detection: decode natively where the browser supports it, otherwise a precise explanation and next steps — never a fake failure | Med | Med | High |
| 9 | "convert png/jpg to webp or avif" | Site speed | Transactional (dev) | Squoosh archived; converters abound | squoosh, imageconverter.com | Med | Codec honesty + measured savings + dev-first detail (no hype) | Med | Med | Med |
| 10 | "crop image to 1:1 / 4:5 / 16:9" | Social layout requirements | Transactional | Present in suites; ratio queries pervasive | iloveimg, birme, redketchup | Med | Visual crop + locked ratios + keyboard-numeric alternative (accessible) | High | Med | Med |
| 11 | "image size checker / what size is my image" | Verify before upload | Informational→Tool | Small tools rank; no leader owns it cleanly | imageresizer, small sites | Low–Med | Instant local inspector: bytes, px, ratio, MP, EXIF presence, print size | Low | High | Med |
| 12 | "signature resize under 20kb / 140x60" | Form/application uploads | Transactional | 11zon dominates this segment (IN-heavy); real volume | 11zon, compressjpeg | Med | Dedicated signature workflow (target KB + exact px + background + format) without country doorway pages | Med | High | Med |
| 13 | "photo under 100 kb for form / scholarship upload" | Portal limits (gov/edu) | Transactional | Subset of #1 with distinct workflow expectations | 11zon, compressjpeg | Med | Presets + explainer reused from target-size engine | — (reuses #1) | High | Med |
| 14 | "passport photo size" | ID photo compliance | Transactional | Huge but spam-heavy; country variants risk doorways | Many | High | **Deferred**: only build a generic mm/inch→px preparation surface; country pages are doorway territory per project rules | High | Med | Med |
| 15 | "remove exif / remove location from photo" | Privacy | Transactional | Steady; exifviewer.com & redketchup cover partially | exifviewer.com | Med | Local metadata viewer + one-click strip with before/after verification | Low–Med | Med | Med |
| 16 | "view image metadata / check exif" | Curiosity/pro use | Informational | Same tools as #15 | exifviewer.com | Med | Same tool; explicit "nothing leaves your device" | Low | Med | Low–Med |
| 17 | "image to base64 / data uri" | Embedding images (dev) | Transactional (dev) | Dev-tool sites stable traffic | many small dev tools | Med | Local encode + size/overhead math + copy UX; **no upload** | Low | High | Low (dev audience ad-poor) |
| 18 | "300 dpi converter / print size calculator" | DPI confusion | Transactional+Informational | Persistent confusion; print shops perpetuate myths | clideo-style converters (low quality) | Med | Technically honest tool: PPI metadata embed (JFIF) + calculator + "DPI doesn't create detail" explainer | Med | Med | Med |
| 19 | "compress image for email (under 10/25 MB)" | Mail attachment limits | Transactional | Bundled into #1/#2 | — | Med | Covered by target-size tool with K/M suffix parsing; no separate URL | — | Med | Med |
| 20 | "compress image for website / wordpress speed" | Page speed | Informational→Tool | Big dev/marketer demand; tinypng API/plugin owns part | tinypng, squoosh | Med | WebP/AVIF conversion + measured before/after evidence table | — (reuses #2/#9) | Med | Med |
| 21 | "bulk compress / resize images" | Many files | Transactional | tinywow/iloveimg batch wins here | tinywow, iloveimg | High | **Post-MVP**: engine is batch-ready by design (job array); do not launch half-baked | High | High | Med |
| 22 | "favicon generator" | Website setup | Transactional | redketchup/favicon.io own it | favicon.io | High | Deferred (distinct ICO/PNG-set rendering work) | Med | Med | Med |
| 23 | "color picker from image / palette" | Design work | Transactional (designer) | redketchup covers | redketchup | Med | Deferred; low strategic fit w/ "requirement" positioning | Low | Med | Low |
| 24 | "svg optimizer" | Dev | Transactional | svgomg owns | svgomg | Med | Deferred (different processing domain) | Med | Med | Low |

---

## 4. Launch toolset selection (what Gate 3–4 will build)

**Primary (Gate 3):** `compress-image-to-size` (hero), `resize-image`, `convert-image`, `crop-image`.
**Secondary (Gate 4):** `compress-image`, `image-size-checker`, `signature-resizer`, `social-image-resizer`, `image-metadata`, `image-dpi`, `image-to-base64`.

**Selection logic:** each URL represents a materially different user outcome; all share one engine (validate → decode → transform → encode → optimize → download); none require a server; the set covers clusters 1–13, 15–18 without doorway pages.

**Explicitly deferred** (documented, not silently dropped): bulk processing (#21), passport pages (#14), favicon (#22), color tools (#23), SVG (#24), HEIC-specific landing page (handled inside `convert-image` + `image-metadata` until decode reliability is proven cross-browser), image splitter, comparison, border/padding.

---

## 5. Monetization reality check

- AdSense is visible on category leaders (technology detection: imagecompressor.com, resizeimage.net, 11zon.com). Estimator math (HypeStat) puts ad revenue at roughly **$0.2K–1.2K/day for 1.5M–9.4M monthly visits** in this category's geography mix — i.e., ads are real but modest per visit; **traffic scale + retention are the levers**, not ad density.
- Therefore at launch: **no ads at all** (per project rules), prepare clean, non-deceptive reserved slots, and protect the tool's INP/LCP above everything.
- Future (not now): batch processing as a premium lever, an API, direct sponsorship. Documented in `docs/ADSENSE_READINESS.md` later; nothing purchased or activated.

---

## 6. Risks and unknowns

| Risk | Severity | Mitigation |
|---|---|---|
| Estimator numbers materially wrong (esp. resizeimage.net) | Med | Treat directionally; re-validate with real Search Console data post-launch |
| SERP difficulty unknown without live audit | Med | Build utility-first; track positions via Search Console loop; avoid head-on "compress image" page if it can't win — target long-tail exact-outcome queries first |
| HEIC browser decode variance | Med | Runtime decode probing + honest messaging; no advertised capability that can fail silently |
| "Exact size" expectations vs codec reality | High (trust) | Never claim mathematical equality; "≤ target", convergence reported, failures shown transparently |
| AI-search traffic shift (ChatGPT/Gemini referrals are measurable in competitor data) | Opportunity | Machine-readable, answer-first content from day one (structure, not hacks) |
| One-person ops vs feature-race | Med | Thematic focus on the "requirement" wedge; resist tool sprawl |

---

## 7. Post-launch validation loop (planned)

Search Console (queries → pages → position → CTR → completion) drives everything; new tools require **distinct intent + distinct functionality**. Numeric variants (`-to-20kb` etc.) are permanently forbidden as URLs — see `KEYWORD_MAP.md` policy section.

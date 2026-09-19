# KEYWORD MAP — Exact Image Toolkit

**Status:** Gate 0 artifact · **Last updated:** 2026-09-19
**Rule of this document:** One primary search intent → one canonical URL. Numeric variants live inside tools as inputs, never as URLs.

> **Volume disclaimer:** No keyword-volume API was available during research. Every "volume signal" below is either (a) derived from third-party traffic estimators of the pages that currently rank (HypeStat/SEMrush/SimilarWeb resale, retrieved 2026-09-19), (b) official documentation evidence, or (c) clearly labeled knowledge-based estimates. Nothing here is a verified search volume. Difficulty signals are qualitative.

---

## 0. Global rules (anti-cannibalization)

1. **One intent = one URL.** If a page's primary intent collides with an existing page, the new cluster is folded into the existing page's secondary content instead of creating a URL.
2. **Numeric variants never become URLs.** `/compress-image-to-50kb`, `/resize-to-600x600`, `/signature-under-20kb` etc. are forbidden. The canonical tools accept any target value.
3. **Country/platform variants never become URLs.** No `/signature-resize-india`, no platform-partner pages. Platform *presets* (dimensions only, factual naming) are UI options inside one canonical page.
4. **Format pairs are capped.** `png-to-jpg`, `heic-to-jpg`, `jpg-to-webp` etc. are options inside `/convert-image`. A dedicated page is allowed later only if it acquires materially different functionality **and** passes a cannibalization review recorded in `docs/SEO_PAGE_REGISTRY.md`.
5. **Merged-decision record:** "image dimensions" and "image size checker" were merged into **one** canonical page: `/image-size-checker` (primary query "image size checker", supported secondary "image dimensions checker"). Rationale: identical user intent (inspect without modifying); splitting would cannibalize.
6. **Canonical origin:** `SITE.url` = `https://www.imgexact.site` (canonical host; apex 308→www — see `BRAND_OPTIONS.md`). Self-referencing canonical on every indexable page.

---

## 1. Tool → intent map

### 1.1 `/` — Homepage / tool launcher
- **Primary intent:** discovery of an image utility ("image tools online").
- **Secondary:** brand queries.
- **SERP type:** mixed (suites, blogs). We do not chase the generic head term; homepage targets brand + navigational + "free image tools" mid-tail.
- **Canonical:** yes · **Schema:** `WebSite` (+ `Organization`).

### 1.2 `/compress-image-to-size` — Exact file size compressor (HERO)
- **Primary query:** "compress image to [X] kb" family (50 kb, 100 kb, 200 kb, 500 kb, 1 mb…).
- **Secondary queries:** "reduce image size to specific kb", "make image under 50kb", "compress jpg to 20 kb", "image compressor with target size".
- **Problem queries:** "image upload says file too large", "portal requires under 100kb photo".
- **Intent:** transactional (task completion).
- **SERP type:** tool pages + how-to articles. Direct competitor content exists (imagecompressor.com blog "exact file size") → intent validated.
- **Top competitors (est. traffic signal):** imagecompressor.com (~1.5M/mo est.), 11zon.com (~9.4M/mo est. network), tinypng (server-side, no target mode).
- **Volume signal (estimator/knowledge, unverified):** one of the category's strongest modifier families; thousands of live numeric variants indicate sustained demand.
- **Difficulty signal:** High on head variants; Med on specific-form variants.
- **CPC signal:** unavailable publicly; form/visa context suggests above-category-average commercial intent.
- **Content gap:** most tools either loop quality blindly or silently reduce dimensions. Nobody shows a convergence report + explicit consent for dimension reduction.
- **Our differentiator:** binary-search quality optimizer, "≤ target" wording, dimension-reduction opt-in, transparent failure report, all local.
- **Canonical:** `/compress-image-to-size` · **Schema:** `SoftwareApplication` + `BreadcrumbList`.

### 1.3 `/resize-image` — Image resizer
- **Primary query:** "resize image".
- **Secondary:** "resize image to 600x600", "resize image pixels", "resize image by percentage", "resize photo without losing quality".
- **Intent:** transactional.
- **SERP type:** tool pages (resizeimage.net ~31M/mo est. ⚠, imageresizer.com ~5.1M/mo est.).
- **Difficulty signal:** High (mature), but exact-dimension workflows remain weakly addressed on mobile.
- **Content gap:** incumbents hide the stretch/fit/crop decision or decide silently.
- **Our differentiator:** explicit output contract ("exactly 600×600: stretch / fit within / fill by crop"), aspect lock (on by default), live target preview, percentage + width-only/height-only modes.
- **Canonical:** `/resize-image` · **Schema:** `SoftwareApplication`.

### 1.4 `/convert-image` — Format converter
- **Primary query:** "image converter" / "convert png to jpg".
- **Secondary:** "convert to webp", "jpg to png converter", "convert image format online", "heic to jpg".
- **Intent:** transactional.
- **SERP type:** tool pages + converter networks (convertio, iloveimg).
- **Volume signal:** single-pair sites (png2jpg.com ~60K daily est.) indicate the pair queries alone are sizeable; long tail is enormous.
- **Difficulty:** High head, Med long-tail.
- **Content gap:** converters are single-purpose; users chain 2–3 sites to hit a requirement.
- **Our differentiator:** convert + resize + target size in one flow; AVIF/WebP encoding only when the browser actually supports it (runtime probe); HEIC/HEIF handled with honest capability detection (decodes where the browser can, explains precisely where it cannot).
- **Canonical:** `/convert-image` · **Schema:** `SoftwareApplication`.

### 1.5 `/crop-image` — Crop / aspect ratio
- **Primary query:** "crop image".
- **Secondary:** "crop image to 1:1", "crop to 4:5", "aspect ratio cropper", "crop photo to square", "crop to 16:9".
- **Intent:** transactional.
- **SERP type:** tools + Canva/Adobe tutorials.
- **Difficulty:** High.
- **Content gap:** free tools are ad-heavy and desktop-oriented; ratio math and mobile gestures are often clumsy.
- **Our differentiator:** visual crop with locked ratios (1:1, 4:5, 16:9, 9:16, 3:2, custom), **numeric x/y/w/h inputs for keyboard and precision**, center-snap, and output size = crop size by default.
- **Canonical:** `/crop-image` · **Schema:** `SoftwareApplication`.

### 1.6 `/compress-image` — General compressor
- **Primary query:** "compress image" (head term) / "image compressor".
- **Secondary:** "compress jpeg online", "reduce image file size", "photo compressor free", "compress image without losing quality".
- **Intent:** transactional.
- **SERP type:** the most mature SERP in the category (tinypng, iLoveIMG, imagecompressor.com, resizeimage.net…).
- **Difficulty:** High — we enter via quality/UX (speed, no upload, no limits, mobile) not via novelty.
- **Volume signal:** leaders' search-driven visits (est.) prove scale; head term realistically a long-term target.
- **Content gap:** most tools hide what compression did; no per-file evidence.
- **Our differentiator:** plain-gear quality modes (Light/Standard/Aggressive + custom), per-file report (bytes, %, dimensions, format, codec notes), target-size handoff link when the user actually needs a number.
- **Canonical:** `/compress-image` · **Schema:** `SoftwareApplication`.

### 1.7 `/image-size-checker` — Size & dimensions inspector (merged with "image dimensions")
- **Primary query:** "image size checker".
- **Secondary:** "check image dimensions", "what size is my image", "image resolution checker", "check photo dpi".
- **Intent:** informational → utility (no output file required).
- **SERP type:** small tool pages; no dominant owner.
- **Difficulty:** Low–Med.
- **Content gap:** most checkers show only width/height; few show estimated print size, EXIF presence, megapixels, and transparency in one shot.
- **Our differentiator:** instant, local, complete report: bytes, pixels, ratio (reduced fraction), megapixels, format + MIME, transparency, metadata presence (EXIF/GPS/XMP), print size at 300/150 DPI, file fingerprint-free.
- **Canonical:** `/image-size-checker` · **Schema:** `SoftwareApplication`.

### 1.8 `/signature-resizer` — Signature / forms preparation
- **Primary query:** "signature resize" / "resize signature for upload".
- **Secondary:** "signature under 20kb", "signature 140x60", "upload signature 20kb 140x60", "signature size converter".
- **Problem queries:** "signature file size too large", "signature not uploading".
- **Intent:** transactional; form/application context (high completion motivation).
- **SERP type:** tool pages; 11zon dominates several locales; quality of alternatives is poor.
- **Volume signal:** strong in IN/PH/ID/BD form contexts (knowledge-based; consistent with 11zon's India-heavy traffic share).
- **Difficulty:** Med.
- **Content gap:** existing tools are single-purpose, ad-dense, and often provide only one fixed preset with no explanation.
- **Our differentiator:** one workflow: exact px + max KB + output format (JPG/PNG) + background color for flattened PNGs + center-crop option; explicit "≤ KB" reporting; **no country pages**.
- **Canonical:** `/signature-resizer` · **Schema:** `SoftwareApplication`.

### 1.9 `/social-image-resizer` — Social presets
- **Primary query:** "social media image resizer" / "instagram post size".
- **Secondary:** "youtube thumbnail size", "instagram story size", "profile picture size", "tiktok video size".
- **Intent:** informational → transactional (inform me, then do it in one step).
- **SERP type:** guides (Buffer, Hootsuite, Sprout) + tool pages; guides get enormous traffic → we ship a guide-grade table **with a working tool attached**.
- **Evidence:** Instagram official docs confirm 1080px width ceiling and supported ratio range 1.91:1–3:4 (retrieved 2026-09-19); YouTube help confirms thumbnail upload flow (1280×720 standard documented across platform guides).
- **Difficulty:** Med–High (guides strong), but a fast tool page with a **maintained, source-linked preset table** differentiated by freshness discipline.
- **Content gap:** guides are static and outdated; tools are rigid.
- **Our differentiator:** real cropper + resizer driven by a versioned preset config (`src/config/social-presets.ts`) that records platform, format, dimensions, source URL, last reviewed date; factual naming only (no implied partnership).
- **Canonical:** `/social-image-resizer` · **Schema:** `SoftwareApplication`.

### 1.10 `/image-metadata` — Metadata viewer / remover
- **Primary query:** "remove exif data" / "view image metadata".
- **Secondary:** "remove metadata from photo", "remove location from photo", "exif viewer online", "strip exif".
- **Intent:** mixed informational/transactional, privacy-driven.
- **SERP type:** exifviewer.com + scattered tools.
- **Difficulty:** Med.
- **Content gap:** most viewers upload the file (privacy irony); removal is rarely verified before/after.
- **Our differentiator:** local parsing (JPEG APP1/EXIF incl. GPS presence, PNG text chunks), only uses locally-computed values; removal via re-encode with before/after metadata status shown; never transmits filename/metadata/pixels anywhere.
- **Canonical:** `/image-metadata` · **Schema:** `SoftwareApplication`.

### 1.11 `/image-dpi` — DPI/PPI calculator + metadata
- **Primary query:** "300 dpi converter" / "dpi converter".
- **Secondary:** "change dpi of image", "print size calculator", "pixels to inches", "what does 300 dpi mean".
- **Intent:** transactional + informational (need the concept explained before action).
- **SERP type:** tools of dubious accuracy + explainers.
- **Difficulty:** Med.
- **Content gap:** widespread misinformation; tools that "add detail" claims (scan-to-PDF bait) or pixel-stretching wrappers.
- **Our differentiator:** technically correct dual mode — (1) print-size calculator (px ÷ DPI), (2) embed PPI metadata by JFIF density patching (clearly labeled: marks intended print density, adds no detail), plus an explicit explainer of px vs PPI vs resampling.
- **Canonical:** `/image-dpi` · **Schema:** `SoftwareApplication`.

### 1.12 `/image-to-base64` — Developer encoder
- **Primary query:** "image to base64".
- **Secondary:** "convert image to base64", "data uri generator", "png to base64".
- **Intent:** transactional (developer).
- **SERP type:** dev utility sites.
- **Difficulty:** Med; low ad value (dev audience).
- **Content gap:** kitchen-sink dev sites with poor mobile UX and accidental upload.
- **Our differentiator:** strictly local encode, data URI + raw output, size overhead math (+33% vs file), CSS/HTML snippet helpers, clipboard UX.
- **Canonical:** `/image-to-base64` · **Schema:** `SoftwareApplication`.

---

## 2. Supporting pages

| URL | Intent | Notes |
|---|---|---|
| `/about` | Trust (who/why) | No fake team/social proof; states mission + methodology |
| `/privacy` | Trust (legal) | "Images never leave your device" + what (little) is collected; network audit reference |
| `/terms` | Trust (legal) | Plain-language terms |
| `404` | — | Helpful recovery links to top tools |

No blog at launch (project rule). Any future guide pages must target distinct informational intent not served by tool pages (e.g., deep explainers), and be registered in `docs/SEO_PAGE_REGISTRY.md` before creation.

---

## 3. Reserved future clusters (research-gated, NOT to build yet)

Bulk processing, passport/ID photo prep (generic only, no country pages), favicon generator, color picker/palette, image splitter, border/padding, SVG optimizer, image comparison, HEIC dedicated landing, base64 → image decode. Each requires: distinct intent proof, distinct functionality, cannibalization review, and Search Console evidence post-launch.

---

## 4. Title & description formulas (enforced in the tool registry, tested)

- **Title:** `{Primary verb phrase} ({concrete outcome}) — Free, No Upload | {Brand}` · ≤ 60 chars where possible.
  Example: `Compress Image to Exact Size (50 KB – 1 MB) — Free | ImgExact`.
- **Meta description:** answer-first, includes "no upload / local in your browser", the concrete constraint (KB, px, format), ≤ 155 chars.
- **H1:** plain user-language task; exactly one per page; matches primary query intent but not robotically.
- Registry enforces uniqueness (unit-tested); any collision fails the test suite.

---

## 5. Internal linking plan (semantic, capped)

- Compress-to-size → Resize, Convert, Checker.
- Compress → Compress-to-size, Convert, Resize.
- Resize → Crop, Compress, Convert.
- Convert → Compress, Resize, Checker.
- Crop → Resize, Social, Signature.
- Signature → Compress-to-size, Resize, Metadata.
- Social → Crop, Resize, Compress.
- Checker → Compress, Metadata, DPI.
- Metadata → Checker, Convert, Compress-to-size.
- DPI → Checker, Resize, Metadata.
- Base64 → Convert, Checker, Compress.
- After an action completes: **max 2–3** "you may also need" links, chosen contextually. No footer link farm (≤ 12 curated footer links).

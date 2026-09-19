# SEO PAGE REGISTRY — ImgExact

**Purpose:** one row per public page recording its primary intent, title, H1, canonical path, last significant update and the user problem it solves. This registry is the anti-cannibalization ledger: any new page must first prove a distinct intent that no row here already owns.
**Last updated:** 2026-09-19 (all pages same session).

| # | Canonical path | Primary intent | Title tag | H1 | Last reviewed | Target user problem | Status |
|---|---|---|---|---|---|---|---|
| 1 | `/` | Tool discovery + brand | ImgExact — Make any image fit the exact requirement | Make any image fit the exact requirement. | 2026-09-19 | "I have an image requirement and don't know which tool I need." | Live |
| 2 | `/compress-image-to-size` | Compress to a numeric target (KB/MB) | Compress Image to Exact Size (KB) - Free, No Upload | Compress an image to an exact file size | 2026-09-19 | "Upload portal rejects files over 50 KB." | Live |
| 3 | `/compress-image` | Generic compression (no numeric target) | Compress Image Online - Free, No Upload | Compress an image | 2026-09-19 | "Make this photo smaller, best quality possible." | Live |
| 4 | `/resize-image` | Resize to exact pixels / percent | Resize Image to Exact Pixels - Free, No Upload | Resize an image to exact dimensions | 2026-09-19 | "Platform needs exactly 600×600." | Live |
| 5 | `/convert-image` | Format conversion (incl. HEIC reading where supported) | Convert Image Format (JPG, PNG, WebP, AVIF) | Convert an image to another format | 2026-09-19 | "This file must be JPG/PNG/WebP." | Live |
| 6 | `/crop-image` | Crop to ratio / rectangle | Crop Image to Any Aspect Ratio (1:1, 4:5, 16:9) | Crop an image to any aspect ratio | 2026-09-19 | "My photo must be square / 4:5 / 16:9." | Live |
| 7 | `/signature-resizer` | Form/application signature preparation | Signature Resizer for Forms (KB + Pixels) | Resize a signature for forms and applications | 2026-09-19 | "Signature must be 140×60 px and under 20 KB." | Live |
| 8 | `/social-image-resizer` | Platform-specific sizing with current specs | Social Media Image Resizer (2026 Sizes) | Resize an image for social media | 2026-09-19 | "What size should this be for Instagram/YouTube?" | Live |
| 9 | `/image-size-checker` | Inspect-only (size, dims, ratio, metadata presence, print size) | Image Size Checker - Dimensions, DPI & EXIF | Image size and dimensions checker | 2026-09-19 | "Check this file before I upload it somewhere strict." | Live |
| 10 | `/image-metadata` | View + remove EXIF/GPS locally | Image Metadata Viewer & Remover (EXIF, GPS) | View and remove image metadata | 2026-09-19 | "Remove location data before sharing." | Live |
| 11 | `/image-dpi` | DPI/PPI literacy + density embedding + print-size math | Image DPI Converter & Print Size Calculator | DPI converter and print size calculator | 2026-09-19 | "Print shop asked for 300 DPI — what does that mean, and how do I set it?" | Live |
| 12 | `/image-to-base64` | Encode image → Base64 / data URI (local) | Image to Base64 Converter (Data URI) | Convert an image to Base64 | 2026-09-19 | "Embed a small image inline in HTML/CSS." | Live |
| 13 | `/about` | Trust | About ImgExact | About ImgExact | 2026-09-19 | "Who built this and why should I trust it?" | Live |
| 14 | `/privacy` | Trust / legal | Privacy — your images never leave your device | Privacy | 2026-09-19 | "What happens to my photos here?" | Live |
| 15 | `/terms` | Trust / legal | Terms of use | Terms of use | 2026-09-19 | "Any catches to using this for free?" | Live |

**Not indexable by design:** `/404` (noindex, excluded from sitemap). `robots.txt` and `sitemap.xml` are machine endpoints, not pages.

---

## Deliberately merged intents (do not split)

- **"image dimensions" + "image size checker"** → single page `#9`. Rationale: identical inspection intent.
- **Numeric compressor variants** (`-to-20kb`, `-to-50kb`, …) → never pages; inputs of `#2`.
- **Format pairs** (`png-to-jpg`, `heic-to-jpg`, …) → inputs of `#5` unless distinct functionality emerges (governance below).
- **Country signature variants** → prohibited (`#7` accepts the exact values instead).

## Governance rules for future pages (enforced before creation)

1. The page must own a **distinct primary intent** not covered by any row above (documented evidence required — Search Console queries post-launch, competitor SERP review, or platform spec change).
2. The intent must have **distinct functionality** — not just different keywords for the same action.
3. This registry is updated **in the same commit** that creates the page (intent, title, H1, canonical, target problem).
4. Cannibalization review: if an existing page could answer ≥80% of the query, the new content goes there instead.
5. Titles/descriptions remain unique (unit-tested) and within snippet lengths.

## Change log

| Date | Change | Notes |
|---|---|---|
| 2026-09-19 | Initial registry (15 indexable URLs) | All pages created + verified in one build; placeholders: `SITE.url` origin (see `DEPLOYMENT.md`). |

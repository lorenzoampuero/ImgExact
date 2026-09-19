# ADSENSE READINESS — assessment and guardrails

**Status:** preparation only. **No AdSense application has been filed, no ad code exists anywhere in the build, no third-party scripts are loaded.** Ads are gated behind `SITE.adsEnabled` (currently `false`); the `AdSlot` component renders nothing while disabled.

---

## Why not now

Per project rules: the site must first be working, useful, indexable, original, fast and complete. That bar is now met technically (see `PROJECT_STATUS.md`), but **applying for AdSense requires a deployed, publicly accessible site** — which is explicitly blocked on user approval and domain purchase. This document is the readiness checklist for that moment, not a substitute for it.

## Readiness checklist (program policies / content quality)

| Requirement | Status | Notes |
|---|---|---|
| Real, substantial tool functionality | ✅ | 11 working tools, browser-verified, no placeholders |
| Unique, original content | ✅ | First-party methodology, convergence reports, dated preset sources — not scraped or template text |
| Clear navigation | ✅ | Homepage launcher, capped footer, symmetric related links |
| Privacy policy | ✅ | `/privacy` — precise, matches the audited architecture |
| Terms | ✅ | `/terms` — plain language, no legal traps |
| About page | ✅ | `/about` — real description of the product and method |
| No fake content / social proof | ✅ | No testimonials, ratings, counters anywhere |
| No prohibited content | ✅ | Utility tools; no medical/legal advice, no adult content, no copyrighted media shipped |
| Site speed | ✅ (measured) | Static pages; LCP-critical path is one HTML + one CSS file. Field Core Web Vitals pending deployment |
| Mobile usability | ✅ | 390/430/768 px verified; mobile-first tool flows |
| Working ads integration planned without dark patterns | ✅ (design) | See placement rules below |

## Ad placement rules (binding for whoever enables ads)

1. **Never adjacent to action controls.** No ad may sit beside, above, or between the download button, the process button, the file dropzone, or the result panel's actions. Minimum separation: one full content section (≥ 320 px vertical) from any download/process control.
2. **Never above the tool.** The tool stays above the fold; the first ad slot is documented as *below the main content* (`AdSlot placement="tool-below-content"`).
3. **No visual confusion.** Ad containers must be visually distinct from buttons/CTAs, labeled as advertising where the network requires it, and never styled like a download or process control.
4. **No interstitials, no popups, no auto-refresh in view, no anchor overlays over controls.**
5. **No click encouragement.** No "support us by clicking", no arrows, no fake progress.
6. **Performance:** ads load asynchronously; the site must keep LCP/INP within budget with ads present — re-measure after enabling; treat regressions as bugs.
7. **Consent:** if serving to EEA/UK users with personalized ads, integrate a IAB TCF-compliant CMP *before* enabling personalized ads. Recommendation: start with **non-personalized ads** to keep the privacy posture consistent (the site currently promises zero third-party scripts; enabling any ad network changes that — update `/privacy` in the same change).
8. **ads.txt** must be added at the root when the network provides a publisher ID.

## When approved — technical steps (future change, single commit)

1. Obtain publisher ID; create `public/ads.txt`.
2. Update `/privacy`: disclose the ad partner, cookies/consent behavior; keep the "images never leave your device" promise intact (ads do not change image handling).
3. Set `adsEnabled: true` in `src/config/site.ts` and implement the loader inside `AdSlot` (async, after `load`; never blocking LCP).
4. Place exactly one slot on tool pages below content and one on the homepage below tools; verify spacing rules above.
5. Re-run: `npm test`, `astro check`, `npm run build`, network audit (`docs/PRIVACY_NETWORK_AUDIT.md`) — the audit must be updated to enumerate the new third-party requests honestly.
6. Re-run Lighthouse on the deployed origin.

## Risk register

| Risk | Mitigation |
|---|---|
| "Thin content" judgment if tools looked empty | Each tool page ships how-it-works, methodology, limitations, FAQ — first-party and specific |
| Ad layout degrading UX (the moat) | Hard placement rules above; single slot per page initially |
| Policy mismatch from privacy marketing | Privacy page updated in the same change that introduces any third-party script |
| Traffic-geography RPM reality | Ad revenue treated as secondary (see `research/MARKET_VALIDATION.md` §5); never optimize ad density over completion rate |

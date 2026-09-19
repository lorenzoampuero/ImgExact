# BRAND OPTIONS — Exact Image Toolkit

**Status:** Gate 0 artifact · **Last updated:** 2026-09-19
**Rule compliance:** No domain was purchased. No trademark application was filed. Nothing external was changed. This document prepares a decision; it does not execute it.

---

## 1. Naming criteria (per project brief)

short · international · easy to type · not tied to one feature · no SERP ambiguity · spellable in one try after hearing it · extensible to future tools (not "compress-something").

## 2. Collision screening method (what was actually checked)

- **DNS existence check** for `.com` candidates (`Resolve-DnsName -Type NS`, 2026-09-19, local resolver). No NS/A records ⇒ strong (not conclusive) signal of availability. Registrar-level WHOIS must be re-checked at purchase time.
- **Known-product collisions** from research knowledge and inspected material (e.g., "ExactImage" is a known open-source image-processing library; "IMG.LY" is a company — avoided category).
- **NOT yet done (required before spending money):** formal WHOIS, trademark databases (USPTO TESS, EUIPO, WIPO), social handle checks, app-store name checks, live SERP ambiguity check, native-speaker sanity check.

## 3. Candidate table

| # | Candidate (.com) | DNS signal (2026-09-19) | Meaning fit ("exact outcome, image tools") | Typeability | Spelling risk | Known collision notes | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **ImgExact** | No DNS records → likely registrable | High ("image, exact") | High (7 chars) | Low ("img" may autocorrect → "image" — acceptable, both work) | No prominent product found in checks so far; **verify trademark before purchase** | ⭐ **Primary recommendation** |
| 2 | **PixReq** | No DNS records | High ("pixel requirement") | High | Low | None found; "req" is developer-leaning | ⭐ Fallback #1 |
| 3 | **PixLine** | No DNS records | Low–Med (neutral) | High | Low | Generic; possible collision with design agencies (unverified) | Fallback #2 |
| 4 | **ImgReq** | No DNS records | High | High | Low ("req" jargon) | None found | Fallback #3 |
| 5 | **PixSized** | No DNS records | Med ("pixel sized") | Med ("Sized" spelling) | Med | None found | Consider |
| 6 | **ReqImage** | No DNS records | Med ("requirement image") | Med (awkward cadence) | Low | None found | Not preferred |
| 7 | ExactImage | Registered (NS found) | High | High | Low | **Known open-source library "ExactImage"**; also generically descriptive | Eliminated |
| 8 | PixExact | Registered | High | High | Low | Registered domain; ownership unknown | Eliminated |
| 9 | ExactPix | Registered | High | High | Low | Registered; also resembles many "exact" products | Eliminated |
| 10 | SizeCraft | Registered | Med | High | Low | Registered; "craft" suffix crowded | Eliminated |
| 11 | PixMint | Registered | Low | High | Low | Registered; fintech-adjacent names use "Mint" | Eliminated |
| 12 | VeriPix | Registered | Low–Med (verification ≠ sizing) | High | Low | Registered; connotation mismatch | Eliminated |
| — | PixBench, ImageBench, PixDock, PixHarbor, PixForge, SizeLine, PixPull | Registered (all) | varies | High | Low | Registered | Eliminated (recorded for traceability) |

## 4. Scoring of the shortlist

Scale 1–5 (5 = best). "Trademark confidence" stays **unknown** for all until formal search — scored conservatively.

| Criterion | ImgExact | PixReq | PixLine | ImgReq | PixSized |
|---|---|---|---|---|---|
| Positioning fit | 5 | 4 | 3 | 4 | 3 |
| Typability / memorability | 4 | 4 | 5 | 4 | 3 |
| International neutrality | 5 | 4 | 5 | 4 | 4 |
| Domain signal (likely free) | 5 | 5 | 5 | 5 | 5 |
| Spelling risk (inverse) | 4 | 5 | 5 | 4 | 3 |
| Brand extension to future tools | 4 | 4 | 5 | 4 | 4 |
| **Total** | **27** | **26** | **28**⚠ | **25** | **22** |

⚠ PixLine scores highest on neutrality but is the most generic/ambiguous in meaning — tie broken in favor of positioning fit: **ImgExact** stays primary; PixReq is the runner-up for a more distinctive mark.

## 5. Recommendation & working-brand policy

- **Working brand for the build: `ImgExact`** — used consistently in UI, metadata, and structured data.
- The name lives in **exactly one place** in code (`src/config/site.ts`), so a rebrand is a one-file change until launch.
- **Decision (2026-09-19): production domain = `imgexact.site`.** DNS screening on this date showed no records on `.site` or `.com` (strong signal of registrability — registrar WHOIS confirms at purchase). The origin is built into `src/config/site.ts` as the default; `PUBLIC_SITE_URL` remains as a staging override only.
- **Before any purchase or public launch, the operator must complete:** registrar WHOIS availability, USPTO/EUIPO/WIPO trademark search for "ImgExact" (incl. classes 9/42), social handle check, live search ambiguity check, and pronounceability check by a native English speaker. If any step fails, fall back to PixReq → PixLine.
- **No brand-impersonation risk in presets:** platform names are used factually only ("Instagram post 1080×1080") with no implied partnership; the footer includes a non-affiliation note in `/terms`.

## 6. Brand risk register

| Risk | Level | Mitigation |
|---|---|---|
| "ImgExact" auto-corrects to "image exact" in search | Low | Both spellings map to same intent; metadata includes both forms naturally in copy |
| Existing unregistered common-law user | Unknown | Formal trademark search before launch; rebrand is one-file change |
| Generic-descriptive weakness (hard to trademark strongly) | Med | Coinage ("ImgExact" as single word) + consistent usage builds distinctiveness evidence over time |
| Domain price premium at purchase | Unknown | Registrar re-check at purchase; budget gate is a user action |

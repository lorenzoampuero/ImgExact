# BING / COPILOT SETUP + IndexNow — manual steps after deploy

**Precondition:** deployed on the final domain `https://www.imgexact.site` with its origin carried in canonicals/sitemap/robots (verify via `node scripts/prod-check.mjs --origin https://www.imgexact.site`), same precondition as Search Console (`docs/LAUNCH_GATE.md`).

## 1. Bing Webmaster Tools

1. Go to Bing Webmaster Tools → *Add site*.
2. Fastest path: **Import from Google Search Console** (carries verification + sitemap).
3. Otherwise verify with either the XML file at the root or the meta-tag path: set `PUBLIC_BING_SITE_VERIFICATION` in Vercel → Settings → Environment Variables and redeploy — `BaseLayout.astro` then emits `<meta name="msvalidate.01">`.
4. Submit `https://<your-domain>/sitemap.xml` under *Sitemaps*.
5. Use *URL Inspection* on the homepage + top four tools once.

## 2. IndexNow (key generated and published — ready to run)

IndexNow notifies Bing (and other participating engines) about **changed URLs only**. The project rule: use it for URLs that were *added, materially changed, or removed* — never ping unchanged pages (it wastes crawl quota; Bing counts every submission against it).

**Setup (done 2026-09-20):**

1. Key: `ffd3028e54d261a7ec9ebfb0667673b2`.
2. Published as `public/ffd3028e54d261a7ec9ebfb0667673b2.txt` → served at `https://www.imgexact.site/ffd3028e54d261a7ec9ebfb0667673b2.txt` after the next deploy.
3. Key location URL for submissions: `https://www.imgexact.site/ffd3028e54d261a7ec9ebfb0667673b2.txt`.

**Submitting URLs (after each deploy that changes URLs):**

```powershell
npm run indexnow -- --host www.imgexact.site --key ffd3028e54d261a7ec9ebfb0667673b2 --key-file "https://www.imgexact.site/ffd3028e54d261a7ec9ebfb0667673b2.txt" --urls https://www.imgexact.site/compress-image-to-size https://www.imgexact.site/resize-image
```

The script (see `scripts/indexnow.mjs`) posts to `https://api.indexnow.org/indexnow` with the documented JSON body and reports the response per the official status table:

| Code | Meaning |
|---|---|
| 200 | URL(s) submitted successfully |
| 400 | Bad request format (bug in payload) |
| 403 | Key not valid (file missing or key mismatch) |
| 422 | URLs don't belong to the host, or key schema mismatch |
| 429 | Too many requests — stop and back off (spam protection) |

**Rules of use:**

- Batch only the URLs that actually changed in that deployment.
- Do not run on a schedule "just in case".
- After submitting, verify reception in Bing Webmaster Tools → *IndexNow* report.

## 3. What this project already provides for Bing/Copilot

- Static, crawlable HTML for every page (no client-side-only content).
- Canonical URLs, XML sitemap, `robots.txt` with explicit allowances (including OpenAI's search crawler per current docs).
- Clean internal linking with a symmetric, capped relation graph (max 3 per page).
- Answer-first content with dated review stamps plus first-party methodology sections — the kind of factual structure search assistants cite.

## 4. Post-deploy verification list

- [ ] `https://<domain>/robots.txt` shows the sitemap URL on the *final* domain (not the placeholder).
- [ ] `https://<domain>/sitemap.xml` returns 200 and lists 15 canonical URLs.
- [ ] A tool page's canonical tag equals its own URL.
- [ ] Bing Webmaster Tools shows the sitemap as processed.
- [ ] First IndexNow submission returns 200 and appears in the IndexNow report.

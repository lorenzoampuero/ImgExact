/**
 * Vercel Web Analytics loader — first-party, same-origin, CSP-safe.
 *
 * Why this module exists instead of the official Astro component:
 * The `@vercel/analytics/astro` component emits its loader as an *inline*
 * `<script type="module">`, which the production CSP (`script-src 'self'`,
 * `vercel.json`) correctly blocks — so analytics never loaded on the live site
 * (verified 2026-09-20: "Executing inline script violates … script-src 'self'",
 * `window.va` undefined). Astro emits this file as an external, same-origin
 * `_astro/*.js` bundle instead, so the official package, endpoints and dataset
 * attributes are unchanged while the CSP stays strict.
 *
 * Production: injects `/_vercel/insights/script.js`; the beacon posts to
 * `/_vercel/insights/view` — both same-origin, no cookies (docs/ANALYTICS.md).
 * Development: the package's debug script logs events to the console.
 */
import { inject } from '@vercel/analytics';

inject({ framework: 'astro' });

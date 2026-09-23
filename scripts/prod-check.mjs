#!/usr/bin/env node
/**
 * Production verification for ImgExact — run against the deployed site before declaring VERIFIED PROD.
 *
 * Usage:
 *   node scripts/prod-check.mjs --origin https://your-domain
 *   node scripts/prod-check.mjs --origin https://your-domain --base http://localhost:4321   (dry run)
 *
 * --origin  Expected production origin (protocol + host, no trailing slash). Every canonical URL,
 *           the robots Sitemap line and every sitemap URL must match it.
 * --base    Where to fetch from (defaults to --origin). Use for dry runs against a local preview
 *           that was built with the same PUBLIC_SITE_URL.
 *
 * No dependencies; makes no network calls other than to --base. Exit codes: 0 pass, 1 failures, 2 usage.
 */

const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
};

const origin = (argValue('--origin') ?? '').trim().replace(/\/+$/, '');
const base = (argValue('--base') ?? origin).trim().replace(/\/+$/, '');

if (!/^https?:\/\/[^/]+$/.test(origin)) {
  console.error(
    'Usage: node scripts/prod-check.mjs --origin https://your-domain [--base http://localhost:4321]',
  );
  process.exit(2);
}

const PAGES = [
  '/',
  '/compress-image-to-size',
  '/compress-image',
  '/resize-image',
  '/convert-image',
  '/crop-image',
  '/image-to-base64',
  '/guides',
  '/guides/image-compression-explained',
];
const EXPECTED_SITEMAP_URLS = 20;

/** Server-rendered keyword guard: these phrases must exist in the HTML the crawler gets. */
const KEYWORD_GUARD = [
  ['/compress-image-to-size', 'compress image to 50 kb'],
  ['/resize-image', 'resize image to 600x600'],
  ['/convert-image', 'convert png to jpg'],
  ['/image-size-checker', 'check image dimensions'],
  ['/image-metadata', 'remove exif data'],
  ['/compress-image-to-size', 'common requirements'],
];

/** Brand and hero assets that must resolve (they are referenced from the HTML). */
const ASSETS = ['/logo.svg', '/apple-touch-icon.png', '/site.webmanifest', '/samples/example-photo-800w.jpg'];

let checks = 0;
let failures = 0;
let warnings = 0;
const report = (ok, label, detail = '') => {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};
/** Non-fatal: reported, but never flips the exit code. */
const warn = (label, detail = '') => {
  warnings += 1;
  console.log(`WARN  ${label}${detail ? ` — ${detail}` : ''}`);
};

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: { 'user-agent': 'ImgExact-prod-check/1.0' },
  });
  return { status: res.status, body: await res.text() };
}

async function checkPage(path) {
  try {
    const { status, body } = await fetchText(`${base}${path}`);
    const problems = [];
    if (status !== 200) problems.push(`status ${status}`);
    const canonical = [...body.matchAll(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/g)].map(
      (m) => m[1],
    );
    const wantCanonical = `${origin}${path}`;
    if (canonical.length !== 1 || canonical[0] !== wantCanonical) {
      problems.push(`canonical ${canonical[0] ?? 'missing'} (want ${wantCanonical})`);
    }
    const h1Count = [...body.matchAll(/<h1[\s>]/g)].length;
    if (h1Count !== 1) problems.push(`${h1Count} <h1> tag(s)`);
    if (!body.includes('application/ld+json')) problems.push('no JSON-LD');
    if (!/<title>[^<]+<\/title>/.test(body)) problems.push('no <title>');
    if (!body.includes('property="og:image:alt"')) problems.push('no og:image:alt');
    if (!body.includes('property="og:locale"')) problems.push('no og:locale');
    report(problems.length === 0, path, problems.join('; '));
  } catch (err) {
    report(false, path, `fetch failed: ${err.message}`);
  }
}

async function checkRobots() {
  try {
    const { status, body } = await fetchText(`${base}/robots.txt`);
    const want = `Sitemap: ${origin}/sitemap.xml`;
    const problems = [];
    if (status !== 200) problems.push(`status ${status}`);
    if (!body.includes(want)) problems.push(`missing "${want}"`);
    report(problems.length === 0, '/robots.txt', problems.join('; '));
  } catch (err) {
    report(false, '/robots.txt', `fetch failed: ${err.message}`);
  }
}

async function checkSitemap() {
  try {
    const { status, body } = await fetchText(`${base}/sitemap.xml`);
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const offOrigin = locs.filter((u) => !u.startsWith(`${origin}/`));
    const problems = [];
    if (status !== 200) problems.push(`status ${status}`);
    if (locs.length !== EXPECTED_SITEMAP_URLS) {
      problems.push(`${locs.length} URLs (want ${EXPECTED_SITEMAP_URLS})`);
    }
    if (offOrigin.length > 0) problems.push(`off-origin URL e.g. ${offOrigin[0]}`);
    report(problems.length === 0, '/sitemap.xml', problems.join('; '));
  } catch (err) {
    report(false, '/sitemap.xml', `fetch failed: ${err.message}`);
  }
}

const FAQ_PAGE = '/compress-image-to-size';

const decodeEntities = (html) =>
  html
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

async function checkFaqSchema() {
  try {
    const { status, body } = await fetchText(`${base}${FAQ_PAGE}`);
    const problems = [];
    if (status !== 200) problems.push(`status ${status}`);

    const blocks = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
      (m) => m[1],
    );
    const faq = blocks
      .map((raw) => {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed && parsed['@type'] === 'FAQPage');

    if (!faq) {
      problems.push('no FAQPage JSON-LD');
    } else {
      const questions = (faq.mainEntity ?? []).map((item) => item.name);
      if (questions.length < 3) problems.push(`${questions.length} questions (want >= 3)`);
      const visibleText = decodeEntities(body);
      const missing = questions.filter((question) => !visibleText.includes(question));
      if (missing.length > 0) problems.push(`question not visible on the page: "${missing[0]}"`);
    }

    report(problems.length === 0, `${FAQ_PAGE} FAQ schema`, problems.join('; '));
  } catch (err) {
    report(false, `${FAQ_PAGE} FAQ schema`, `fetch failed: ${err.message}`);
  }
}

async function checkAnalytics() {
  try {
    const { status, body } = await fetchText(`${base}/`);
    const problems = [];
    if (status !== 200) problems.push(`status ${status}`);

    // The loader must live in an external, same-origin bundle: an inline loader
    // would be blocked by the production CSP (regression caught 2026-09-20).
    const scriptSrcs = [...body.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
    let loaderFound = false;
    for (const src of scriptSrcs) {
      if (!src.startsWith('/')) continue;
      try {
        const bundle = await fetchText(`${base}${src}`);
        if (bundle.body.includes('_vercel/insights')) {
          loaderFound = true;
          break;
        }
      } catch {
        /* a missing bundle is reported by the page checks */
      }
    }
    if (!loaderFound) problems.push('no same-origin analytics loader in a bundled script');
    report(problems.length === 0, 'Web Analytics loader (CSP-safe)', problems.join('; '));

    const res = await fetch(`${base}/_vercel/insights/script.js`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': 'ImgExact-prod-check/1.0' },
    });
    if (res.status === 200) {
      report(true, 'Web Analytics script route');
    } else {
      warn(
        'Web Analytics script route',
        `/_vercel/insights/script.js → ${res.status}; enable Analytics in the Vercel dashboard, then redeploy`,
      );
    }
  } catch (err) {
    report(false, 'Web Analytics', `fetch failed: ${err.message}`);
  }
}

/** Inline executable scripts would be silently blocked by the production CSP. */
async function checkNoInlineScripts() {
  try {
    const { status, body } = await fetchText(`${base}/`);
    const problems = [];
    if (status !== 200) problems.push(`status ${status}`);
    const inline = [...body.matchAll(/<script(?![^>]*\ssrc=)[^>]*>/g)].map((m) => m[0]);
    const executable = inline.filter((tag) => !tag.includes('application/ld+json'));
    if (executable.length > 0) {
      problems.push(`${executable.length} inline executable script(s) would be blocked by script-src 'self'`);
    }
    report(problems.length === 0, 'CSP: no inline executable scripts', problems.join('; '));
  } catch (err) {
    report(false, 'CSP: no inline executable scripts', `fetch failed: ${err.message}`);
  }
}

/** The declared target phrases must be in the served HTML, not in a script bundle. */
async function checkRenderedKeywords() {
  for (const [path, phrase] of KEYWORD_GUARD) {
    try {
      const { status, body } = await fetchText(`${base}${path}`);
      const problems = [];
      if (status !== 200) problems.push(`status ${status}`);
      if (!body.toLowerCase().includes(phrase)) problems.push(`"${phrase}" not in the served HTML`);
      report(problems.length === 0, `${path} keyword: ${phrase}`, problems.join('; '));
    } catch (err) {
      report(false, `${path} keyword: ${phrase}`, `fetch failed: ${err.message}`);
    }
  }
}

async function checkAssets() {
  const problems = [];
  for (const asset of ASSETS) {
    try {
      const res = await fetch(`${base}${asset}`, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: { 'user-agent': 'ImgExact-prod-check/1.0' },
      });
      if (res.status !== 200) problems.push(`${asset} → ${res.status}`);
    } catch (err) {
      problems.push(`${asset} → ${err.message}`);
    }
  }
  report(problems.length === 0, 'brand & hero assets', problems.join('; '));
}

/**
 * /slug/ must not serve a duplicate of /slug. Vercel applies `trailingSlash: false`;
 * a local preview cannot, so that case is reported as a warning rather than a failure.
 */
async function checkTrailingSlash() {
  try {
    const res = await fetch(`${base}/resize-image/`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': 'ImgExact-prod-check/1.0' },
    });
    if (res.status >= 300 && res.status < 400) {
      report(true, 'trailing slash redirect', `${res.status} → ${res.headers.get('location') ?? ''}`);
    } else {
      warn(
        'trailing slash redirect',
        `/resize-image/ returned ${res.status}; expected a redirect on Vercel (trailingSlash: false) — local previews cannot do this`,
      );
    }
  } catch (err) {
    warn('trailing slash redirect', `fetch failed: ${err.message}`);
  }
}

console.log(`ImgExact production check — expected origin: ${origin}`);
console.log(`Fetching from: ${base}\n`);

// Sequential on purpose: readable output, nothing to parallelize.
for (const path of PAGES) {
  await checkPage(path);
}
await checkRobots();
await checkSitemap();
await checkFaqSchema();
await checkRenderedKeywords();
await checkAssets();
await checkTrailingSlash();
await checkAnalytics();
await checkNoInlineScripts();

console.log(
  `\n${failures === 0 ? 'RESULT: PASS' : 'RESULT: FAIL'} — ${checks - failures}/${checks} checks passed` +
    (warnings > 0 ? `, ${warnings} warning(s)` : ''),
);
// Set the exit code and let Node close pooled sockets naturally — calling process.exit() here
// races undici's socket cleanup and trips a libuv assertion on Windows (observed 2026-09-19).
process.exitCode = failures === 0 ? 0 : 1;

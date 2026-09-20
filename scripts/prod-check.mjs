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
];
const EXPECTED_SITEMAP_URLS = 15;

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
    const { body } = await fetchText(`${base}/`);
    const problems = [];
    if (!body.includes('<vercel-analytics')) problems.push('analytics component missing from HTML');
    report(problems.length === 0, 'Web Analytics component', problems.join('; '));

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

console.log(`ImgExact production check — expected origin: ${origin}`);
console.log(`Fetching from: ${base}\n`);

// Sequential on purpose: readable output, nothing to parallelize.
for (const path of PAGES) {
  await checkPage(path);
}
await checkRobots();
await checkSitemap();
await checkFaqSchema();
await checkAnalytics();

console.log(
  `\n${failures === 0 ? 'RESULT: PASS' : 'RESULT: FAIL'} — ${checks - failures}/${checks} checks passed` +
    (warnings > 0 ? `, ${warnings} warning(s)` : ''),
);
// Set the exit code and let Node close pooled sockets naturally — calling process.exit() here
// races undici's socket cleanup and trips a libuv assertion on Windows (observed 2026-09-19).
process.exitCode = failures === 0 ? 0 : 1;

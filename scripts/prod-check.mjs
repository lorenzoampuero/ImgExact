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
const report = (ok, label, detail = '') => {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
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

console.log(`ImgExact production check — expected origin: ${origin}`);
console.log(`Fetching from: ${base}\n`);

// Sequential on purpose: readable output, nothing to parallelize.
for (const path of PAGES) {
  await checkPage(path);
}
await checkRobots();
await checkSitemap();

console.log(
  `\n${failures === 0 ? 'RESULT: PASS' : 'RESULT: FAIL'} — ${checks - failures}/${checks} checks passed`,
);
// Set the exit code and let Node close pooled sockets naturally — calling process.exit() here
// races undici's socket cleanup and trips a libuv assertion on Windows (observed 2026-09-19).
process.exitCode = failures === 0 ? 0 : 1;

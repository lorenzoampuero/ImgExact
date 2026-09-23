#!/usr/bin/env node
/**
 * IndexNow submission helper — run MANUALLY, after a deployment that actually
 * added, materially changed or removed URLs. Do not submit unchanged pages
 * (every submission counts against crawl quota).
 *
 * Usage:
 *   node scripts/indexnow.mjs --host example.com --key <hex> \
 *     --key-file https://example.com/<hex>.txt \
 *     --urls https://example.com/compress-image-to-size https://example.com/resize-image
 *
 * Preparation and response-code meanings: docs/BING_SETUP.md
 */

const args = process.argv.slice(2);

function getFlag(name) {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : null;
}

function getList(name) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return [];
  const out = [];
  for (let j = i + 1; j < args.length; j++) {
    if (args[j].startsWith('--')) break;
    out.push(args[j]);
  }
  return out;
}

const host = getFlag('host');
const key = getFlag('key');
const keyFile = getFlag('key-file');
const urls = getList('urls');

if (!host || !key || urls.length === 0) {
  console.error(
    'Missing arguments.\n' +
    'Usage: node scripts/indexnow.mjs --host <domain> --key <key> [--key-file <url>] --urls <url> [url...]\n' +
    'See docs/BING_SETUP.md for the full setup and rules.',
  );
  process.exit(1);
}

for (const url of urls) {
  if (!url.startsWith(`https://${host}/`) && url !== `https://${host}`) {
    console.error(`Refusing to submit "${url}" — it does not belong to host "${host}".`);
    process.exit(1);
  }
}

const body = { host, key, urlList: urls };
if (keyFile) body.keyLocation = keyFile;

const CODE_MEANINGS = {
  200: 'URLs submitted successfully',
  202: 'URLs accepted — key validation pending (also a success)',
  400: 'Bad request format',
  403: 'Key not valid (hosted key file missing or mismatch)',
  422: 'URLs do not belong to the host, or key schema mismatch',
  429: 'Too many requests — stop and back off (spam protection)',
};

/** IndexNow answers 200 (already validated) or 202 (accepted, key pending) for a good submission. */
const SUCCESS_CODES = new Set([200, 202]);

try {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const meaning = CODE_MEANINGS[response.status] ?? response.statusText;
  console.log(`IndexNow response: ${response.status} — ${meaning}`);
  console.log(`Submitted ${urls.length} URL(s) for host ${host}.`);
  // Set the exit code instead of calling process.exit(): on Windows, exiting while
  // undici closes its sockets trips a libuv assertion (observed 2026-09-19).
  process.exitCode = SUCCESS_CODES.has(response.status) ? 0 : 1;
} catch (error) {
  console.error('IndexNow request failed (no network?):', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

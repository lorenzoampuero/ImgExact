#!/usr/bin/env node
/**
 * WCAG contrast guard for the design tokens in src/styles/global.css.
 *
 * The palette is the brand: changing a hex value is a UI decision that must not
 * silently break accessibility (the axe-core pass in docs/PROJECT_STATUS.md
 * assumes AA). This script parses the light and dark token blocks and fails
 * when a defined pairing drops below its threshold.
 *
 * Usage: node scripts/check-contrast.mjs   (exit 0 = all pairs pass)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'src/styles/global.css'), 'utf8');

/** Extracts `--token: #hex;` declarations from the first/dark token blocks. */
function tokensFrom(block) {
  const map = new Map();
  for (const match of block.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    map.set(match[1], match[2].toLowerCase());
  }
  return map;
}

const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const lightCss = css.slice(0, darkStart);
const darkCss = css.slice(darkStart, css.indexOf('/* ---', darkStart));

const light = tokensFrom(lightCss);
const dark = tokensFrom(darkCss);

/** WCAG 2.x relative luminance. */
function luminance(hex) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** [foreground, background, minimum ratio, description] */
const PAIRS = [
  ['text', 'bg', 4.5, 'body text on page background'],
  ['text', 'surface', 4.5, 'body text on cards'],
  ['text-secondary', 'bg', 4.5, 'secondary text on page background'],
  ['accent', 'bg', 4.5, 'link colour on page background'],
  ['accent', 'surface', 4.5, 'link colour on cards'],
  ['accent-text', 'accent-soft', 4.5, 'accent label on soft accent'],
  ['on-accent', 'accent-solid', 4.5, 'button label on primary button'],
  ['success', 'bg', 4.5, 'success text'],
  ['warning', 'bg', 4.5, 'warning text'],
  ['error', 'bg', 4.5, 'error text'],
  ['success-text', 'success-soft', 4.5, 'success badge'],
  ['warning-text', 'warning-soft', 4.5, 'warning badge'],
  ['error-text', 'error-soft', 4.5, 'error badge'],
];

let failures = 0;
for (const [themeName, tokens] of [
  ['light', light],
  ['dark', dark],
]) {
  console.log(`\n${themeName.toUpperCase()} theme`);
  for (const [fg, bg, min, label] of PAIRS) {
    const foreground = tokens.get(fg);
    const background = tokens.get(bg);
    if (!foreground || !background) {
      failures += 1;
      console.log(`FAIL  ${label} — token missing (${fg}/${bg})`);
      continue;
    }
    const ratio = contrast(foreground, background);
    const ok = ratio >= min;
    if (!ok) failures += 1;
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${ratio.toFixed(2)}:1 (min ${min}) — ${label} [${foreground} on ${background}]`,
    );
  }
}

console.log(failures === 0 ? '\nRESULT: PASS' : `\nRESULT: FAIL — ${failures} pair(s)`);
process.exitCode = failures === 0 ? 0 : 1;

/**
 * Byte-level fixtures: EXIF injection, corrupt files, mislabeled extensions,
 * and a fake oversized header for the decompression-bomb guard.
 * Pure Node, no dependencies.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const fixtures = join(root, 'tests', 'fixtures');

const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const u16be = (v) => [(v >> 8) & 0xff, v & 0xff];
const u16le = (v) => [v & 0xff, (v >> 8) & 0xff];
const u32le = (v) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff];

/** Builds a JPEG with an EXIF APP1 segment (IFD0: Orientation + Software). */
function makeExifSegment(orientation, software) {
  const sw = [...ascii(software), 0];
  const entries = [
    { tag: 0x0112, type: 3, count: 1, inline: [orientation, 0, 0, 0] },
    { tag: 0x0131, type: 2, count: sw.length, inline: null, data: sw },
  ];
  const ifd0Size = 2 + entries.length * 12 + 4;
  let cursor = 8 + ifd0Size; // TIFF header is 8 bytes
  const valueOffsets = entries.map((e) => {
    if (e.inline) return null;
    const at = cursor;
    cursor += e.data.length + (e.data.length % 2);
    return at;
  });

  const ifd0 = [];
  ifd0.push(...u16le(entries.length));
  entries.forEach((e, i) => {
    ifd0.push(e.tag & 0xff, (e.tag >> 8) & 0xff);
    ifd0.push(e.type & 0xff, 0);
    ifd0.push(...u32le(e.count));
    if (e.inline) ifd0.push(...e.inline);
    else ifd0.push(...u32le(valueOffsets[i]));
  });
  ifd0.push(...u32le(0));

  const values = [];
  for (const e of entries) {
    if (e.inline) continue;
    values.push(...e.data);
    if (e.data.length % 2) values.push(0);
  }

  const tiff = [...ascii('II'), 0x2a, 0x00, ...u32le(8), ...ifd0, ...values];
  const payload = [...ascii('Exif'), 0x00, 0x00, ...tiff];
  return [0xff, 0xe1, ...u16be(payload.length + 2), ...payload];
}

/** Minimal JPEG skeleton with a given SOF0 size (no actual scan data). */
function makeFakeJpeg(width, height) {
  const sof = [0xff, 0xc0, ...u16be(17), 8, ...u16be(height), ...u16be(width), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return Uint8Array.from([0xff, 0xd8, ...sof, 0xff, 0xd9]);
}

const tasks = [];
const base = join(fixtures, 'gradient-800x600.jpg');
if (!existsSync(base)) {
  console.error(`Base fixture missing: ${base}. Run scripts/make-fixtures.ps1 first.`);
  process.exit(1);
}

// 1. EXIF orientation fixture: insert APP1 right after SOI.
{
  const original = readFileSync(base);
  const app1 = makeExifSegment(6, 'FixtureCam 1.0');
  const out = Buffer.concat([
    original.subarray(0, 2),
    Buffer.from(app1),
    original.subarray(2),
  ]);
  writeFileSync(join(fixtures, 'exif-orientation.jpg'), out);
  tasks.push('exif-orientation.jpg');
}

// 2. Corrupt JPEG: valid SOI then garbage (decode must fail cleanly).
{
  const bytes = Buffer.alloc(256, 0xab);
  bytes[0] = 0xff; bytes[1] = 0xd8; bytes[2] = 0xff;
  writeFileSync(join(fixtures, 'corrupt.jpg'), bytes);
  tasks.push('corrupt.jpg');
}

// 3. Not an image at all, with an image extension.
{
  writeFileSync(join(fixtures, 'not-an-image.jpg'), Buffer.from('This file is plain text, not an image.\n'));
  tasks.push('not-an-image.jpg');
}

// 4. PNG content with a .jpg extension (extension/content mismatch path).
{
  copyFileSync(join(fixtures, 'transparent-640x480.png'), join(fixtures, 'mislabeled.png-as-jpg.jpg'));
  tasks.push('mislabeled.png-as-jpg.jpg');
}

// 5. Fake huge-header JPEG: triggers the pre-decode pixel guard without decoding.
{
  writeFileSync(join(fixtures, 'huge-claim-30000x30000.jpg'), Buffer.from(makeFakeJpeg(30000, 30000)));
  tasks.push('huge-claim-30000x30000.jpg');
}

console.log('Byte-level fixtures written:', tasks.join(', '));

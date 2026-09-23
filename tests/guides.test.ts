/**
 * Guide registry integrity — the governance rules of docs/SEO_PAGE_REGISTRY.md
 * applied to the informational layer.
 */
import { describe, it, expect } from 'vitest';
import { GUIDES, GUIDES_REVIEWED_AT } from '../src/data/guides';
import { TOOLS } from '../src/data/tools';

function guideWords(guide: (typeof GUIDES)[number]): number {
  const text = [
    ...guide.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
      ...(section.list ?? []),
      ...(section.table?.rows.flatMap((row) => row) ?? []),
    ]),
    ...guide.faq.flatMap((entry) => [entry.q, entry.a]),
  ].join(' ');
  return text.split(/\s+/).filter(Boolean).length;
}

describe('guide registry', () => {
  it('ships at least four guides', () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(4);
  });

  it('slugs are unique, and no tool slug collides with a guide slug', () => {
    const slugs = GUIDES.map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const toolSlugs = new Set(TOOLS.map((tool) => tool.slug));
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(slug).not.toMatch(/\d+\s*(kb|mb|px)/);
      expect(toolSlugs.has(slug)).toBe(false);
    }
  });

  it('titles, h1s and meta descriptions are unique and within snippet range', () => {
    const titles = GUIDES.map((guide) => guide.title.toLowerCase());
    const h1s = GUIDES.map((guide) => guide.h1.toLowerCase());
    const descriptions = GUIDES.map((guide) => guide.metaDescription.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(h1s).size).toBe(h1s.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const guide of GUIDES) {
      expect(guide.title.length).toBeGreaterThan(20);
      expect(guide.title.length).toBeLessThanOrEqual(62);
      expect(guide.metaDescription.length).toBeGreaterThanOrEqual(70);
      expect(guide.metaDescription.length).toBeLessThanOrEqual(165);
    }
  });

  it('every guide records its intent and its anti-cannibalization rationale', () => {
    for (const guide of GUIDES) {
      expect(guide.intent.length, guide.slug).toBeGreaterThan(30);
      expect(guide.cannibalization.length, guide.slug).toBeGreaterThan(60);
      expect(guide.intent).toMatch(/^(informational|commercial investigation):/);
    }
  });

  it('guides are substantial (sections, prose volume, no empty sections)', () => {
    for (const guide of GUIDES) {
      expect(guide.sections.length, guide.slug).toBeGreaterThanOrEqual(4);
      expect(guideWords(guide), guide.slug).toBeGreaterThanOrEqual(500);
      for (const section of guide.sections) {
        const hasProse = section.paragraphs.length > 0;
        const hasStructured = Boolean(section.list?.length) || Boolean(section.table?.rows.length);
        expect(hasProse || hasStructured, `${guide.slug}: empty section "${section.heading}"`).toBe(true);
        for (const paragraph of section.paragraphs) {
          expect(paragraph.length, `${guide.slug}: short paragraph`).toBeGreaterThanOrEqual(80);
        }
      }
    }
  });

  it('tables are rectangular', () => {
    for (const guide of GUIDES) {
      for (const section of guide.sections) {
        if (!section.table) continue;
        const columns = section.table.columns.length;
        expect(columns).toBeGreaterThanOrEqual(2);
        for (const row of section.table.rows) {
          expect(row.length, `${guide.slug}: table row width`).toBe(columns);
        }
      }
    }
  });

  it('every related slug is a real tool and every guide hands off to at least two', () => {
    const toolSlugs = new Set(TOOLS.map((tool) => tool.slug));
    for (const guide of GUIDES) {
      expect(guide.related.length).toBeGreaterThanOrEqual(2);
      expect(guide.related.length).toBeLessThanOrEqual(3);
      for (const slug of guide.related) expect(toolSlugs.has(slug), `${guide.slug} → ${slug}`).toBe(true);
    }
  });

  it('sources are https links with labels, and dates are valid', () => {
    for (const guide of GUIDES) {
      expect(guide.sources.length, guide.slug).toBeGreaterThanOrEqual(2);
      for (const source of guide.sources) {
        expect(source.url.startsWith('https://')).toBe(true);
        expect(source.label.length).toBeGreaterThan(10);
      }
      expect(guide.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(guide.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(GUIDES_REVIEWED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('FAQ entries are answer-first and substantial', () => {
    for (const guide of GUIDES) {
      expect(guide.faq.length, guide.slug).toBeGreaterThanOrEqual(3);
      for (const entry of guide.faq) {
        expect(entry.q.endsWith('?')).toBe(true);
        expect(entry.a.length).toBeGreaterThanOrEqual(60);
        expect(entry.a.toLowerCase()).not.toMatch(/^(in today's|in the modern|welcome|as we all know)/);
      }
    }
  });

  it('every guide hands off to a compressor or converter (commercial path exists)', () => {
    const commercial = new Set([
      'compress-image',
      'compress-image-to-size',
      'convert-image',
      'resize-image',
      'crop-image',
    ]);
    for (const guide of GUIDES) {
      expect(guide.related.some((slug) => commercial.has(slug)), guide.slug).toBe(true);
    }
  });
});

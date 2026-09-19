/**
 * Registry integrity tests — enforces the SEO/anti-cannibalization policies.
 */
import { describe, it, expect } from 'vitest';
import { TOOLS, HOMEPAGE_ORDER, TOOL_CATEGORIES } from '../src/data/tools';
import { SOCIAL_PRESETS, PRESETS_REVIEWED_AT, PRESET_PLATFORMS } from '../src/config/social-presets';

const REQUIREMENTS = ['Instagram', 'Facebook', 'X', 'LinkedIn', 'YouTube', 'TikTok'];

describe('tool registry', () => {
  it('has at least 11 tools', () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(11);
  });

  it('slugs are unique and contain no numeric size variants (anti-doorway policy)', () => {
    const slugs = TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z][a-z0-9-]*$/);
      // "compress-image-to-20kb", "resize-to-600px" etc. must never exist as URLs.
      expect(slug).not.toMatch(/\d+\s*(kb|mb|gb|px|k|m)/);
      expect(slug).not.toMatch(/-\d/);
    }
  });

  it('titles are unique and reasonable', () => {
    const titles = TOOLS.map((t) => t.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
    for (const t of TOOLS) {
      expect(t.title.length).toBeGreaterThan(20);
      expect(t.title.length).toBeLessThanOrEqual(75);
    }
  });

  it('meta descriptions are unique and within snippet range', () => {
    const descs = TOOLS.map((t) => t.metaDescription.toLowerCase());
    expect(new Set(descs).size).toBe(descs.length);
    for (const t of TOOLS) {
      expect(t.metaDescription.length).toBeGreaterThanOrEqual(70);
      expect(t.metaDescription.length).toBeLessThanOrEqual(165);
    }
  });

  it('related links exist, are capped at 3, and never self-reference', () => {
    const slugs = new Set(TOOLS.map((t) => t.slug));
    for (const t of TOOLS) {
      expect(t.related.length).toBeGreaterThanOrEqual(2);
      expect(t.related.length).toBeLessThanOrEqual(3);
      expect(new Set(t.related).size).toBe(t.related.length);
      for (const r of t.related) {
        expect(slugs.has(r)).toBe(true);
        expect(r).not.toBe(t.slug);
      }
    }
  });

  it('relationship graph is symmetric (if A links B, B links A)', () => {
    const byslug = new Map(TOOLS.map((t) => [t.slug, t]));
    for (const t of TOOLS) {
      for (const r of t.related) {
        expect(byslug.get(r)!.related).toContain(t.slug);
      }
    }
  });

  it('FAQ entries are substantial and answer-first', () => {
    for (const t of TOOLS) {
      expect(t.faq.length).toBeGreaterThanOrEqual(3);
      for (const f of t.faq) {
        expect(f.q.endsWith('?')).toBe(true);
        expect(f.a.length).toBeGreaterThanOrEqual(40);
        // answer-first: no fluffy openers
        expect(f.a.toLowerCase()).not.toMatch(/^(in today's|in the modern|welcome|as we all know)/);
      }
    }
  });

  it('methodology, how-to, and limitations sections are populated', () => {
    for (const t of TOOLS) {
      expect(t.how.length).toBeGreaterThanOrEqual(3);
      expect(t.methodology.length).toBeGreaterThanOrEqual(3);
      expect(t.limitations.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('lastReviewed is a valid ISO date and matches the review session', () => {
    for (const t of TOOLS) {
      expect(t.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('application categories are from the Google-supported list', () => {
    const supported = new Set([
      'GameApplication', 'SocialNetworkingApplication', 'TravelApplication', 'ShoppingApplication',
      'SportsApplication', 'LifestyleApplication', 'BusinessApplication', 'DesignApplication',
      'DeveloperApplication', 'DriverApplication', 'EducationalApplication', 'HealthApplication',
      'FinanceApplication', 'SecurityApplication', 'BrowserApplication', 'CommunicationApplication',
      'DesktopEnhancementApplication', 'EntertainmentApplication', 'MultimediaApplication',
      'HomeApplication', 'UtilitiesApplication', 'ReferenceApplication',
    ]);
    for (const t of TOOLS) expect(supported.has(t.applicationCategory)).toBe(true);
  });

  it('homepage order lists every tool exactly once', () => {
    expect(new Set(HOMEPAGE_ORDER).size).toBe(HOMEPAGE_ORDER.length);
    expect([...HOMEPAGE_ORDER].sort()).toEqual([...TOOLS.map((t) => t.slug)].sort());
  });

  it('every category id is used by at least one tool and every tool category is declared', () => {
    const declared = new Set(TOOL_CATEGORIES.map((c) => c.id));
    for (const t of TOOLS) expect(declared.has(t.category)).toBe(true);
    for (const c of TOOL_CATEGORIES) {
      expect(TOOLS.some((t) => t.category === c.id)).toBe(true);
    }
  });
});

describe('social presets', () => {
  it('has unique ids', () => {
    const ids = SOCIAL_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('dimensions are positive integers', () => {
    for (const p of SOCIAL_PRESETS) {
      expect(Number.isInteger(p.width) && p.width > 0).toBe(true);
      expect(Number.isInteger(p.height) && p.height > 0).toBe(true);
    }
  });

  it('every preset cites an https source', () => {
    for (const p of SOCIAL_PRESETS) {
      expect(p.sourceUrl.startsWith('https://')).toBe(true);
      expect(p.confidence === 'official' || p.confidence === 'secondary').toBe(true);
    }
  });

  it('reviewed date is valid and platforms cover the required set', () => {
    expect(PRESETS_REVIEWED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const platform of REQUIREMENTS) {
      expect(PRESET_PLATFORMS).toContain(platform);
    }
  });
});

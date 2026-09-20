/**
 * Structured-data tests.
 * Enforces two project policies:
 * 1. No invented values (no ratings, reviews, counts, sameAs handles).
 * 2. FAQPage mirrors the visible on-page Q&A exactly (Google's requirement for
 *    FAQ structured data) and never invents questions or answers.
 */
import { describe, it, expect } from 'vitest';
import {
  webSiteSchema,
  organizationSchema,
  softwareApplicationSchema,
  breadcrumbSchema,
  faqPageSchema,
} from '../src/seo/schema';
import { TOOLS } from '../src/data/tools';

type AnySchema = Record<string, any>;

describe('structured data builders', () => {
  it('site and organization schemas contain no invented values', () => {
    const site = webSiteSchema() as AnySchema;
    const org = organizationSchema() as AnySchema;

    expect(site['@type']).toBe('WebSite');
    expect(org['@type']).toBe('Organization');

    for (const schema of [site, org]) {
      expect(schema.sameAs).toBeUndefined();
      expect(schema.aggregateRating).toBeUndefined();
      expect(schema.award).toBeUndefined();
    }
  });

  it('every tool declares a free SoftwareApplication without ratings', () => {
    for (const tool of TOOLS) {
      const schema = softwareApplicationSchema(tool) as AnySchema;

      expect(schema['@type']).toBe('SoftwareApplication');
      expect(schema.applicationCategory).toBe(tool.applicationCategory);
      expect(schema.isAccessibleForFree).toBe(true);
      expect(schema.offers.price).toBe(0);
      expect(schema.aggregateRating).toBeUndefined();
      expect(schema.review).toBeUndefined();

      expect(typeof schema.url).toBe('string');
      expect(schema.url.endsWith(`/${tool.slug}`)).toBe(true);
      expect(schema.url.startsWith('http')).toBe(true);
    }
  });

  it('breadcrumbs point home → tool with 1-based positions', () => {
    for (const tool of TOOLS) {
      const schema = breadcrumbSchema(tool) as AnySchema;
      const items = schema.itemListElement as AnySchema[];
      const [first, second] = items;
      if (!first || !second) throw new Error(`breadcrumb items missing for ${tool.slug}`);

      expect(schema['@type']).toBe('BreadcrumbList');
      expect(items).toHaveLength(2);
      expect(first.position).toBe(1);
      expect(first.name).toBe('Home');
      expect(second.position).toBe(2);
      expect(second.name).toBe(tool.name);
      expect(second.item.endsWith(`/${tool.slug}`)).toBe(true);
    }
  });

  it('FAQPage mirrors the visible Q&A exactly', () => {
    for (const tool of TOOLS) {
      const schema = faqPageSchema(tool.faq) as AnySchema;
      const entities = schema.mainEntity as AnySchema[];

      expect(schema['@type']).toBe('FAQPage');
      expect(entities).toHaveLength(tool.faq.length);

      const seen = new Set<string>();
      entities.forEach((entity, index) => {
        const source = tool.faq[index];
        if (!source) throw new Error(`FAQ source missing for ${tool.slug} #${index}`);

        expect(entity['@type']).toBe('Question');
        expect(entity.name).toBe(source.q);
        expect(entity.acceptedAnswer['@type']).toBe('Answer');
        expect(entity.acceptedAnswer.text).toBe(source.a);
        expect(entity.name.length).toBeGreaterThan(10);
        expect(entity.acceptedAnswer.text.length).toBeGreaterThan(20);
        expect(seen.has(entity.name)).toBe(false);
        seen.add(entity.name);
      });
    }
  });
});

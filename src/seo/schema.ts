/**
 * Structured data builders.
 * Rules (from project spec + Google requirements):
 * - No ratings, reviews, download counts or any invented values.
 * - Free web tools are declared with offers.price = 0 (Google-supported).
 * - applicationCategory values come from Google's supported list (registry-tested).
 */

import { SITE, absoluteUrl } from '../config/site';
import type { ToolEntry, ToolFaq } from '../data/tools';
import type { GuideEntry } from '../data/guides';

export function webSiteSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: SITE.locale,
  };
}

export function organizationSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    logo: absoluteUrl('/logo.svg'),
  };
}

export function softwareApplicationSchema(tool: ToolEntry): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${tool.name} — ${SITE.name}`,
    url: absoluteUrl(`/${tool.slug}`),
    description: tool.metaDescription,
    applicationCategory: tool.applicationCategory,
    operatingSystem: 'Any modern web browser',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'USD',
    },
  };
}

export function breadcrumbSchema(tool: ToolEntry): object {
  return breadcrumbList([
    { name: 'Home', path: '/' },
    { name: tool.name, path: `/${tool.slug}` },
  ]);
}

/** Generic BreadcrumbList — every crumb carries a real URL (no virtual levels). */
export function breadcrumbList(items: { name: string; path: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Article structured data for guides. No author person is invented: the
 * publisher entity is the site itself, exactly as on the about page.
 */
export function guideSchema(guide: GuideEntry): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.h1,
    description: guide.metaDescription,
    datePublished: guide.published,
    dateModified: guide.lastReviewed,
    inLanguage: SITE.locale,
    mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`),
    author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.svg') },
    },
  };
}

/**
 * FAQPage structured data. Emitted only from Q&A that is visible on the page
 * (tool FAQ sections, homepage FAQ) — required by Google's structured-data
 * policy, and it is what AI answer engines quote.
 */
export function faqPageSchema(faq: ToolFaq[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}
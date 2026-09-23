import type { APIRoute } from 'astro';
import { absoluteUrl } from '../config/site';
import { TOOLS, LAST_REVIEWED } from '../data/tools';
import { GUIDES } from '../data/guides';

/**
 * Sitemap — canonical public URLs only: homepage, tool pages, guides and the
 * three trust pages. 404 is excluded (noindex).
 */
export const GET: APIRoute = () => {
  const urls: Array<{ loc: string; lastmod: string; priority: string }> = [
    { loc: absoluteUrl('/'), lastmod: LAST_REVIEWED, priority: '1.0' },
    ...TOOLS.map((tool) => ({
      loc: absoluteUrl(`/${tool.slug}`),
      lastmod: tool.lastReviewed,
      priority: '0.9',
    })),
    { loc: absoluteUrl('/guides'), lastmod: GUIDES[0]?.lastReviewed ?? LAST_REVIEWED, priority: '0.7' },
    ...GUIDES.map((guide) => ({
      loc: absoluteUrl(`/guides/${guide.slug}`),
      lastmod: guide.lastReviewed,
      priority: '0.7',
    })),
    { loc: absoluteUrl('/about'), lastmod: LAST_REVIEWED, priority: '0.3' },
    { loc: absoluteUrl('/privacy'), lastmod: LAST_REVIEWED, priority: '0.3' },
    { loc: absoluteUrl('/terms'), lastmod: LAST_REVIEWED, priority: '0.3' },
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (url) =>
        `  <url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod><priority>${url.priority}</priority></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

import type { APIRoute } from 'astro';
import { absoluteUrl } from '../config/site';

/**
 * robots.txt — generated so the sitemap URL always matches SITE.url.
 * Policy:
 * - Everything public is crawlable (including AI search crawlers).
 * - OAI-SearchBot and GPTBot are explicitly allowed: search visibility and
 *   training are separate decisions (see OpenAI crawler documentation), and
 *   this project currently allows both. To opt out of training only, change
 *   the GPTBot section to "Disallow: /" — never remove OAI-SearchBot casually.
 */
export const GET: APIRoute = () => {
  const body = [
    '# All user agents: full access to public content',
    'User-agent: *',
    'Allow: /',
    'Disallow: /404',
    '',
    '# OpenAI search crawler — required for visibility in ChatGPT search',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    '# OpenAI training crawler — currently allowed (separate opt-out possible)',
    'User-agent: GPTBot',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

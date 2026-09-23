/**
 * Deterministic, dependency-free linkification of tool mentions in prose.
 *
 * Why this exists: FAQ answers and methodology steps already mention other
 * tools by name ("the exact-size compressor", "the metadata tool"). Rendering
 * those mentions as real links turns existing copy into internal linking
 * instead of adding new pages — the anti-cannibalization rule of
 * docs/SEO_PAGE_REGISTRY.md applied to links.
 *
 * Rules:
 * - Input is plain text written by us (never HTML); it is escaped first.
 * - One regex pass: each alias is replaced at most once, and a whole string
 *   renders at most `maxLinks` anchors (no link spam inside an answer).
 * - Self-references are skipped: a page never links to itself as "the X tool".
 */

export interface ToolLinkAlias {
  phrase: string;
  href: string;
}

/** Phrases as they actually appear in src/data/tools.ts — keep in sync with it. */
export const TOOL_LINKS: ToolLinkAlias[] = [
  { phrase: 'the exact-size compressor', href: '/compress-image-to-size' },
  { phrase: 'the exact-size tool', href: '/compress-image-to-size' },
  { phrase: 'the size compressor', href: '/compress-image-to-size' },
  { phrase: 'the metadata tool', href: '/image-metadata' },
  { phrase: 'the DPI tool', href: '/image-dpi' },
  { phrase: 'the crop tool', href: '/crop-image' },
  { phrase: 'the resize tool', href: '/resize-image' },
];

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => ESCAPES[char] ?? char);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface LinkifyOptions {
  /** Slug of the page being rendered — aliases pointing at it are left as text. */
  skipSlug?: string;
  /** Maximum anchors emitted inside one string (default 2). */
  maxLinks?: number;
}

export function linkifyToolMentions(text: string, options: LinkifyOptions = {}): string {
  const { skipSlug, maxLinks = 2 } = options;
  const escaped = escapeHtml(text);

  const usable = TOOL_LINKS.filter((alias) => !skipSlug || alias.href !== `/${skipSlug}`);
  if (usable.length === 0) return escaped;

  const byPhrase = new Map(usable.map((alias) => [alias.phrase.toLowerCase(), alias.href]));
  // Longest phrases first so a broader alias cannot shadow a more specific one.
  const ordered = [...usable].sort((a, b) => b.phrase.length - a.phrase.length);
  const pattern = new RegExp(ordered.map((alias) => escapeRegExp(alias.phrase)).join('|'), 'gi');

  const seen = new Set<string>();
  let emitted = 0;

  return escaped.replace(pattern, (match) => {
    const href = byPhrase.get(match.toLowerCase());
    if (!href || seen.has(href) || emitted >= maxLinks) return match;
    seen.add(href);
    emitted += 1;
    return `<a href="${href}">${match}</a>`;
  });
}

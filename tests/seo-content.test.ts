/**
 * Content-level SEO tests — the enforcement behind research/KEYWORD_MAP.md.
 *
 * 1. Keyword coverage: every phrase a page declares as a target must appear
 *    verbatim in the text the page actually renders (title, meta, body, FAQ).
 *    A keyword that only exists in a comment or in the unused `searchIntent`
 *    field is a bug.
 * 2. Linkification: internal links woven into existing prose must stay escaped,
 *    capped, and never point a page at itself.
 */
import { describe, it, expect } from 'vitest';
import { TOOLS, type ToolEntry } from '../src/data/tools';
import { linkifyToolMentions, escapeHtml } from '../src/seo/linkify';

/** Mirrors the fields BaseLayout / ToolLayout / Faq render as visible page text. */
function renderedText(tool: ToolEntry): string {
  return [
    tool.title,
    tool.metaDescription,
    tool.h1,
    tool.sub,
    tool.accepts,
    tool.limitsNote,
    ...tool.how,
    ...tool.methodology,
    ...tool.limitations,
    ...tool.faq.flatMap((entry) => [entry.q, entry.a]),
    tool.taskGuide.heading,
    ...tool.taskGuide.body,
    ...tool.requirementPresets.flatMap((preset) => [preset.values, preset.note]),
  ]
    .join('\n')
    .toLowerCase();
}

describe('keyword coverage (rendered text, not comments)', () => {
  it('every tool declares at least four target phrases', () => {
    for (const tool of TOOLS) {
      expect(tool.keywords.length, tool.slug).toBeGreaterThanOrEqual(4);
      for (const keyword of tool.keywords) {
        expect(keyword.trim()).toBe(keyword);
        expect(keyword.length).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('every declared phrase appears verbatim in the rendered page text', () => {
    for (const tool of TOOLS) {
      const text = renderedText(tool);
      for (const keyword of tool.keywords) {
        expect(text, `${tool.slug} never renders "${keyword}"`).toContain(keyword.toLowerCase());
      }
    }
  });

  it('task guides are substantial and keyword-bearing', () => {
    for (const tool of TOOLS) {
      expect(tool.taskGuide.heading.length, tool.slug).toBeGreaterThan(30);
      expect(tool.taskGuide.body.length, tool.slug).toBeGreaterThanOrEqual(3);
      for (const paragraph of tool.taskGuide.body) {
        expect(paragraph.length, tool.slug).toBeGreaterThanOrEqual(120);
      }
      const guide = `${tool.taskGuide.heading} ${tool.taskGuide.body.join(' ')}`.toLowerCase();
      expect(
        tool.keywords.some((keyword) => guide.includes(keyword.toLowerCase())),
        `${tool.slug}: no target phrase appears in its own task guide`,
      ).toBe(true);
    }
  });

  it('requirement presets are concrete and explained', () => {
    for (const tool of TOOLS) {
      expect(tool.requirementPresets.length, tool.slug).toBeGreaterThanOrEqual(3);
      for (const preset of tool.requirementPresets) {
        expect(preset.values.trim().length, tool.slug).toBeGreaterThan(0);
        expect(preset.note.length, tool.slug).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it('no two tools claim the same target phrase (one intent, one URL)', () => {
    const owners = new Map<string, string>();
    for (const tool of TOOLS) {
      for (const keyword of tool.keywords) {
        const key = keyword.toLowerCase();
        expect(
          owners.has(key),
          `"${key}" is claimed by both ${owners.get(key)} and ${tool.slug}`,
        ).toBe(false);
        owners.set(key, tool.slug);
      }
    }
  });
});

describe('internal linkification of prose', () => {
  it('turns known tool mentions into real links', () => {
    const html = linkifyToolMentions('Follow up with the exact-size compressor to hit a byte limit.');
    expect(html).toContain('<a href="/compress-image-to-size">the exact-size compressor</a>');
  });

  it('leaves unknown mentions alone', () => {
    const html = linkifyToolMentions('Reach for the right tool with real numbers in hand.');
    expect(html).not.toContain('<a');
  });

  it('never links a page to itself', () => {
    const html = linkifyToolMentions('Use the metadata tool afterwards.', { skipSlug: 'image-metadata' });
    expect(html).not.toContain('<a');
    expect(html).toContain('the metadata tool');
  });

  it('caps how many links one string can emit', () => {
    const text = 'Use the crop tool, then the resize tool, then the DPI tool and the metadata tool.';
    expect(linkifyToolMentions(text, { maxLinks: 2 }).match(/<a /g)?.length).toBe(2);
  });

  it('links each target at most once per string', () => {
    const html = linkifyToolMentions('The crop tool is precise. The crop tool is quick.');
    expect(html.match(/<a /g)?.length).toBe(1);
  });

  it('escapes HTML so registry text can never inject markup', () => {
    expect(escapeHtml('5 < 6 & "quoted" > done')).toBe('5 &lt; 6 &amp; &quot;quoted&quot; &gt; done');
    expect(linkifyToolMentions('<script>alert(1)</script> and the crop tool')).toContain('&lt;script&gt;');
  });
});

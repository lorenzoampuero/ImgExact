/**
 * Related-tool suggestions derived from the registry (max 3, symmetric graph).
 */
import { TOOL_MAP } from '../../data/tools';

export function relatedLinks(slug: string): Array<{ href: string; label: string }> {
  const tool = TOOL_MAP.get(slug);
  if (!tool) return [];
  return tool.related
    .map((s) => TOOL_MAP.get(s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => ({ href: `/${t.slug}`, label: t.name }));
}

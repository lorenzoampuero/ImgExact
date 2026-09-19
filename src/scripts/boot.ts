/**
 * Boot: finds the tool shell, lazy-loads its controller by slug.
 * Only the active tool's controller code is downloaded.
 */

const controllers = import.meta.glob('./tools/*.ts');

export interface ToolControllerModule {
  default: (root: HTMLElement) => void | Promise<void>;
}

async function boot(): Promise<void> {
  const shell = document.querySelector<HTMLElement>('[data-tool]');
  if (!shell) return;
  const slug = shell.dataset.tool;
  if (!slug) return;
  const loader = controllers[`./tools/${slug}.ts`];
  if (!loader) {
    console.warn(`[toolkit] No controller registered for "${slug}"`);
    return;
  }
  try {
    const mod = (await loader()) as ToolControllerModule;
    await mod.default(shell);
  } catch (err) {
    console.error('[toolkit] Controller failed to start', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void boot());
} else {
  void boot();
}

import isElementFullyParsed from './isElementFullyParsed';

const MAX_WAIT = 3000;

interface RenderableModule {
  render?: (config: any) => Promise<void> | void;
  targetSelectors?: string[];
}

interface RenderContentResult {
  success: boolean;
  missingSelectors: string[];
}

interface RenderTask {
  fn: (config: any) => Promise<void> | void;
  label: string;
}

export function renderContent(
  module: Record<string, RenderableModule>,
  config: Record<string, any>,
  moduleName?: string
): Promise<RenderContentResult> {
  const renderPromises: RenderTask[] = [];
  const renderTargets = new Set<string>();

  let start = 0;

  if (process.env.NODE_ENV === 'development') {
    console.log(`Rym Last.fm Stats: Rendering ${moduleName || 'page'}...`);
    start = performance.now();
  }

  for (const key of Object.keys(module)) {
    if ([null, 0, false].includes(config[key])) continue;

    const mod = module[key];
    if (mod.render) {
      renderPromises.push({
        fn: mod.render,
        label: key,
      });
    }

    mod.targetSelectors?.forEach((s) => renderTargets.add(s));
  }

  return new Promise<RenderContentResult>((resolve) => {
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[renderContent] Max wait time of ${MAX_WAIT}ms exceeded for module "${moduleName || module.name}".`);
        console.warn(`[renderContent] Missing selectors:`, Array.from(renderTargets));
      }
    }, MAX_WAIT);

    function main(): void {
      if (!document.body) {
        requestAnimationFrame(main);
        return;
      }

      if (!timedOut && renderTargets.size > 0) {
        for (const selector of renderTargets) {
          const el = document.querySelector(selector);
          if (el && isElementFullyParsed(el)) {
            renderTargets.delete(selector);
          }
        }
      }

      if (renderTargets.size === 0 || timedOut) {
        clearTimeout(timeoutId);

        const missingSelectors = Array.from(renderTargets);
        const success = missingSelectors.length === 0;

        if (process.env.NODE_ENV === 'development') {
          const waitTime = Math.round(performance.now() - start);
          console.log(`Rym Last.fm Stats: Waiting for targets took ${waitTime}ms`);
          console.log(`Rym Last.fm Stats: Rendering starts...`);
          start = performance.now();
        }

        Promise.all(
          renderPromises.map(async ({ fn, label }) => {
            const startRender = process.env.NODE_ENV === 'development' ? performance.now() : 0;
            await fn(config);
            if (process.env.NODE_ENV === 'development') {
              console.log(`Rym Last.fm Stats: Rendering ${label} took ${Math.round(performance.now() - startRender)}ms`);
            }
          })
        ).then(() => {
          if (process.env.NODE_ENV === 'development') {
            if (renderPromises.length > 1) {
              console.log(`Rym Last.fm Stats: Rendering all ${renderPromises.length} modules took ${Math.round(performance.now() - start)}ms`);
            }
          }

          resolve({ success, missingSelectors });
        });
      } else {
        requestAnimationFrame(main);
      }
    }

    main();
  });
}

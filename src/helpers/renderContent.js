import isElementFullyParsed from './isElementFullyParsed.js';

const MAX_WAIT = 3000;

export function renderContent(module, config, moduleName) {
  const renderPromises = [];
  const renderTargets = new Set();

  let start;

  if (process.env.NODE_ENV === 'development') {
    console.log(`Rym Last.fm Stats: Rendering ${moduleName}...`);
    start = performance.now();
  }

  for (const key of Object.keys(module)) {
    if ([null, 0, false].includes(config[key])) continue;

    if (module[key].render) {
      renderPromises.push({
        fn: module[key].render,
        label: key,
      });
    }

    if (module[key].targetSelectors) {
      module[key].targetSelectors.forEach((s) => renderTargets.add(s));
    }
  }

  return new Promise((resolve) => {
    let timedOut = false;
    let timeoutId;

    timeoutId = setTimeout(() => {
      timedOut = true;
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[renderContent] Max wait time of ${MAX_WAIT}ms exceeded for module "${module.name}". Proceeding with rendering.`);
        console.warn(`[renderContent] Missing selectors:`, Array.from(renderTargets));
      }
    }, MAX_WAIT);

    function main() {
      if (!document.body) {
        return requestAnimationFrame(main);
      }

      if (!timedOut && renderTargets.size > 0) {
        Array.from(renderTargets).forEach((selector) => {
          const el = document.querySelector(selector);
          if (el && isElementFullyParsed(el)) {
            renderTargets.delete(selector);
          }
        });
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
            let startRender;
            if (process.env.NODE_ENV === 'development') {
              startRender = performance.now();
            }
            await fn(config);
            if (process.env.NODE_ENV === 'development') {
              console.log(`Rym Last.fm Stats: Rendering ${label} took ${Math.round(performance.now() - startRender)}ms`);
            }
          })
        ).then(() => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Rym Last.fm Stats: Rendering all ${renderPromises.length} modules took ${Math.round(performance.now() - start)}ms`);
          }

          resolve({
            success,
            missingSelectors,
          });
        });
      } else {
        requestAnimationFrame(main);
      }
    }

    main();
  });
}

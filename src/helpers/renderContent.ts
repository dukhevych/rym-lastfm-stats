import isElementFullyParsed from './isElementFullyParsed';
import { capitalize } from '@/helpers/string';
import type { Writable } from 'svelte/store';
import { get } from 'svelte/store';

const MAX_WAIT = 3000;

function getFullKey(moduleName: string, key: string): string {
  return `${moduleName}${capitalize(key)}`;
}

interface RenderableModule {
  prepareUI?: (settings: RenderSettings) => Promise<void> | void;
  render?: (settings: RenderSettings) => Promise<void> | void;
  targetSelectors?: string[];
  order?: number;
  configDefaults?: Record<string, boolean | number | string>;
}

interface RenderContentResult {
  success: boolean;
  missingSelectors: string[];
}

interface RenderTask {
  fn: (settings: RenderSettings) => Promise<void> | void;
  label: string;
  order?: number;
  type: 'prepare' | 'render';
}

interface RenderOptions {
  sequential?: boolean;
}

export interface RenderSettings {
  configStore: Writable<AddonOptions>,
  moduleName: string,
  context?: Record<string, any>,
  options?: RenderOptions
}

export function renderContent(
  modules: Record<string, RenderableModule>,
  settings: RenderSettings,
): Promise<RenderContentResult> {
  const config = get(settings.configStore);
  const { moduleName, options = {} } = settings;

  const preparePromises: RenderTask[] = [];
  const renderPromises: RenderTask[] = [];
  const renderTargets = new Set<string>();

  let start = 0;

  if (process.env.NODE_ENV === 'development') {
    console.log(`Rym Last.fm Stats: Processing ${moduleName || 'page'}...`);
    start = performance.now();
  }

  for (const key of Object.keys(modules)) {
    const isModuleDisabled = config[getFullKey(moduleName, key) as keyof AddonOptions] === false;
    if (isModuleDisabled) continue;

    const module = modules[key];

    // FUTURE FEATURE: prepareUI
    if (module.prepareUI) {
      preparePromises.push({
        fn: module.prepareUI,
        label: key,
        order: module.order,
        type: 'prepare',
      });
    }

    if (module.render) {
      renderPromises.push({
        fn: module.render,
        label: key,
        order: module.order,
        type: 'render',
      });
    }

    module.targetSelectors?.forEach((s) => renderTargets.add(s));
  }

  return new Promise<RenderContentResult>((resolve) => {
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[renderContent] Max wait time of ${MAX_WAIT}ms exceeded for module "${moduleName}".`);
        console.warn(`[renderContent] Missing selectors:`, Array.from(renderTargets));
      }
    }, MAX_WAIT);

    async function main(): Promise<void> {
      if (preparePromises.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Rym Last.fm Stats: Preparing UI...`);
        }

        const executePrepareTasks = options.sequential
          ? executeSequential(preparePromises, settings)
          : executeParallel(preparePromises, settings);

        await executePrepareTasks;

        if (process.env.NODE_ENV === 'development') {
          console.log(`Rym Last.fm Stats: UI preparation completed`);
        }
      }

      function waitForTargets(): void {
        if (!document.body) {
          requestAnimationFrame(waitForTargets);
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

          const executeRenders = options.sequential
            ? executeSequential(renderPromises, settings)
            : executeParallel(renderPromises, settings);

          executeRenders.then(() => {
            if (process.env.NODE_ENV === 'development') {
              if (renderPromises.length > 1) {
                console.log(`Rym Last.fm Stats: Rendering all ${renderPromises.length} modules took ${Math.round(performance.now() - start)}ms`);
              }
            }
            resolve({ success, missingSelectors });
          });
        } else {
          requestAnimationFrame(waitForTargets);
        }
      }

      waitForTargets();
    }

    main();
  });
}

async function executeSequential(
  renderPromises: RenderTask[],
  settings: RenderSettings,
): Promise<void> {
  const orderGroups = new Map<number | 'undefined', RenderTask[]>();

  renderPromises.forEach(task => {
    const orderKey = task.order ?? 'undefined';
    if (!orderGroups.has(orderKey)) {
      orderGroups.set(orderKey, []);
    }
    orderGroups.get(orderKey)!.push(task);
  });

  const sortedOrders = Array.from(orderGroups.keys()).sort((a, b) => {
    if (a === 'undefined' && b === 'undefined') return 0;
    if (a === 'undefined') return 1;
    if (b === 'undefined') return -1;
    return (a as number) - (b as number);
  });

  for (const orderKey of sortedOrders) {
    const tasks = orderGroups.get(orderKey)!;

    if (process.env.NODE_ENV === 'development' && tasks.length > 1) {
      const taskType = tasks[0].type;
      console.log(`Rym Last.fm Stats: ${taskType === 'prepare' ? 'Preparing' : 'Rendering'} ${tasks.length} modules with order ${orderKey} in parallel`);
    }

    await Promise.all(
      tasks.map(async ({ fn, label, type }) => {
        const startRender = process.env.NODE_ENV === 'development' ? performance.now() : 0;
        await fn(settings);
        if (process.env.NODE_ENV === 'development') {
          const actionType = type === 'prepare' ? 'Preparing' : 'Rendering';
          console.log(`Rym Last.fm Stats: ${actionType} ${label} took ${Math.round(performance.now() - startRender)}ms`);
        }
      })
    );
  }
}

async function executeParallel(
  renderPromises: RenderTask[],
  settings: RenderSettings,
): Promise<void> {
  await Promise.all(
    renderPromises.map(async ({ fn, label, type }) => {
      const startRender = process.env.NODE_ENV === 'development' ? performance.now() : 0;
      await fn(settings);
      if (process.env.NODE_ENV === 'development') {
        const actionType = type === 'prepare' ? 'Preparing' : 'Rendering';
        console.log(`Rym Last.fm Stats: ${actionType} ${label} took ${Math.round(performance.now() - startRender)}ms`);
      }
    })
  );
}

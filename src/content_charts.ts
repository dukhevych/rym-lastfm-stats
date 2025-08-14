import charts from '@/modules/charts';
import { renderContent } from '@/helpers/renderContent';
import { getProfileOptions } from '@/helpers/storageUtils';
import { writable } from 'svelte/store';

(async function () {
  const configStore = writable(await getProfileOptions());
  await renderContent(charts, {
    configStore,
    moduleName: 'charts',
  });
})();

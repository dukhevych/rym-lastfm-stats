import search from '@/modules/search';
import { renderContent } from '@/helpers/renderContent';
import { getFullConfig } from '@/helpers/storageUtils';
import { writable } from 'svelte/store';

(async function () {
  const configStore = writable(await getFullConfig());
  await renderContent(search, {
    configStore,
    moduleName: 'search',
  });
})();

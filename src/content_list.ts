import list from '@/modules/list';
import { renderContent } from '@/helpers/renderContent';
import { getFullConfig } from '@/helpers/storageUtils';
import { writable } from 'svelte/store';

(async function () {
  const configStore = writable(await getFullConfig());
  await renderContent(list, {
    configStore,
    moduleName: 'list',
  });
})();

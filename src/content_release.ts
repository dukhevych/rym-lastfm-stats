import release from '@/modules/release';
import { renderContent } from '@/helpers/renderContent';
import { getFullConfig } from '@/helpers/storageUtils';
import { initSprite } from '@/helpers/sprite';
import '@/assets/styles/common.css';
import { writable } from 'svelte/store';

(async function () {
  const [configStore] = await Promise.all([
    writable(await getFullConfig()),
    initSprite(),
  ]);

  await renderContent(release, {
    configStore,
    moduleName: 'release',
  });
})();

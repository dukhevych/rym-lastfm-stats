import artist from '@/modules/artist';
import { renderContent } from '@/helpers/renderContent';
import { getFullConfig } from '@/helpers/storageUtils';
import { initSprite } from '@/helpers/sprite';
import '@/assets/styles/common.css';
import { writable } from 'svelte/store';

(async function () {
  const configStore = writable(await getFullConfig());
  await initSprite();
  await renderContent(artist, {
    configStore,
    moduleName: 'artist',
  });
})();

import '@/assets/styles/common.css';
import main from '@/modules/main';
import { renderContent } from '@/helpers/renderContent';
import { getProfileOptions, getUserData } from '@/helpers/storageUtils';
import { initSprite } from '@/helpers/sprite';
import { writable } from 'svelte/store';

(async function () {
  const [configStore, userData] = await Promise.all([
    writable(await getProfileOptions()),
    getUserData(),
    initSprite(),
  ]);

  await renderContent(main, {
    configStore,
    context: { userData },
    moduleName: 'main',
  });
})();

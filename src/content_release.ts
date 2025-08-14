import release from '@/modules/release';
import { renderContent } from '@/helpers/renderContent';
import { getProfileOptions, getLastFmApiKey } from '@/helpers/storageUtils';
import { initSprite } from '@/helpers/sprite';
import '@/assets/styles/common.css';
import { writable } from 'svelte/store';

(async function () {
  const [configStore, lastfmApiKey] = await Promise.all([
    writable(await getProfileOptions()),
    getLastFmApiKey(),
    initSprite(),
  ]);

  await renderContent(release, {
    configStore,
    context: { lastfmApiKey },
    moduleName: 'release',
  });
})();

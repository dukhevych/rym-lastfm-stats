import song from '@/modules/song';
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

  await renderContent(song, {
    configStore,
    context: { lastfmApiKey },
    moduleName: 'song',
  });
})();

import song from '@/modules/song';
import { renderContent } from '@/helpers/renderContent';
import { getFullConfig } from '@/helpers/storageUtils';
import { createSVGSprite, insertSVGSprite } from '@/helpers/sprite';
import '@/assets/styles/common.css';

(async function () {
  const config = await getFullConfig();
  await insertSVGSprite(createSVGSprite());
  await renderContent(song, config);
})();

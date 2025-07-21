import artist from '@/modules/artist';
import { renderContent } from '@/helpers/renderContent';
import { getFullConfig } from '@/helpers/storageUtils';
import { initSprite } from '@/helpers/sprite';
import '@/assets/styles/common.css';

(async function () {
  const config = await getFullConfig();
  await initSprite();
  await renderContent(artist, config);
})();

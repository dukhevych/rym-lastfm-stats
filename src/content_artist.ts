import artist from '@/modules/artist';
import { renderContent } from '@/helpers/renderContent';
import { getFullConfig } from '@/helpers/storageUtils';
import { createSVGSprite, insertSVGSprite } from '@/helpers/sprite';

(async function () {
  const config = await getFullConfig();
  await insertSVGSprite(createSVGSprite());
  await renderContent(artist, config);
})();

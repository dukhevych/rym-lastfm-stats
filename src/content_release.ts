import release from '@/modules/release';
import { renderContent } from '@/helpers/renderContent';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';

(async function () {
  const sprite = utils.createSVGSprite();
  await utils.insertSVGSprite(sprite);

  const storageItems = await utils.getSyncedOptions();
  const config = { ...constants.OPTIONS_DEFAULT, ...storageItems };
  await renderContent(release, config);
})();

import artist from '@/modules/artist';
import { renderContent } from '@/helpers/renderContent';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';

(async function () {
  const storageItems = await utils.getSyncedOptions();
  const config = { ...constants.OPTIONS_DEFAULT, ...storageItems };

  await utils.insertSVGSprite(utils.createSVGSprite());

  await renderContent(artist, config);
})();

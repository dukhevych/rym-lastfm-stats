import release from '@/modules/release/index.js';
import { renderContent } from '@/helpers/renderContent.js';
import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';

(async function () {
  const storageItems = await utils.getSyncedOptions();
  const config = { ...constants.OPTIONS_DEFAULT, ...storageItems };
  await renderContent(release, config);
})();

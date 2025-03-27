import profile, { targetSelectors } from '@/modules/profile/index.js';
import { renderContent } from '@/helpers/renderContent.js';
import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';

(async function () {
  const storageItems = await utils.getSyncedOptions();
  const config = { ...constants.OPTIONS_DEFAULT, ...storageItems };

  const isMyProfile = await utils.checkDOMCondition(targetSelectors, () => utils.isMyProfile());

  if (isMyProfile) {
    renderContent(profile, config);
    return;
  }

  await utils.waitForDOMReady();

  const detectedUsername = utils.detectUserName();

  if (detectedUsername) {
    renderContent(profile, config, detectedUsername);
  }
})();

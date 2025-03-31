import profile, { targetSelectors } from '@/modules/profile/index.js';
import { renderContent } from '@/helpers/renderContent.js';
import * as utils from '@/helpers/utils.js';

(async function () {
  utils.initColorSchemeDetection();

  const sprite = utils.createSVGSprite();
  await utils.insertSVGSprite(sprite);

  const config = await utils.getFullConfig();

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

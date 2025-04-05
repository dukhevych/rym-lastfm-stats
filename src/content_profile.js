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
    await renderContent(profile, config, 'profile');
    return;
  }

  await utils.waitForDOMReady();

  const userName = utils.detectUserName();

  if (userName) {
    await renderContent(profile, {
      ...config,
      userName,
    }, 'profile');
  }
})();

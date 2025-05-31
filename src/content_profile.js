import profile, { targetSelectors } from '@/modules/profile/index.js';
import { renderContent } from '@/helpers/renderContent.js';
import * as utils from '@/helpers/utils.js';
import './test.css';

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

  // Wait for the full profile page to load
  // This is necessary because last.fm link can be added anywhere on the page
  await utils.waitForDOMReady();

  // Parse links on the page to find the last.fm username
  const userName = utils.detectLastfmUserName();

  if (userName) {
    await renderContent(profile, {
      ...config,
      userName,
    }, 'profile');
  }
})();

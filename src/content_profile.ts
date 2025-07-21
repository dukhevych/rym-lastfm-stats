import profile, { targetSelectors } from '@/modules/profile';
import { renderContent } from '@/helpers/renderContent';
import { initColorSchemeDetection, isMyProfile, detectLastfmUserName } from '@/helpers/rym-dom';
import { checkDOMCondition, waitForDOMReady } from '@/helpers/dom';
import { initSprite } from '@/helpers/sprite';
import { getFullConfig } from '@/helpers/storageUtils';
import '@/assets/styles/common.css';

(async function () {
  initColorSchemeDetection();
  await initSprite();

  const config = await getFullConfig();

  await checkDOMCondition(targetSelectors);
  const isMyProfileValue = isMyProfile();

  if (isMyProfileValue) {
    await renderContent(profile, {
      ...config,
      isMyProfile: true,
    }, 'profile');
    return;
  }

  // Wait for the full profile page to load
  // This is necessary because last.fm link can be added anywhere on the page
  await waitForDOMReady();

  // Parse links on the page to find the last.fm username
  const userName = detectLastfmUserName();

  if (userName) {
    await renderContent(profile, {
      ...config,
      userName,
      isMyProfile: isMyProfileValue,
    }, 'profile');
  }
})();

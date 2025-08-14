import '@/assets/styles/common.css';
import profile, { targetSelectors } from '@/modules/profile';
import { writable } from 'svelte/store';
import { renderContent } from '@/helpers/renderContent';
import { initColorSchemeDetection, getIsMyProfile, detectLastfmUserName } from '@/helpers/rym-dom';
import { checkDOMCondition, waitForDOMReady } from '@/helpers/dom';
import { initSprite } from '@/helpers/sprite';
import errorMessages from '@/modules/profile/errorMessages.json';
import { getProfileOptions, getLastfmUserName, getRymSyncTimestamp, getLastFmApiKey } from '@/helpers/storageUtils';

(async function () {
  initColorSchemeDetection();

  const [configStore, rymSyncTimestamp, lastfmApiKey] = await Promise.all([
    writable(await getProfileOptions()),
    getRymSyncTimestamp(),
    getLastFmApiKey(),
    initSprite(),
    checkDOMCondition(targetSelectors),
  ]);

  const context: Record<string, string | number | boolean | null> = {
    isMyProfile: getIsMyProfile(),
    rymSyncTimestamp,
    lastfmApiKey,
  };

  let userName: string | null = null;

  if (context.isMyProfile) {
    userName = await getLastfmUserName();
  } else {
    userName = detectLastfmUserName();

    if (!userName) {
      await waitForDOMReady();
      userName = detectLastfmUserName();
    }
  }

  if (!userName) {
    console.warn(errorMessages.noUserName);
    return;
  }

  context.userName = userName;

  await renderContent(profile, {
    configStore,
    moduleName: 'profile',
    context,
  });
})();

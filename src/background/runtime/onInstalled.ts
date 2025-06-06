import * as utils from '@/helpers/utils';
import * as api from '@/helpers/api';
import * as constants from '@/helpers/constants';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;

browserAPI.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('RYM Last.fm extension installed');
    browserAPI.runtime.openOptionsPage();
  }
  if (details.reason === 'update') {
    const previousVersion = details.previousVersion;

    console.log(`RYM Last.fm extension updated from v${previousVersion} to v${constants.APP_VERSION}`);

    const { userData, lastfmUsername } = await utils.storageGet(['userData', 'lastfmUsername']);

    if (!userData && lastfmUsername) {
      const userDataRaw = await api.fetchUserDataByName(lastfmUsername, SYSTEM_API_KEY);
      const normalizedData = {
        name: userDataRaw.name,
        url: userDataRaw.url,
        image: userDataRaw.image[0]?.['#text'],
      };
      await utils.storageSet({ userData: normalizedData });
      await utils.storageRemove(['lastfmUsername']);
    }

    if (userData && lastfmUsername) {
      await utils.storageRemove(['lastfmUsername']);
    }

    if (previousVersion.split('.')[0] < 2) {
      browserAPI.runtime.openOptionsPage();
    }
  }
});

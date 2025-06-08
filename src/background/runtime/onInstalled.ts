import browser from 'webextension-polyfill';
import * as utils from '@/helpers/utils';
import * as api from '@/helpers/api';
import * as constants from '@/helpers/constants';

const SYSTEM_API_KEY = process.env.LASTFM_API_KEY ?? ''; // fallback to empty string or throw

browser.runtime.onInstalled.addListener(async (details: browser.Runtime.InstalledDetails) => {
  if (details.reason === 'install') {
    console.log('RYM Last.fm extension installed');
    await browser.runtime.openOptionsPage();
  }

  if (details.reason === 'update') {
    const previousVersion = details.previousVersion ?? '0.0.0';
    console.log(`RYM Last.fm extension updated from v${previousVersion} to v${constants.APP_VERSION}`);

    const { userData, lastfmUsername } = await utils.storageGet(['userData', 'lastfmUsername']) as {
      userData?: {
        name: string;
        url: string;
        image?: string;
      };
      lastfmUsername?: string;
    };

    if (!userData && lastfmUsername) {
      const userDataRaw = await api.fetchUserDataByName(lastfmUsername, SYSTEM_API_KEY);
      if (userDataRaw) {
        const normalizedData = {
          name: userDataRaw.name,
          url: userDataRaw.url,
          image: userDataRaw.image?.[0]?.['#text'] ?? '',
        };
        await utils.storageSet({ userData: normalizedData });
        await utils.storageRemove(['lastfmUsername']);
      }
    }

    if (userData && lastfmUsername) {
      await utils.storageRemove(['lastfmUsername']);
    }

    if (parseInt(previousVersion.split('.')[0]) < 2) {
      await browser.runtime.openOptionsPage();
    }
  }
});

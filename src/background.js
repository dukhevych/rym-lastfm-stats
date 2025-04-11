import { MD5 } from './libs/crypto-js.min.js';
import * as utils from './helpers/utils.js';
import * as api from './helpers/api.js';

import './background/fetchImage.js';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const currentVersion = browserAPI.runtime.getManifest().version;

const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;
const SYSTEM_API_SECRET = process.env.LASTFM_API_SECRET;

browserAPI.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('RYM Last.fm extension installed');
    browserAPI.runtime.openOptionsPage();
  }
  if (details.reason === 'update') {
    const previousVersion = details.previousVersion;

    console.log(`RYM Last.fm extension updated from v${previousVersion} to v${currentVersion}`);

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

browserAPI.action.onClicked.addListener(() => {
  browserAPI.runtime.openOptionsPage();
});

browserAPI.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.url &&
      changeInfo.url.includes('dukhevych.github.io/lastfm-oauth-redirect/oauth-callback.html') &&
      changeInfo.url.includes('token=')) {

    const url = new URL(changeInfo.url);
    const token = url.searchParams.get('token');

    const sessionKey = await fetchSessionKey(token);

    if (sessionKey) {
      console.log('Authenticated! Session Key:', sessionKey);

      await utils.storageSet({ lastfmSession: sessionKey });

      browserAPI.runtime.sendMessage({
        type: 'lastfm_auth',
        value: sessionKey,
      });
    }
  }
});

const fetchSessionKey = async (token) => {
  let apiSig;

  try {
    apiSig = generateApiSig({
      method: 'auth.getSession',
      api_key: SYSTEM_API_KEY,
      token: token,
    });
  } catch (error) {
    console.error('Error generating API signature:', error);
    return null;
  }

  const _params = {
    method: 'auth.getSession',
    api_key: SYSTEM_API_KEY,
    token: token,
    api_sig: apiSig,
    format: 'json',
  };

  const params = new URLSearchParams(_params);

  const url = `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.session) {
      return data.session.key;
    } else {
      console.error('Failed to get session:', data);
      return null;
    }
  } catch (error) {
    console.error('Error fetching session key:', error);
    return null;
  }
};

const generateApiSig = (params) => {
  const sortedKeys = Object.keys(params).sort();
  let stringToSign = '';

  sortedKeys.forEach((key) => {
    stringToSign += key + params[key];
  });

  stringToSign += SYSTEM_API_SECRET;
  return generateMd5(stringToSign);
};

function generateMd5(string) {
  return MD5(string).toString();
}

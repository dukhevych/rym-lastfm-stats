import { MD5 } from './libs/crypto-js.min.js';
import * as utils from './helpers/utils.js';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;
const SYSTEM_API_SECRET = process.env.LASTFM_API_SECRET;

browserAPI.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('RYM Last.fm extension installed');
    browserAPI.runtime.openOptionsPage();
  }
  if (details.reason === 'update') {
    console.log('RYM Last.fm extension updated');
    const { userData, lastfmUsername } = await utils.storageGet(['userData', 'lastfmUsername']);
    if (!userData && lastfmUsername) {
      await utils.storageSet({ userData: { name: lastfmUsername } });
    }
    browserAPI.runtime.openOptionsPage();
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

      await browserAPI.storage.local.set({ lastfmSession: sessionKey });

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

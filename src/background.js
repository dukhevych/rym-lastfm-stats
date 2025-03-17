import { MD5 } from './libs/crypto-js.min.js';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;
const SYSTEM_API_SECRET = process.env.LASTFM_API_SECRET;

browserAPI.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('RYM Last.fm extension installed');
    browserAPI.runtime.openOptionsPage();
  }
  if (details.reason === 'update') {
    console.log('RYM Last.fm extension updated');
    browserAPI.runtime.openOptionsPage();
  }
});

browserAPI.action.onClicked.addListener(() => {
  browserAPI.runtime.openOptionsPage();
});

browserAPI.webNavigation.onCompleted.addListener(
  async (details) => {
    const url = new URL(details.url);
    const token = url.searchParams.get('token');

    if (token) {
      console.log('OAuth token received:', token);

      browserAPI.tabs.remove(details.tabId);

      // Exchange the token for a session key
      const sessionKey = await fetchSessionKey(token);

      if (sessionKey) {
        console.log('Authenticated! Session Key:', sessionKey);
        browserAPI.storage.local.set({ lastfmSession: sessionKey });

        browserAPI.runtime.sendMessage({
          type: 'lastfm_auth',
          value: sessionKey,
        });
      }
    }
  },
  { url: [{ hostContains: 'last.fm' }] },
);

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

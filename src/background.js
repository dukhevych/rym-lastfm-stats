import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';
import * as constants from '@/helpers/constants.js';

import './background/fetchImage.js';

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

browserAPI.runtime.onMessage.addListener((message, sender) => {
  if (
    message?.type === "get-and-watch-object-field" &&
    sender.tab?.id &&
    typeof message.propName === "string" &&
    typeof message.fieldName === "string"
  ) {
    browserAPI.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: "MAIN",
      args: [message.propName, message.fieldName],
      func: (propName, fieldName) => {
        function dispatch(value) {
          window.dispatchEvent(new CustomEvent("my-extension:field-update", {
            detail: { prop: propName, field: fieldName, value }
          }));
        }

        const target = window[propName];
        if (!target || typeof target !== "object") return;

        let currentValue = target[fieldName];

        Object.defineProperty(target, fieldName, {
          configurable: true,
          enumerable: true,
          get() {
            return currentValue;
          },
          set(newVal) {
            currentValue = newVal;
            dispatch(newVal);
          }
        });

        if (currentValue !== undefined) {
          dispatch(currentValue);
        }
      }
    });
  }
});

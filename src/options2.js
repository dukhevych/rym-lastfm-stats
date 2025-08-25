import '@/assets/styles/options.css';

import { mount } from 'svelte';

import App from '@/components/options/PageOptions.svelte';
import { RecordsAPI } from '@/helpers/records-api';
import {
  getModuleToggleConfig,
  getModuleCustomizationConfig,
  getRymSyncTimestamp,
  getUserData,
  getLastFmApiKey,
} from '@/helpers/storageUtils';

async function initApp() {
  const data = await Promise.all([
    getModuleToggleConfig(),
    getModuleCustomizationConfig(),
    getLastFmApiKey(),
    getUserData(),
    RecordsAPI.getQty(),
    getRymSyncTimestamp(),
  ]);

  mount(App, {
    target: document.getElementById('app2'),
    props: {
      formModules: data[0],
      formCustomization: data[1],
      lastfmApiKeySaved: data[2],
      lastfmApiKey: data[2],
      userData: data[3],
      dbRecordsQty: data[4] ?? null,
      rymSyncTimestamp: data[5] ?? null,
    },
  });
}

initApp();

import { mount } from 'svelte';
import { storageGet, getLastfmUserName } from '@/helpers/storageUtils';
import RecentTracks from './RecentTracks.svelte';

import errorMessages from './errorMessages.json';

import './recentTracks.css';

const PARENT_SELECTOR = '.profile_listening_container';

interface RecentTracksConfig extends ProfileOptions {
  isMyProfile: boolean;
  userName?: string;
}
let config: RecentTracksConfig;

async function render(_config: RecentTracksConfig) {
  // SET CONFIG
  if (!_config) return;
  config = _config;
  if (!config.lastfmApiKey) {
    console.warn(errorMessages.noApiKey);
    return;
  }

  // SET USER NAME
  const userName = config.userName || await getLastfmUserName();
  if (!userName) {
    console.warn(errorMessages.noUserName);
    return;
  }

  // SET PARENT CONTAINER
  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);
  if (!parent) {
    console.warn(errorMessages.noPanelContainer);
    return;
  }

  if (config.rymPlayHistoryHide) {
    parent.style.display = 'none';
  }

  const rymSyncTimestamp: number = await storageGet('rymSyncTimestamp', 'local');

  // SVELTE START
  const mountPoint = document.createElement('div');
  parent.insertAdjacentElement('afterend', mountPoint);

  mount(RecentTracks, {
    target: mountPoint,
    props: {
      config,
      userName,
      rymSyncTimestamp,
    },
  });
}

export default {
  render,
  targetSelectors: [ PARENT_SELECTOR ],
};

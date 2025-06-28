import * as utils from '@/helpers/utils';
import './recentTracks.css';
import ModuleScrobbles from '@/components/svelte/ModuleScrobbles.svelte';
import { mount } from 'svelte';
import errorMessages from './errorMessages.json';

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
  const userName = config.userName || await utils.getLastfmUserName();
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

  const rymSyncTimestamp: number = await utils.storageGet('rymSyncTimestamp', 'local');

  // SVELTE START
  const mountPoint = document.createElement('div');
  parent.insertAdjacentElement('afterend', mountPoint);

  mount(ModuleScrobbles, {
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

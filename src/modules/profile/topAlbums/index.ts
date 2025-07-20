import { mount } from 'svelte';
import { getLastfmUserName } from '@/helpers/storageUtils';

import TopAlbums from './TopAlbums.svelte';
import errorMessages from './errorMessages.json';
import './topAlbums.css';

const PROFILE_CONTAINER_SELECTOR = '.bubble_header.profile_header + .bubble_content';

let config: ProfileOptions;

export async function render(_config: ProfileOptions) {
  config = _config;
  if (!config) return;

  if (!config.lastfmApiKey) {
    console.warn(errorMessages.noApiKey);
    return;
  }

  const userName = config.userName || await getLastfmUserName();
  if (!userName) {
    console.warn(errorMessages.noUserName);
    return;
  }

  const mountPoint = document.createElement('div');
  const target = document.querySelector(PROFILE_CONTAINER_SELECTOR)!;
  target.insertAdjacentElement('afterend', mountPoint);

  mount(TopAlbums, {
    target: mountPoint,
    props: { config, userName },
  });
}

export default {
  render,
  targetSelectors: [PROFILE_CONTAINER_SELECTOR],
};

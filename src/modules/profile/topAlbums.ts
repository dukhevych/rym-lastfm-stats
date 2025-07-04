import { mount } from 'svelte';
import { getLastfmUserName } from '@/helpers/storageUtils';
import ModuleTopAlbums from '@/components/svelte/ModuleTopAlbums.svelte';
import './topAlbums.css';

const PROFILE_CONTAINER_SELECTOR = '.bubble_header.profile_header + .bubble_content';

let config: ProfileOptions & { userName?: string };

export async function render(_config: ProfileOptions & { userName?: string }) {
  config = _config;
  if (!config) return;

  if (!config.lastfmApiKey) {
    console.warn(
      'Last.fm credentials not set. Please set Last.fm API Key in the extension options.',
    );
    return;
  }

  const userName = config.userName || await getLastfmUserName();
  if (!userName) {
    console.warn("No Last.fm username found. Top Albums can't be displayed.");
    return;
  }

  const mountPoint = document.createElement('div');
  const target = document.querySelector(PROFILE_CONTAINER_SELECTOR)!;
  target.insertAdjacentElement('afterend', mountPoint);

  mount(ModuleTopAlbums, {
    target: mountPoint,
    props: { config, userName },
  });
}

export default {
  render,
  targetSelectors: [PROFILE_CONTAINER_SELECTOR],
};

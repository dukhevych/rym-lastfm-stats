import { mount } from 'svelte';
import ModuleTopArtists from '@/components/svelte/ModuleTopArtists.svelte';
import * as utils from '@/helpers/utils';
import './topArtists.css';

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

  const userName = config.userName || await utils.getLastfmUserName();
  if (!userName) {
    console.warn("No Last.fm username found. Top Artists can't be displayed.");
    return;
  }

  const mountPoint = document.createElement('div');
  const target = document.querySelector('.top-albums') || document.querySelector(PROFILE_CONTAINER_SELECTOR)!;
  target.insertAdjacentElement('afterend', mountPoint);

  mount(ModuleTopArtists, {
    target: mountPoint,
    props: { config, userName },
  });
}

export default {
  render,
  targetSelectors: [PROFILE_CONTAINER_SELECTOR],
};

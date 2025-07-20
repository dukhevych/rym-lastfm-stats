import { mount } from 'svelte';
import { createElement as h } from '@/helpers/dom';
import SongStats from './SongStats.svelte';
import { insertElement } from '@/helpers/dom';

import '@/modules/release/releaseStats/releaseStats.css';

import {
  PARENT_SELECTOR,
  MOUNT_TARGET_SELECTOR,
  getArtistNames,
  getSongTitle,
  getSongId,
} from '@/modules/song/targets';

let config: ProfileOptions;

async function render(_config: ProfileOptions) {
  // SET PARENT ELEMENT
  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);
  if (!parent) {
    console.warn('No parent element found.');
    return;
  }

  // SET CONFIG
  if (!_config) {
    console.warn('No config found.');
    return;
  }
  config = _config;

  // SET SONG ID
  const songId = getSongId(parent);
  if (!songId) {
    console.warn('No song ID found.');
    return;
  }

  const songTitle = getSongTitle(parent);
  const artistNames = getArtistNames(parent);

  // CHECK IF ARTISTS EXIST AND SONG TITLE IS SET
  if (artistNames.length === 0 || !songTitle) {
    console.error('No artist or song title found.');
    return;
  }

  const mountPoint = h('div', { className: 'page_song_header_info_rest' });
  const mountTarget = parent.querySelector(MOUNT_TARGET_SELECTOR);

  if (!mountTarget) return; // TODO: add additional fallback mount targets

  insertElement({
    target: mountTarget,
    element: mountPoint,
    position: 'beforebegin',
  });

  mount(SongStats, {
    target: mountPoint,
    props: {
      config,
      songId,
      songTitle,
      artistNames,
    },
  });
}

export default {
  render,
  targetSelectors: [PARENT_SELECTOR],
};

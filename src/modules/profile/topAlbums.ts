import { mount } from 'svelte';

import * as utils from '@/helpers/utils';
import './topAlbums.css';
import ModuleTopAlbums from '@/components/svelte/ModuleTopAlbums.svelte';

const PROFILE_CONTAINER_SELECTOR =
  '.bubble_header.profile_header + .bubble_content';

let config: ProfileOptions & { userName?: string };

// async function handlePeriodChange(
//   value: TopAlbumsPeriod,
// ) {
//   uiElements.topAlbumsContainer.classList.add('is-loading');

//   const topAlbumsResponse = await getTopAlbums({
//     params: {
//       username: state.userName,
//       period: value,
//     },
//     apiKey: config.lastfmApiKey,
//   });

//   const data = topAlbumsResponse.topalbums.album;

//   uiElements.topAlbumsPeriodLabel.textContent = constants.PERIOD_LABELS_MAP[value];
//   uiElements.topAlbumsPeriodLabel.title = constants.PERIOD_LABELS_MAP[value];

//   populateTopAlbums(data);
//   uiElements.topAlbumsContainer.classList.remove('is-loading');
// }

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

// function createAlbumCover(album: TopAlbum) {
//   const img = h('img', {
//     className: ['fade-in'],
//     src: album.image[2]['#text'],
//     onLoad: () => {
//       loader.remove();
//       img.classList.add('loaded');
//     },
//     onError: () => {
//       loader.remove();
//       img.classList.add('loaded');
//       img.src = 'https://lastfm.freetls.fastly.net/i/u/avatar300s/c6f59c1e5e7240a4c0d427abd71f3dbb.jpg';
//     },
//   });

//   cover.appendChild(loader);
//   cover.appendChild(img);

//   return cover;
// }

export default {
  render,
  targetSelectors: [PROFILE_CONTAINER_SELECTOR],
};
